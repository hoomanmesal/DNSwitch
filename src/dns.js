const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PS = 'powershell.exe';
const PS_ARGS = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass'];

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

function isValidIPv4(s) {
  return typeof s === 'string' && IPV4.test(s.trim());
}

function runPS(script) {
  return new Promise((resolve, reject) => {
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    execFile(
      PS,
      [...PS_ARGS, '-EncodedCommand', encoded],
      { windowsHide: true, maxBuffer: 10 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) return reject(new Error((stderr || err.message).trim()));
        resolve(stdout.trim());
      }
    );
  });
}

const LIST_SCRIPT = `
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$out = @()
foreach ($a in Get-NetAdapter | Where-Object { $_.Status -eq 'Up' }) {
  $dns = Get-DnsClientServerAddress -InterfaceIndex $a.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue
  $servers = @()
  if ($dns -and $dns.ServerAddresses) { $servers = @($dns.ServerAddresses) }
  $static = $false
  try {
    $reg = Get-ItemProperty "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces\\$($a.InterfaceGuid)" -ErrorAction Stop
    if ($reg.NameServer) { $static = $true }
  } catch {}
  $isWifi = ($a.PhysicalMediaType -match '802\\.11') -or ($a.Name -match 'Wi-?Fi|Wireless|WLAN')
  $out += [pscustomobject]@{
    name = $a.Name; index = [int]$a.ifIndex; description = $a.InterfaceDescription
    isWifi = [bool]$isWifi; mode = $(if ($static) { 'manual' } else { 'auto' }); servers = $servers
  }
}
$ssid = ''
try {
  $m = netsh wlan show interfaces | Select-String '^\\s*SSID\\s*:\\s*(.+)$' | Select-Object -First 1
  if ($m) { $ssid = $m.Matches[0].Groups[1].Value.Trim() }
} catch {}
[pscustomobject]@{ ssid = $ssid; adapters = @($out) } | ConvertTo-Json -Depth 5 -Compress
`;

async function getState() {
  const raw = await runPS(LIST_SCRIPT);
  const data = JSON.parse(raw);
  const adapters = [].concat(data.adapters || []).map((a) => ({
    ...a,
    servers: [].concat(a.servers || []),
  }));
  return { ssid: data.ssid || '', adapters };
}

async function isAdmin() {
  const r = await runPS(
    '([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)'
  );
  return r.toLowerCase() === 'true';
}

function buildChangeScript(index, servers) {
  const idx = Number(index);
  if (!Number.isInteger(idx) || idx <= 0) throw new Error('Invalid adapter.');
  let body;
  if (servers === null) {
    body = `Set-DnsClientServerAddress -InterfaceIndex ${idx} -ResetServerAddresses`;
  } else {
    const list = servers.map((s) => s.trim());
    if (list.length < 1 || list.length > 2) throw new Error('Provide one or two DNS servers.');
    for (const s of list) if (!isValidIPv4(s)) throw new Error(`"${s}" is not a valid IPv4 address.`);
    if (list.length === 2 && list[0] === list[1]) throw new Error('Preferred and alternate servers are identical.');
    body = `Set-DnsClientServerAddress -InterfaceIndex ${idx} -ServerAddresses ${list.map((s) => `'${s}'`).join(',')}`;
  }
  return `$ErrorActionPreference='Stop'\n${body}\nClear-DnsClientCache`;
}

// Applies DNS. Runs directly if admin, otherwise via a one-shot UAC-elevated PowerShell.
async function applyDns(index, servers) {
  const script = buildChangeScript(index, servers);
  if (await isAdmin()) {
    await runPS(script);
    return;
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dnswitch-'));
  const scriptFile = path.join(dir, 'apply.ps1');
  const errFile = path.join(dir, 'error.txt');
  const wrapped = `try {\n${script}\n} catch { $_.Exception.Message | Out-File -FilePath '${errFile}' -Encoding utf8; exit 1 }`;
  fs.writeFileSync(scriptFile, wrapped, 'utf8');
  const launcher = `
$ErrorActionPreference='Stop'
try {
  $p = Start-Process powershell.exe -Verb RunAs -WindowStyle Hidden -Wait -PassThru -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','${scriptFile}'
  exit $p.ExitCode
} catch { Write-Error 'ELEVATION_CANCELLED'; exit 2 }`;
  try {
    await runPS(launcher);
  } catch (e) {
    if (/ELEVATION_CANCELLED/.test(e.message)) throw new Error('Administrator permission was declined.');
    let detail = '';
    try { detail = fs.readFileSync(errFile, 'utf8').trim(); } catch {}
    throw new Error(detail || e.message);
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

module.exports = { getState, applyDns, isValidIPv4, isAdmin, buildChangeScript };
