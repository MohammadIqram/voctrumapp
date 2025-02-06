const { app, BrowserWindow } = require('electron');
const path = require('path');
const setupIpcHandlers = require('./components/mouseUtil');

let win;

// Function to create the Electron window
function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    show: true,
    icon: path.join(__dirname, 'assets/logo2.png'),
    webPreferences: {
      nodeIntegration: false, // Disable node integration for security reasons
      contextIsolation: true, // Isolate the context
      preload: path.join(__dirname, 'preload.js') // Preload script
    }
  });

  win.loadURL('http://localhost:3000');
  // win.loadURL('https://employees.voctrum.com');
  // win.loadFile(path.join(app.getAppPath(), '/build/index.html'));
  // Listen for window closed event
  win.on('closed', () => {
    win = null;
  });

  win.on('close', (e) => {
    e.preventDefault();
  });
}

// IPC handler to get mouse position when requested by the renderer
setupIpcHandlers();

// When the app is ready, create the window
app.whenReady().then(createWindow);

// Quit the app when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

