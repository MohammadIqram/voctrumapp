const { app, BrowserWindow, desktopCapturer, screen } = require('electron');
const path = require('path');
const setupIpcHandlers = require('./components/mouseUtil');
const fs = require('fs');

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

  // win.on('close', (e) => {
  //   e.preventDefault();
  // });
}

// IPC handler to get mouse position when requested by the renderer
setupIpcHandlers();

// When the app is ready, create the window
app.whenReady().then(() => {
  createWindow();

  setInterval(async () => {
    try {
      const imageBuffer = await captureScreen();
      if (imageBuffer) {
        win.webContents.send('screenshot', imageBuffer); // Send buffer directly to React
      }
    } catch (error) {
      return;
    }
  }, 300000); // Capture every 5 minutes
});

// Quit the app when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

async function captureScreen() {
  const { width, height } = screen.getPrimaryDisplay().size; // Get actual screen resolution

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: Math.floor(width * 0.5), height: Math.floor(height * 0.5) } // Reduce resolution
  });

  if (sources.length === 0) return null;
  const image = sources[0].thumbnail;
  const resizedImage = image.resize({ width: Math.floor(width * 0.5), height: Math.floor(height * 0.5) }); // 50% smaller

  // Convert to high-quality JPEG format (85% quality)
  return resizedImage.toJPEG(60); // Returns a Buffer, NOT Base64
}
