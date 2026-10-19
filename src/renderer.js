const $ = (id) => document.getElementById(id);
const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

let state = { ssid: '', adapters: [] };
let presets = [];
let selectedIndex = null;
let editingId = null;
let gen = 0; // bumped on every apply so a stale in-flight refresh never overwrites newer state

function toast(msg, isError) {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast' + (isError ? ' error' : '');
  clearTimeout(toast.h);
  toast.h = setTimeout(() => t.classList.add('hidden'), isError ? 5000 : 2500);
}

function banner(msg) {
  const b = $('banner');
  b.textContent = msg || '';
  b.classList.toggle('hidden', !msg);
}

let busyCount = 0;
async function call(p, busyMsg) {
  if (busyMsg) {
    busyCount++;
    $('busy-msg').textContent = busyMsg;
    $('busy').classList.remove('hidden');
  }
  try {
    const r = await p;
    if (!r.ok) throw new Error(r.error);
    return r.data;
  } finally {
    // only calls that showed the overlay may hide it (background refreshes must not)
    if (busyMsg && --busyCount === 0) $('busy').classList.add('hidden');
  }
}

const current = () => state.adapters.find((a) => a.index === selectedIndex);

function render() {
  const ad = $('adapter');
  ad.replaceChildren();
  for (const a of state.adapters) {
    const o = document.createElement('option');
    o.value = a.index;
    o.textContent = a.name + (a.isWifi && !/wi-?fi/i.test(a.name) ? ' (Wi-Fi)' : '');
    ad.appendChild(o);
  }
  const c = current();
  const hasAdapter = !!c;
  if (hasAdapter) ad.value = c.index;
  ad.disabled = state.adapters.length < 2;

  const wifi = state.adapters.find((a) => a.isWifi);
  $('ssid').textContent = c
    ? (c.isWifi && state.ssid ? 'Connected to ' + state.ssid : c.description)
    : 'No active network connection';
  if (!hasAdapter) banner('No active network adapters. Connect to a network and refresh.');
  else if (!wifi) banner('No connected Wi-Fi adapter found - showing another active adapter.');
  else banner('');

  const badge = $('mode');
  badge.className = 'badge' + (hasAdapter ? ' ' + c.mode : '');
  badge.textContent = hasAdapter ? (c.mode === 'auto' ? 'Automatic (DHCP)' : 'Manual') : '-';
  $('cur1').textContent = (hasAdapter && c.servers[0]) || '-';
  $('cur2').textContent = (hasAdapter && c.servers[1]) || '-';
  $('auto').disabled = !hasAdapter || c.mode === 'auto';
  $('apply-custom').disabled = !hasAdapter;
  renderPresets();
}

function renderPresets() {
  const ul = $('presets');
  ul.replaceChildren();
  if (!presets.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.style.cursor = 'default';
    li.textContent = 'No presets yet. Click "+ New" to add one.';
    ul.appendChild(li);
    return;
  }
  const c = current();
  for (const p of presets) {
    const want = [p.primary, p.secondary].filter(Boolean);
    const active = !!c && c.mode === 'manual' && want.length === c.servers.length &&
      want.every((s, i) => s === c.servers[i]);
    const li = document.createElement('li');
    if (active) li.classList.add('active');
    li.title = 'Click to apply';

    const info = document.createElement('div');
    info.className = 'info';
    const nm = document.createElement('div');
    nm.className = 'nm';
    nm.textContent = p.name;
    const ips = document.createElement('div');
    ips.className = 'ips';
    ips.textContent = want.join('  ·  ');
    info.append(nm, ips);
    li.appendChild(info);

    if (active) {
      const t = document.createElement('span');
      t.className = 'tick';
      t.textContent = 'ACTIVE';
      li.appendChild(t);
    }
    const edit = document.createElement('button');
    edit.className = 'mini';
    edit.textContent = '✎';
    edit.title = 'Edit';
    edit.setAttribute('aria-label', 'Edit ' + p.name);
    edit.onclick = (e) => { e.stopPropagation(); openDialog(p); };
    const del = document.createElement('button');
    del.className = 'mini del';
    del.textContent = '✕';
    del.title = 'Delete';
    del.setAttribute('aria-label', 'Delete ' + p.name);
    del.onclick = (e) => { e.stopPropagation(); removePreset(p); };
    li.append(edit, del);
    li.onclick = () => apply(want, p.name);
    ul.appendChild(li);
  }
}

