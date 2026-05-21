// main.js code
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const setupIpcHandlers = require('./components/mouseUtil');
const { enableAutoLaunch } = require('./components/autoLaunch');
const { autoUpdater } = require('electron-updater');

let win = null;

autoUpdater.autoDownload = false;
autoUpdater.forceDevUpdateConfig = true; 

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,             
    backgroundColor: '#ffffff', 
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
    win.show();
    // 1. App loads instantly. We kick off the update check completely in parallel.
    triggerUpdateCheck(); 
  });

  win.on('closed', () => { 
    win = null; 
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
    console.log('Pinging GitHub for update manifest in background...');
    // This runs completely asynchronously and does not freeze the app
    await autoUpdater.checkForUpdates();
  } catch (error) {
    console.error('Update check failed, allowing session fallback:', error);
  }
}

// IPC Interfaces
ipcMain.handle('check-mandatory-update', async () => {
  await triggerUpdateCheck();
});

// Auto-Updater Management
autoUpdater.on('update-available', (info) => {
  const versionStr = info.version ? ` (v${info.version})` : '';
  
  // OPTION A: If you still want a dialog, wait for the app to be idle, or use a custom IPC event.
  // OPTION B (Recommended): Send an event to Next.js so it can show a nice, quiet "Update Available" banner.
  // win.webContents.send('update-available-ui', info.version);

  dialog.showMessageBox(win, {
    type: 'question',
    buttons: ['Update Now', 'Later'],
    defaultId: 0,
    cancelId: 1,
    title: 'Update Available',
    message: `A new version of Voctrum WorkHub${versionStr} is available.`,
    detail: 'Would you like to download and install it now?'
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.downloadUpdate();
    }
  }).catch(err => {
    console.error('Update dialog error:', err);
  });
});

autoUpdater.on('update-not-available', () => {
  console.log('App is fully up-to-date. Session cleared.');
});

autoUpdater.on('error', (err) => {
  console.error('AutoUpdater Error:', err);
});

// Download happens asynchronously in the background. Once finished, we ask to restart.
autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox(win, {
    type: 'info',
    buttons: ['Restart Now'],
    defaultId: 0,
    title: 'Install Update',
    message: 'The download is complete.',
    detail: 'The app will restart now to apply changes.'
  }).then(() => {
    setImmediate(() => {
      autoUpdater.quitAndInstall();
    });
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});