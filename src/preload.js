const { contextBridge, ipcRenderer } = require('electron');

const call = (ch, ...a) => ipcRenderer.invoke(ch, ...a);
contextBridge.exposeInMainWorld('api', {
  getState: () => call('state:get'),
  isAdmin: () => call('admin:get'),
  listPresets: () => call('presets:list'),
  addPreset: (p) => call('presets:add', p),
  updatePreset: (id, p) => call('presets:update', id, p),
  removePreset: (id) => call('presets:remove', id),
  applyDns: (index, servers) => call('dns:apply', index, servers),
});
