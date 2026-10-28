const { app, BrowserWindow, ipcMain, Menu, session } = require('electron');
const path = require('path');
const dns = require('./dns');
const { PresetStore } = require('./presets');

let store;
let win;

function createWindow() {
  win = new BrowserWindow({
    width: 520,
    height: 720,
    minWidth: 440,
    minHeight: 560,
    backgroundColor: '#0a0c11',
    title: 'DNSwitch',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'index.html'));
}

// Wrap handlers so the renderer always gets {ok, data|error}.
function handle(channel, fn) {
  ipcMain.handle(channel, async (_e, ...args) => {
    try { return { ok: true, data: await fn(...args) }; }
    catch (err) { return { ok: false, error: err.message || String(err) }; }
  });
}

app.whenReady().then(() => {
  // Electron would otherwise download a spellcheck dictionary from Google (SECURITY.md: no network calls).
  session.defaultSession.setSpellCheckerLanguages([]);
  session.defaultSession.setSpellCheckerDictionaryDownloadURL('file:///nonexistent/');
  store = new PresetStore(path.join(app.getPath('userData'), 'presets.json'));
  handle('state:get', () => dns.getState());
  handle('admin:get', () => dns.isAdmin());
  handle('presets:list', () => store.list());
  handle('presets:add', (p) => store.add(p));
  handle('presets:update', (id, p) => store.update(id, p));
  handle('presets:remove', (id) => store.remove(id));
  handle('dns:apply', async (index, servers) => {
    await dns.applyDns(index, servers);
    return dns.getState();
  });
  createWindow();
});

app.on('window-all-closed', () => app.quit());
