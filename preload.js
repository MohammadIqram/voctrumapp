const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getMousePosition: () => ipcRenderer.invoke('get-mouse-position'),
});