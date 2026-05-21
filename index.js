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

  // Start the interval only if the window exists
  screenshotInterval = setInterval(async () => {
    if (!win || win.isDestroyed()) return;
    
    try {
      const imageBuffer = await captureScreen();
      // Ensure window is still open and focused/active before sending
      if (imageBuffer && win && !win.webContents.isDestroyed()) {
        win.webContents.send('screenshot', imageBuffer); 
      }
    } catch (error) {
      // Fail silently or log to a file, don't crash
      console.error('Failed to capture screen:', error);
    }
  }, 300000); // 5 minutes
});

app.on('window-all-closed', () => {
  if (screenshotInterval) clearInterval(screenshotInterval);
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

async function captureScreen() {
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;
    
    // Target size (50% reduction)
    const targetWidth = Math.floor(width * 0.5);
    const targetHeight = Math.floor(height * 0.5);

    // OPTIMIZATION 1: Request the thumbnail at the exact size we want.
    // This forces Chromium's native C++ backend to do the resizing, 
    // avoiding the slow JS-based .resize() method entirely.
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: targetWidth, height: targetHeight }
    });

    if (!sources || sources.length === 0) return null;

    // OPTIMIZATION 2: Convert directly to JPEG buffer without native resize call.
    // Quality 60 drastically reduces buffer size, making IPC transfer incredibly fast.
    return sources[0].thumbnail.toJPEG(60); 
  } catch (err) {
    return null;
  }
}