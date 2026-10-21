const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const dns = require('../src/dns');
const win = require('../src/backends/windows');
const linux = require('../src/backends/linux');
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

test('windows: buildChangeScript validation', () => {
  assert.throws(() => win.buildChangeScript(19, []), /one or two/);
  assert.throws(() => win.buildChangeScript(19, ['1.1.1.1', '1.0.0.1', '8.8.8.8']), /one or two/);
  assert.throws(() => win.buildChangeScript(19, ['1.1.1.1', '1.1.1.1']), /identical/);
  assert.throws(() => win.buildChangeScript(19, ["1.1.1.1'; calc"]), /not a valid/);
  assert.throws(() => win.buildChangeScript(19, '1.1.1.1'), /one or two/);
  assert.throws(() => win.buildChangeScript('19; calc', ['1.1.1.1']), /Invalid network interface/);
  assert.throws(() => win.buildChangeScript(0, ['1.1.1.1']), /Invalid network interface/);
  assert.match(win.buildChangeScript(19, null), /-ResetServerAddresses/);
  assert.match(win.buildChangeScript(19, ['1.1.1.1']), /-ServerAddresses '1.1.1.1'/);
});

// Mocked nmcli: maps the joined argument list to canned output and records every call.
function mockLinux(t, out, ifindexes = { wlp2s0: 3, enp3s0: 2 }) {
  const calls = [];
  const orig = { ...linux.deps };
  linux.deps.nmcli = async (args) => {
    assert.ok(Array.isArray(args) && args.every((a) => typeof a === 'string'), 'args must be a string array');
    calls.push(args);
    const key = args.join(' ');
    if (out[key] instanceof Error) throw out[key];
    return key in out ? out[key] : '';
  };
  linux.deps.ifindex = (dev) => ifindexes[dev];
  t.after(() => Object.assign(linux.deps, orig));
  return calls;
}

const WIFI_UUID = '6f1c3b7e-2d4a-4c1e-9a7b-1f2e3d4c5b6a';
const ETH_UUID = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const NM = {
  '-t -f UUID,DEVICE connection show --active': `${WIFI_UUID}:wlp2s0\n${ETH_UUID}:enp3s0\n11111111-2222-4333-8444-555555555555:lo`,
  '-t -f DEVICE,TYPE,STATE device status':
    'wlp2s0:wifi:connected\nenp3s0:ethernet:connected\ndocker0:bridge:connected (externally)\nlo:loopback:connected (externally)\nwlp0:wifi-p2p:disconnected',
  [`-t -f connection.id,ipv4.dns,802-11-wireless.ssid connection show ${WIFI_UUID}`]:
    'connection.id:Cafe\\: Guest\nipv4.dns:1.1.1.1,1.0.0.1\n802-11-wireless.ssid:Cafe: Guest',
  [`-t -f connection.id,ipv4.dns connection show ${ETH_UUID}`]: 'connection.id:Wired connection 1\nipv4.dns:',
  '-t -f IP4.DNS device show wlp2s0': 'IP4.DNS[1]:1.1.1.1\nIP4.DNS[2]:1.0.0.1',
  '-t -f IP4.DNS device show enp3s0': 'IP4.DNS[1]:192.168.1.1',
};

test('linux: splitTerse handles escapes', () => {
  assert.deepStrictEqual(linux.splitTerse('a\\:b:c\\\\d:'), ['a:b', 'c\\d', '']);
});

test('linux: getState parses nmcli output', async (t) => {
  mockLinux(t, NM);
  const s = await linux.getState();
  assert.strictEqual(s.ssid, 'Cafe: Guest');
  assert.deepStrictEqual(s.adapters, [
    { name: 'wlp2s0', index: 3, description: 'Cafe: Guest', isWifi: true, mode: 'manual', servers: ['1.1.1.1', '1.0.0.1'] },
    { name: 'enp3s0', index: 2, description: 'Wired connection 1', isWifi: false, mode: 'auto', servers: ['192.168.1.1'] },
  ]);
});

