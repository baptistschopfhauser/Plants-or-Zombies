// Bloomguard desktop shell (Windows / macOS / Linux / Steam Deck) built with Electron.
// The game is served from a private app:// scheme so ES modules and localStorage work offline.
const { app, BrowserWindow, protocol, ipcMain, net, Menu } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const WWW = path.join(__dirname, '..', 'www');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

// Inside the Steam Linux Runtime (incl. Steam Deck) the setuid Chromium sandbox helper is unavailable.
if (process.platform === 'linux' && (process.env.SteamAppId || process.env.SteamGameId || process.argv.includes('--steam'))) {
  app.commandLine.appendSwitch('no-sandbox');
}

// One running copy at a time (Steam can launch twice if double-clicked).
if (!app.requestSingleInstanceLock()) app.quit();

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    fullscreen: !process.argv.includes('--windowed'),
    backgroundColor: '#17100a',
    title: 'Bloomguard',
    icon: path.join(WWW, 'icons', 'icon-512.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  Menu.setApplicationMenu(null);
  win.loadURL('app://bloomguard/index.html');
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && (input.key === 'F11' || (input.alt && input.key === 'Enter'))) {
      win.setFullScreen(!win.isFullScreen());
    }
  });
  // Never navigate away from the game or open external windows.
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://')) e.preventDefault(); });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}

app.whenReady().then(() => {
  protocol.handle('app', (req) => {
    const { pathname } = new URL(req.url);
    const file = path.normalize(path.join(WWW, decodeURIComponent(pathname)));
    if (!file.startsWith(WWW)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
  ipcMain.on('bloomguard:quit', () => app.quit());
  ipcMain.handle('bloomguard:fullscreen', (_e, value) => {
    if (typeof value === 'boolean') win.setFullScreen(value);
    return win.isFullScreen();
  });
  createWindow();
});

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on('window-all-closed', () => app.quit());
