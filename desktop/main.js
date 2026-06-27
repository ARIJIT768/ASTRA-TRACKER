const { app, BrowserWindow, ipcMain, powerMonitor } = require('electron');
const path = require('path');
const https = require('https');

let mainWindow;
let trackingInterval = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'build/icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  const isPackaged = app.isPackaged;
  
  const distPath = isPackaged 
    ? path.join(process.resourcesPath, 'dist', 'index.html') 
    : path.join(__dirname, '..', 'frontend', 'dist', 'index.html');
    
  mainWindow.loadFile(distPath);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startNativeTracking(memberId) {
  if (trackingInterval) clearInterval(trackingInterval);
  
  trackingInterval = setInterval(() => {
    const idleTime = powerMonitor.getSystemIdleTime();
    
    if (idleTime < 60) {
      const payload = JSON.stringify({
        member_id: memberId,
        type: 'auto_ping',
        active_window: 'ASTRA Desktop App'
      });

      const req = https.request('https://astra-tracker-mu.vercel.app/api/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, (res) => {});

      req.on('error', (e) => {
        console.error('Ping failed:', e);
      });

      req.write(payload);
      req.end();
    }
  }, 60000);
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.on('clock-in', (event, data) => {
    startNativeTracking(data.memberId);
  });

  ipcMain.on('clock-out', () => {
    if (trackingInterval) {
      clearInterval(trackingInterval);
      trackingInterval = null;
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (trackingInterval) clearInterval(trackingInterval);
});
