const { app, BrowserWindow, dialog, ipcMain } = require('electron'); // Added ipcMain
const path = require('path');
const setupIpcHandlers = require('./components/mouseUtil');
const { enableAutoLaunch } = require('./components/autoLaunch');
const { autoUpdater } = require('electron-updater');

let win;
// CRITICAL: Keep autoDownload false so we control the user flow manually
autoUpdater.autoDownload = false;

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    show: true,
    icon: path.join(__dirname, 'assets/logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // inject custom user agent
  const defaultUserAgent = win.webContents.getUserAgent();
  const customUserAgent = `${defaultUserAgent} VoctrumWorkhub/${app.getVersion()}`;
  win.webContents.setUserAgent(customUserAgent);

  win.loadURL('http://localhost:3000');
  win.on('closed', () => { win = null; });
}

setupIpcHandlers();

app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-gpu-process-crash-limit');

app.whenReady().then(() => {
  createWindow();
  enableAutoLaunch();
});

ipcMain.handle('check-mandatory-update', async () => {
  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    console.error('Update check failed, allowing session fallback:', error);
    win.webContents.send('update-status', { available: false }); 
  }
});

autoUpdater.on('update-available', () => {
  win.webContents.send('update-status', { available: true });

  dialog.showMessageBox(win, {
    type: 'warning',
    title: 'Mandatory Update Required',
    message: 'A newer version of Voctrum WorkHub is required to start your session. The app will now download the update.',
    buttons: ['Download & Update']
  }).then(() => {
    autoUpdater.downloadUpdate();
  });
});

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox(win, {
    type: 'info',
    title: 'Install Update',
    message: 'The download is complete. The app will restart now to apply changes.',
    buttons: ['Restart Now']
  }).then(() => {
    autoUpdater.quitAndInstall();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});