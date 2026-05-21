const { app, BrowserWindow, dialog, ipcMain, screen } = require('electron');
const path = require('path');
const setupIpcHandlers = require('./components/mouseUtil');
const { enableAutoLaunch } = require('./components/autoLaunch');
const { autoUpdater } = require('electron-updater');

let win = null;
let updateToastWin = null;

autoUpdater.autoDownload = false;
autoUpdater.forceDevUpdateConfig = true; 

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    show: true,
    icon: path.join(__dirname, 'assets/logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    }
  });

  const defaultUserAgent = win.webContents.getUserAgent();
  const customUserAgent = `${defaultUserAgent} VoctrumWorkhub/${app.getVersion()}`;
  win.webContents.setUserAgent(customUserAgent);

  win.loadURL('https://employees.voctrum.com');

  win.once('ready-to-show', () => {
    setTimeout(triggerUpdateCheck, 1500); 
  });

  win.on('closed', () => { 
    win = null; 
    if (updateToastWin) updateToastWin.close();
  });
}

// Initialize system utilities
setupIpcHandlers();

app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-gpu-process-crash-limit');

app.whenReady().then(() => {
  createWindow();
  enableAutoLaunch();
});

async function triggerUpdateCheck() {
  try {
    console.log('Pinging GitHub for update manifest...');
    await autoUpdater.checkForUpdates();
  } catch (error) {
    console.error('Update check failed, allowing session fallback:', error);
  }
}

// IPC Interfaces
ipcMain.handle('check-mandatory-update', async () => {
  await triggerUpdateCheck();
});

ipcMain.on('start-update-download', () => {
  autoUpdater.downloadUpdate();
});

// Auto-Updater Management
autoUpdater.on('update-available', (info) => {
  if (updateToastWin) return;

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const toastWidth = 360;
  const toastHeight = 160;
  const padding = 20;

  updateToastWin = new BrowserWindow({
    width: toastWidth,
    height: toastHeight,
    x: width - toastWidth - padding,
    y: height - toastHeight - padding,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false, // Prevent white flash lag
    webPreferences: {
      nodeIntegration: true, 
      contextIsolation: false
    }
  });

  // OPTIMIZATION: Load static file instead of a massive URI string data URL
  const version = info.version || '';
  updateToastWin.loadFile(path.join(__dirname, 'toast.html'), {
    search: `v=${version}`
  });

  updateToastWin.once('ready-to-show', () => {
    updateToastWin.show();
  });

  updateToastWin.on('closed', () => {
    updateToastWin = null;
  });
});

autoUpdater.on('update-not-available', () => {
  console.log('App is fully up-to-date. Session cleared.');
});

autoUpdater.on('error', (err) => {
  console.error('AutoUpdater Error:', err);
});

autoUpdater.on('update-downloaded', () => {
  if (updateToastWin) {
    updateToastWin.close();
  }

  dialog.showMessageBox(win, {
    type: 'info',
    title: 'Install Update',
    message: 'The download is complete. The app will restart now to apply changes.',
    buttons: ['Restart Now']
  }).then(() => {
    setImmediate(() => {
      autoUpdater.quitAndInstall();
    });
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});