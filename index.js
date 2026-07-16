const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');

let win = null;

// Enable auto-launch on app start
function enableAutoLaunch() {
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: false
  });
  console.log('Auto-launch is enabled');
}

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
  });
}

// Setup IPC handlers
function setupIpcHandlers() {
  // Get mouse position
  ipcMain.handle('get-mouse-position', () => {
    return screen.getCursorScreenPoint();
  });
}

// App lifecycle
app.whenReady().then(() => {
  enableAutoLaunch(); // Enable auto-launch
  setupIpcHandlers(); // Setup IPC handlers
  createWindow(); // Create the main window
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, recreate window when dock icon is clicked and no windows are open
  if (win === null) {
    createWindow();
  }
});