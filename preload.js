const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getMousePosition: () => ipcRenderer.invoke('get-mouse-position'),
  onScreenshotReceived: (callback) => {
    const subscription = (event, buffer) => callback(buffer);
    
    ipcRenderer.on('screenshot', subscription);
    return () => {
      ipcRenderer.removeListener('screenshot', subscription);
    };
  }
});