// Platform-neutral DNS interface. Validation lives here; each OS has one backend in ./backends.
const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

function isValidIPv4(s) {
  return typeof s === 'string' && IPV4.test(s.trim());
}

// Interface identifier from the renderer: a positive integer (Windows ifIndex, Linux ifindex).
function checkIndex(index) {
  const idx = Number(index);
  if (!Number.isInteger(idx) || idx <= 0) throw new Error('Invalid network interface.');
  return idx;
}

// null means "automatic"; otherwise one or two distinct IPv4 addresses, trimmed.
function checkServers(servers) {
  if (servers === null) return null;
  if (!Array.isArray(servers)) throw new Error('Provide one or two DNS servers.');
  const list = servers.map((s) => String(s).trim());
  if (list.length < 1 || list.length > 2) throw new Error('Provide one or two DNS servers.');
  for (const s of list) if (!isValidIPv4(s)) throw new Error(`"${s}" is not a valid IPv4 address.`);
  if (list.length === 2 && list[0] === list[1]) throw new Error('Preferred and alternate servers are identical.');
  return list;
}

const BACKENDS = { win32: './backends/windows', linux: './backends/linux' };

// Loaded lazily so backends can require this file for validation.
function backend() {
  const mod = BACKENDS[process.platform];
  if (!mod) throw new Error(`DNSwitch does not support ${process.platform} yet.`);
  return require(mod);
}

module.exports = {
  isValidIPv4,
  checkIndex,
  checkServers,
  getState: () => backend().getState(),
  isAdmin: () => backend().isAdmin(),
  applyDns: (index, servers) => {
    const idx = checkIndex(index);
    const list = checkServers(servers);
    return backend().applyDns(idx, list);
  },
};