async function refresh(quiet) {
  const myGen = gen;
  try {
    const fresh = await call(window.api.getState(), quiet ? null : 'Reading network settings...');
    if (myGen !== gen) return; // an apply happened meanwhile; its result is newer
    state = fresh;
    if (!state.adapters.some((a) => a.index === selectedIndex)) {
      const pick = state.adapters.find((a) => a.isWifi) || state.adapters[0];
      selectedIndex = pick ? pick.index : null;
    }
    render();
  } catch (e) {
    banner('Could not read network settings: ' + e.message);
  }
}

async function apply(servers, label) {
  const c = current();
  if (!c) return toast('No adapter selected.', true);
  gen++;
  try {
    state = await call(window.api.applyDns(c.index, servers),
      servers ? 'Applying DNS...' : 'Resetting to automatic...');
    gen++;
    render();
    toast(servers ? 'Applied ' + (label || servers.join(', ')) : 'DNS set to automatic');
  } catch (e) {
    toast(e.message, true);
    refresh(true);
  }
}

function readCustom() {
  const a = $('c1').value.trim(), b = $('c2').value.trim();
  $('c1').classList.toggle('bad', !IPV4.test(a));
  $('c2').classList.toggle('bad', !!b && !IPV4.test(b));
  if (!IPV4.test(a)) { toast('Enter a valid preferred DNS (e.g. 1.1.1.1).', true); return null; }
  if (b && !IPV4.test(b)) { toast('Alternate DNS is not a valid IPv4 address.', true); return null; }
  if (b && a === b) { toast('Preferred and alternate are identical.', true); return null; }
  return { primary: a, secondary: b };
}

function openDialog(p) {
  editingId = p ? p.id : null;
  $('dlg-title').textContent = p ? 'Edit preset' : 'New preset';
  $('p-name').value = p ? p.name : '';
  $('p-1').value = p ? p.primary : '';
  $('p-2').value = p ? p.secondary : '';
  $('dlg-err').classList.add('hidden');
  $('dlg').showModal();
  $('p-name').focus();
}

async function savePresetFromDialog(ev) {
  ev.preventDefault();
  const data = { name: $('p-name').value, primary: $('p-1').value, secondary: $('p-2').value };
  try {
    if (editingId) await call(window.api.updatePreset(editingId, data));
    else await call(window.api.addPreset(data));
    presets = await call(window.api.listPresets());
    $('dlg').close();
    renderPresets();
    toast('Preset saved');
  } catch (e) {
    $('dlg-err').textContent = e.message;
    $('dlg-err').classList.remove('hidden');
  }
}

function askConfirm(msg) {
  return new Promise((resolve) => {
    const d = $('confirm');
    $('confirm-msg').textContent = msg;
    const done = (v) => { d.onclose = null; $('confirm-yes').onclick = $('confirm-no').onclick = null; if (d.open) d.close(); resolve(v); };
    $('confirm-yes').onclick = (e) => { e.preventDefault(); done(true); };
    $('confirm-no').onclick = () => done(false);
    d.onclose = () => done(false); // Escape key
    d.showModal();
    $('confirm-no').focus();
  });
}

async function removePreset(p) {
  if (!(await askConfirm('Delete preset "' + p.name + '"?'))) return;
  try {
    await call(window.api.removePreset(p.id));
    presets = await call(window.api.listPresets());
    renderPresets();
  } catch (e) { toast(e.message, true); }
}

$('refresh').onclick = () => refresh();
$('adapter').onchange = (e) => { selectedIndex = Number(e.target.value); render(); };
$('auto').onclick = () => apply(null);
$('apply-custom').onclick = () => {
  const v = readCustom();
  if (v) apply([v.primary, v.secondary].filter(Boolean));
};
$('save-custom').onclick = () => {
  const v = readCustom();
  if (!v) return;
  openDialog(null);
  $('p-1').value = v.primary;
  $('p-2').value = v.secondary;
};
$('add-preset').onclick = () => openDialog(null);
$('dlg-cancel').onclick = () => $('dlg').close();
$('dlg-form').onsubmit = savePresetFromDialog;
for (const id of ['c1', 'c2']) {
  $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') $('apply-custom').click(); });
}

(async function init() {
  try { presets = await call(window.api.listPresets()); } catch (e) { toast(e.message, true); }
  await refresh();
  // Pick up network changes (e.g. switching Wi-Fi) without a manual refresh.
  setInterval(() => {
    if (!document.hidden && $('busy').classList.contains('hidden') && !$('dlg').open) refresh(true);
  }, 8000);
})();
