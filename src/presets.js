const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { isValidIPv4 } = require('./dns');

const DEFAULTS = [
  { name: 'Google', primary: '8.8.8.8', secondary: '8.8.4.4' },
  { name: 'Cloudflare', primary: '1.1.1.1', secondary: '1.0.0.1' },
  { name: 'Quad9', primary: '9.9.9.9', secondary: '149.112.112.112' },
  { name: 'OpenDNS', primary: '208.67.222.222', secondary: '208.67.220.220' },
];

function validate(p) {
  const name = String(p.name || '').trim();
  const primary = String(p.primary || '').trim();
  const secondary = String(p.secondary || '').trim();
  if (!name) throw new Error('Preset name is required.');
  if (name.length > 40) throw new Error('Preset name is too long (max 40).');
  if (!isValidIPv4(primary)) throw new Error('Preferred DNS must be a valid IPv4 address.');
  if (secondary && !isValidIPv4(secondary)) throw new Error('Alternate DNS must be a valid IPv4 address.');
  if (secondary && secondary === primary) throw new Error('Preferred and alternate servers are identical.');
  return { name, primary, secondary };
}

class PresetStore {
  constructor(file) {
    this.file = file;
    this.presets = this._load();
  }
  _load() {
    try {
      const data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      if (Array.isArray(data)) {
        return data.filter((p) => p && p.id).map((p) => ({ id: p.id, ...validate(p) }));
      }
    } catch (e) {
      if (e.code !== 'ENOENT') {
        try { fs.renameSync(this.file, this.file + '.corrupt'); } catch {}
      }
    }
    const seeded = DEFAULTS.map((p) => ({ id: crypto.randomUUID(), ...p }));
    this.presets = seeded;
    this._save();
    return seeded;
  }
  _save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.presets, null, 2));
  }
  list() { return this.presets; }
  add(p) {
    const v = validate(p);
    this._dupName(v.name);
    const item = { id: crypto.randomUUID(), ...v };
    this.presets.push(item);
    this._save();
    return item;
  }
  update(id, p) {
    const i = this.presets.findIndex((x) => x.id === id);
    if (i < 0) throw new Error('Preset not found.');
    const v = validate(p);
    this._dupName(v.name, id);
    this.presets[i] = { id, ...v };
    this._save();
    return this.presets[i];
  }
  remove(id) {
    const n = this.presets.length;
    this.presets = this.presets.filter((x) => x.id !== id);
    if (this.presets.length === n) throw new Error('Preset not found.');
    this._save();
  }
  _dupName(name, exceptId) {
    if (this.presets.some((x) => x.id !== exceptId && x.name.toLowerCase() === name.toLowerCase()))
      throw new Error(`A preset named "${name}" already exists.`);
  }
}

module.exports = { PresetStore, validate, DEFAULTS };
