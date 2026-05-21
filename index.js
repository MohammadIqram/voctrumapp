const { app, BrowserWindow, dialog, ipcMain, screen } = require('electron');
const path = require('path');
const setupIpcHandlers = require('./components/mouseUtil');
const { enableAutoLaunch } = require('./components/autoLaunch');
const { autoUpdater } = require('electron-updater');

let win;
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
      devTools: !app.isPackaged
    }
  });

  if (app.isPackaged) {
    const { Menu } = require('electron');
    Menu.setApplicationMenu(null);
  }

  const defaultUserAgent = win.webContents.getUserAgent();
  const customUserAgent = `${defaultUserAgent} VoctrumWorkhub/${app.getVersion()}`;
  win.webContents.setUserAgent(customUserAgent);

  win.loadURL('http://employees.voctrum.app');
  win.webContents.on('did-finish-load', () => {
    triggerUpdateCheck();
  });

  win.on('closed', () => { 
    win = null; 
    if (updateToastWin) updateToastWin.close();
  });
}

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

ipcMain.handle('check-mandatory-update', async () => {
  await triggerUpdateCheck();
});

ipcMain.on('start-update-download', () => {
  autoUpdater.downloadUpdate();
});

autoUpdater.on('update-available', (info) => {
  if (updateToastWin) return;

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const toastWidth = 360;
  const toastHeight = 160;
  const padding = 20;

  const x = width - toastWidth - padding;
  const y = height - toastHeight - padding;

  updateToastWin = new BrowserWindow({
    width: toastWidth,
    height: toastHeight,
    x: x,
    y: y,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  const versionStr = info.version || '';
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          margin: 0;
          padding: 16px;
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-left: 6px solid #2563eb;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          height: 100vh;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
        }
        .title {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 4px 0;
        }
        .desc {
          font-size: 12px;
          color: #64748b;
          margin: 0;
          line-height: 1.4;
        }
        .actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }
        button {
          font-size: 11px;
          font-weight: 500;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          border: none;
          transition: background 0.2s ease;
        }
        .btn-dismiss {
          background-color: #f1f5f9;
          color: #475569;
        }
        .btn-dismiss:hover {
          background-color: #e2e8f0;
        }
        .btn-update {
          background-color: #2563eb;
          color: white;
        }
        .btn-update:hover {
          background-color: #1d4ed8;
        }
      </style>
    </head>
    <body>
      <div>
        <div class="title">✨ Update Available ${versionStr ? `(v${versionStr})` : ''}</div>
        <p class="desc">A new version of Voctrum WorkHub is ready. Update now for the latest features and stability fixes.</p>
      </div>
      <div class="actions">
        <button class="btn-dismiss" onclick="window.close()">Dismiss</button>
        <button class="btn-update" id="updateBtn">Update Now</button>
      </div>
      <script>
        const { ipcRenderer } = require('electron');
        document.getElementById('updateBtn').addEventListener('click', () => {
          document.body.innerHTML = \`
            <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; text-align: center;">
              <div class="title" style="margin-bottom: 4px;">Downloading Update...</div>
              <p class="desc">Downloading assets in the background.</p>
            </div>
          \`;
          ipcRenderer.send('start-update-download');
        });
      </script>
    </body>
    </html>
  `;

  updateToastWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

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
  // Safely close the notification banner if it is still open
  if (updateToastWin) {
    updateToastWin.close();
  }

  // Final native confirmation dialog ensuring explicit approval before a mid-session restart
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