test('linux: getState skips unsafe device names and uuids', async (t) => {
  mockLinux(t, {
    '-t -f UUID,DEVICE connection show --active': `${WIFI_UUID}:-evil\nnot-a-uuid:enp3s0\n${ETH_UUID}:eth0/../x`,
    '-t -f DEVICE,TYPE,STATE device status': '-evil:wifi:connected\nenp3s0:ethernet:connected\neth0/../x:ethernet:connected',
  });
  assert.deepStrictEqual((await linux.getState()).adapters, []);
});

test('linux: applyDns sets manual servers by uuid as an argument array', async (t) => {
  const calls = mockLinux(t, NM);
  await linux.applyDns(2, ['9.9.9.9', ' 149.112.112.112 ']);
  assert.deepStrictEqual(calls.slice(-2), [
    ['connection', 'modify', ETH_UUID, 'ipv4.dns', '9.9.9.9,149.112.112.112', 'ipv4.ignore-auto-dns', 'yes'],
    ['device', 'reapply', 'enp3s0'],
  ]);
});

test('linux: applyDns(null) resets to automatic', async (t) => {
  const calls = mockLinux(t, NM);
  await linux.applyDns(3, null);
  assert.deepStrictEqual(calls.slice(-2), [
    ['connection', 'modify', WIFI_UUID, 'ipv4.dns', '', 'ipv4.ignore-auto-dns', 'no'],
    ['device', 'reapply', 'wlp2s0'],
  ]);
});

test('linux: applyDns rejects bad input before running any change', async (t) => {
  const calls = mockLinux(t, NM);
  await assert.rejects(linux.applyDns(2, ['1.1.1.1,8.8.8.8']), /not a valid/);
  await assert.rejects(linux.applyDns(2, ['1.1.1.1 ipv4.method disabled']), /not a valid/);
  await assert.rejects(linux.applyDns(2, ['1.1.1.1', '1.1.1.1']), /identical/);
  await assert.rejects(linux.applyDns('2; reboot', ['1.1.1.1']), /Invalid network interface/);
  await assert.rejects(linux.applyDns(-1, ['1.1.1.1']), /Invalid network interface/);
  await assert.rejects(linux.applyDns(99, ['1.1.1.1']), /not found/);
  assert.ok(!calls.some((a) => a[1] === 'modify' || a[1] === 'reapply'), 'no change command may run');
});

test('linux: permission and missing-nmcli errors are readable', async (t) => {
  mockLinux(t, { ...NM, [`connection modify ${ETH_UUID} ipv4.dns 1.1.1.1 ipv4.ignore-auto-dns yes`]:
    new Error("Error: Failed to modify connection 'Wired connection 1': Insufficient privileges") });
  await assert.rejects(linux.applyDns(2, ['1.1.1.1']), /Permission to change network settings/);
});

test('linux: isAdmin reads NetworkManager permissions', async (t) => {
  mockLinux(t, { '-t -f PERMISSION,VALUE general permissions':
    'org.freedesktop.NetworkManager.network-control:yes\norg.freedesktop.NetworkManager.settings.modify.system:auth' });
  assert.strictEqual(await linux.isAdmin(), false);
});

test('dns: validates before any backend, rejects unsupported platforms', async (t) => {
  const real = Object.getOwnPropertyDescriptor(process, 'platform');
  t.after(() => Object.defineProperty(process, 'platform', real));
  Object.defineProperty(process, 'platform', { value: 'sunos' });
  await assert.rejects(dns.applyDns(1, ['1.1.1.1; reboot']), /not a valid/); // rejects, never throws synchronously
  await assert.rejects(dns.applyDns(1, [['1.1.1.1']]), /one or two/); // no coercion of non-strings
  await assert.rejects(dns.applyDns(1, [{ toString: () => '1.1.1.1' }]), /one or two/);
  assert.throws(() => dns.getState(), /does not support sunos/);
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

// Live tests change the real DNS of the Wi-Fi interface, then restore it. Run: npm run test:live
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
