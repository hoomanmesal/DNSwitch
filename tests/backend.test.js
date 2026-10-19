const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const dns = require('../src/dns');
const { PresetStore, DEFAULTS } = require('../src/presets');

const tmpFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dnsw-')), 'presets.json');

test('isValidIPv4', () => {
  for (const ok of ['1.1.1.1', '8.8.8.8', '192.168.0.1', '255.255.255.255', '0.0.0.0', ' 9.9.9.9 ']) {
    assert.ok(dns.isValidIPv4(ok), ok);
  }
  for (const bad of ['', '1.1.1', '1.1.1.256', '1.1.1.1.1', 'a.b.c.d', '01.1.1.1', '1.1.1.1; calc', '::1', null, undefined, 5]) {
    assert.ok(!dns.isValidIPv4(bad), String(bad));
  }
});

test('buildChangeScript validation', () => {
  assert.throws(() => dns.buildChangeScript(19, []), /one or two/);
  assert.throws(() => dns.buildChangeScript(19, ['1.1.1.1', '1.0.0.1', '8.8.8.8']), /one or two/);
  assert.throws(() => dns.buildChangeScript(19, ['1.1.1.1', '1.1.1.1']), /identical/);
  assert.throws(() => dns.buildChangeScript(19, ["1.1.1.1'; calc"]), /not a valid/);
  assert.throws(() => dns.buildChangeScript('19; calc', ['1.1.1.1']), /Invalid adapter/);
  assert.throws(() => dns.buildChangeScript(0, ['1.1.1.1']), /Invalid adapter/);
  assert.match(dns.buildChangeScript(19, null), /-ResetServerAddresses/);
  assert.match(dns.buildChangeScript(19, ['1.1.1.1']), /-ServerAddresses '1.1.1.1'/);
});

test('presets: seeding, persistence', () => {
  const f = tmpFile();
  const s = new PresetStore(f);
  assert.strictEqual(s.list().length, DEFAULTS.length);
  assert.strictEqual(new PresetStore(f).list().length, DEFAULTS.length);
});

test('presets: add / duplicate / invalid / update / remove', () => {
  const s = new PresetStore(tmpFile());
  const p = s.add({ name: 'Home', primary: '192.168.1.2', secondary: '' });
  assert.strictEqual(p.secondary, '');
  assert.throws(() => s.add({ name: 'home', primary: '1.2.3.4' }), /already exists/);
  assert.throws(() => s.add({ name: '', primary: '1.2.3.4' }), /name is required/);
  assert.throws(() => s.add({ name: 'x'.repeat(41), primary: '1.2.3.4' }), /too long/);
  assert.throws(() => s.add({ name: 'Bad', primary: '1.2.3' }), /Preferred/);
  assert.throws(() => s.add({ name: 'Bad', primary: '1.2.3.4', secondary: 'zzz' }), /Alternate/);
  assert.throws(() => s.add({ name: 'Bad', primary: '1.2.3.4', secondary: '1.2.3.4' }), /identical/);
  const u = s.update(p.id, { name: 'Home DNS', primary: '10.0.0.1', secondary: '10.0.0.2' });
  assert.strictEqual(u.name, 'Home DNS');
  assert.doesNotThrow(() => s.update(p.id, { name: 'Home DNS', primary: '10.0.0.1' })); // same name, own id
  assert.throws(() => s.update('nope', { name: 'a', primary: '1.1.1.1' }), /not found/);
  assert.throws(() => s.update(p.id, { name: 'Google', primary: '1.1.1.1' }), /already exists/);
  s.remove(p.id);
  assert.throws(() => s.remove(p.id), /not found/);
  assert.ok(!s.list().some((x) => x.id === p.id));
});

test('presets: corrupt file is quarantined and reseeded; empty list persists', () => {
  const f = tmpFile();
  fs.writeFileSync(f, '{not json');
  const s = new PresetStore(f);
  assert.strictEqual(s.list().length, DEFAULTS.length);
  assert.ok(fs.existsSync(f + '.corrupt'));
  for (const p of [...s.list()]) s.remove(p.id);
  assert.strictEqual(new PresetStore(f).list().length, 0); // deleting all must not reseed
});

// Live tests change the real DNS of the Wi-Fi adapter, then restore it.
test('live: set manual, single server, reset to automatic', { skip: !process.env.LIVE }, async (t) => {
  assert.ok(await dns.isAdmin(), 'live tests need an elevated shell');
  const before = await dns.getState();
  const wifi = before.adapters.find((a) => a.isWifi);
  assert.ok(wifi, 'no Wi-Fi adapter up');
  try {
    await dns.applyDns(wifi.index, ['1.1.1.1', '1.0.0.1']);
    let a = (await dns.getState()).adapters.find((x) => x.index === wifi.index);
    assert.strictEqual(a.mode, 'manual');
    assert.deepStrictEqual(a.servers, ['1.1.1.1', '1.0.0.1']);

    await dns.applyDns(wifi.index, ['8.8.8.8']);
    a = (await dns.getState()).adapters.find((x) => x.index === wifi.index);
    assert.deepStrictEqual(a.servers, ['8.8.8.8']);

    await assert.rejects(dns.applyDns(wifi.index, ['999.1.1.1']), /not a valid/);
    a = (await dns.getState()).adapters.find((x) => x.index === wifi.index);
    assert.deepStrictEqual(a.servers, ['8.8.8.8'], 'invalid apply must not change DNS');

    await assert.rejects(dns.applyDns(999999, ['1.1.1.1']));

    await dns.applyDns(wifi.index, null);
    a = (await dns.getState()).adapters.find((x) => x.index === wifi.index);
    assert.strictEqual(a.mode, 'auto');
    assert.ok(a.servers.length >= 1, 'DHCP DNS should be repopulated');
  } finally {
    if (wifi.mode === 'manual') await dns.applyDns(wifi.index, wifi.servers);
    else await dns.applyDns(wifi.index, null);
  }
});
