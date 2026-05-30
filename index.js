const { app, BrowserWindow, desktopCapturer, screen } = require('electron');
const path = require('path');
const setupIpcHandlers = require('./components/mouseUtil');

let win = null;
let screenshotInterval = null;

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    show: true,
    icon: path.join(__dirname, 'assets/logo2.png'),
    webPreferences: {
      nodeIntegration: false, 
      contextIsolation: true, 
      preload: path.join(__dirname, 'preload.js') 
    }
  });

  win.loadURL('https://employees.voctrum.com');
  // win.loadURL('http://localhost:3000');

  win.on('closed', () => {
    win = null;
    if (screenshotInterval) {
      clearInterval(screenshotInterval);
      screenshotInterval = null;
    }
  });
}

// Setup IPC handlers once
setupIpcHandlers();

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (screenshotInterval) clearInterval(screenshotInterval);
  if (process.platform !== 'darwin') {
    app.quit();
  }
});