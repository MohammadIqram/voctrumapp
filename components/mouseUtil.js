const { ipcMain, screen } = require('electron');

function setupIpcHandlers() {
  // Define IPC handler for getting mouse position
  ipcMain.handle('get-mouse-position', () => {
    return screen.getCursorScreenPoint();
  });
}

module.exports = setupIpcHandlers;