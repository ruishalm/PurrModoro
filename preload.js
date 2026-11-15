const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('purrAPI', {
  isElectron: true,
  setMode: (mode) => ipcRenderer.invoke('set-mode', mode),
  setCompactCollapsed: (collapsed) => ipcRenderer.invoke('set-compact-collapsed', collapsed),
  snapToClock: () => ipcRenderer.invoke('snap-to-clock'),
  setAlwaysOnTop: (flag) => ipcRenderer.invoke('set-always-on-top', flag),
  getAlwaysOnTop: () => ipcRenderer.invoke('get-always-on-top'),
  loadState: () => ipcRenderer.invoke('load-state'),
  saveState: (state) => ipcRenderer.invoke('save-state', state),
  hideToTray: () => ipcRenderer.invoke('hide-to-tray'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  googleSignIn: () => ipcRenderer.invoke('purr:google-sign-in'),
  onTrayAction: (callback) => {
    const listener = (_event, action) => callback(action);
    ipcRenderer.on('tray-action', listener);
    return () => ipcRenderer.removeListener('tray-action', listener);
  },
  onModeChanged: (callback) => {
    const listener = (_event, mode) => callback(mode);
    ipcRenderer.on('mode-changed', listener);
    return () => ipcRenderer.removeListener('mode-changed', listener);
  },
});

