// Linux backend: NetworkManager through nmcli. NetworkManager asks polkit for permission
// (a password prompt if needed), so the app itself never runs anything elevated.
const { execFile } = require('child_process');
const fs = require('fs');
const { checkIndex, checkServers, isValidIPv4 } = require('../dns');

// Linux interface names: at most 15 chars, never starting with "-" so they can't read as an option.
const DEVICE = /^\w[\w.-]{0,14}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function nmcli(args) {
  return new Promise((resolve, reject) => {
    // LC_ALL=C keeps state words ("connected", "yes") unlocalised so parsing is stable.
    execFile('nmcli', args, { env: { ...process.env, LC_ALL: 'C' }, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err && err.code === 'ENOENT') return reject(new Error('NetworkManager (nmcli) was not found. DNSwitch on Linux needs NetworkManager.'));
      if (err) return reject(new Error((stderr || err.message).trim()));
      resolve(stdout.trim());
    });
  });
}

function ifindex(dev) {
  return Number(fs.readFileSync(`/sys/class/net/${dev}/ifindex`, 'utf8').trim());
}

// Swappable for tests, which feed mocked nmcli output.
const deps = { nmcli, ifindex };

// Splits a terse (-t) nmcli line on unescaped ":" and removes "\" escapes.
function splitTerse(line) {
  const out = [];
  let cur = '';
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '\\' && i + 1 < line.length) cur += line[++i];
    else if (line[i] === ':') { out.push(cur); cur = ''; }
    else cur += line[i];
  }
  out.push(cur);
  return out;
}

const rows = (text) => text.split('\n').filter(Boolean).map(splitTerse);

// "field:value" lines from `nmcli -t -f a,b ... show`, as { field: value }.
function fields(text) {
  const o = {};
  for (const [k, ...v] of rows(text)) o[k] = v.join(':');
  return o;
}

const ips = (s) => (s || '').split(/[,\s]+/).filter(isValidIPv4);

async function listInterfaces() {
  const active = new Map();
  for (const [uuid, dev] of rows(await deps.nmcli(['-t', '-f', 'UUID,DEVICE', 'connection', 'show', '--active']))) {
    if (UUID.test(uuid) && DEVICE.test(dev)) active.set(dev, uuid);
  }
  const out = [];
  for (const [dev, type, st] of rows(await deps.nmcli(['-t', '-f', 'DEVICE,TYPE,STATE', 'device', 'status']))) {
    // "connected (externally)" devices are not configured by NetworkManager, so changes would not stick.
    if (st !== 'connected' || type === 'loopback' || !DEVICE.test(dev) || !active.has(dev)) continue;
    let index;
    try { index = deps.ifindex(dev); } catch { continue; } // the device vanished since nmcli listed it
    out.push({ dev, type, uuid: active.get(dev), index });
  }
  return out;
}

async function getState() {
  let ssid = '';
  const adapters = [];
  for (const i of await listInterfaces()) {
    const isWifi = i.type === 'wifi';
    const conn = fields(await deps.nmcli(['-t', '-f',
      'connection.id,ipv4.dns' + (isWifi ? ',802-11-wireless.ssid' : ''), 'connection', 'show', i.uuid]));
    const live = fields(await deps.nmcli(['-t', '-f', 'IP4.DNS', 'device', 'show', i.dev]));
    const servers = Object.keys(live).filter((k) => k.startsWith('IP4.DNS')).flatMap((k) => ips(live[k]));
    if (isWifi && !ssid) ssid = conn['802-11-wireless.ssid'] || '';
    adapters.push({
      name: i.dev, index: i.index, description: conn['connection.id'] || i.dev,
      isWifi, mode: ips(conn['ipv4.dns']).length ? 'manual' : 'auto', servers,
    });
  }
  return { ssid, adapters };
}

// True when NetworkManager lets this user change system connections without asking.
async function isAdmin() {
  const perms = fields(await deps.nmcli(['-t', '-f', 'PERMISSION,VALUE', 'general', 'permissions']));
  return perms['org.freedesktop.NetworkManager.settings.modify.system'] === 'yes';
}

function friendly(e) {
  if (/not authori[sz]ed|insufficient privileges|permission denied/i.test(e.message)) {
    return new Error('Permission to change network settings was declined or is not allowed for this account.');
  }
  return e;
}

// Index and servers are validated again here so the backend is safe on its own.
async function applyDns(index, servers) {
  const idx = checkIndex(index);
  const list = checkServers(servers);
  const i = (await listInterfaces()).find((x) => x.index === idx);
  if (!i) throw new Error('Network interface not found. Refresh and try again.');
  const args = ['connection', 'modify', i.uuid,
    'ipv4.dns', list ? list.join(',') : '',
    'ipv4.ignore-auto-dns', list ? 'yes' : 'no'];
  try {
    await deps.nmcli(args);
    // Applies the saved change to the live connection without disconnecting.
    await deps.nmcli(['device', 'reapply', i.dev]);
  } catch (e) {
    throw friendly(e);
  }
}

module.exports = { getState, applyDns, isAdmin, splitTerse, deps };
