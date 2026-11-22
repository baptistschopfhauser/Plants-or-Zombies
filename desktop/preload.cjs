// Minimal, safe bridge exposed to the game page on desktop builds.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bloomDesktop', {
  quit: () => ipcRenderer.send('bloomguard:quit'),
  setFullscreen: (value) => ipcRenderer.invoke('bloomguard:fullscreen', value),
  isFullscreen: () => ipcRenderer.invoke('bloomguard:fullscreen'),
});
