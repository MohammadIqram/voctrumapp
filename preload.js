const { contextBridge, ipcRenderer } = require('electron');

// Expose the getMousePosition API to the renderer process
contextBridge.exposeInMainWorld('electron', {
  getMousePosition: () => ipcRenderer.invoke('get-mouse-position'),
  onScreenshotReceived: (callback) => ipcRenderer.on('screenshot', callback),
});
