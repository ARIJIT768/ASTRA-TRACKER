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

  // Point straight to the Vercel frontend app so any UI changes are instantly reflected on Desktop
  mainWindow.loadURL('https://astra-tracker-gqcs.vercel.app');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function sendPing(memberId, callback) {
  const payload = JSON.stringify({
    member_id: memberId,
    description: 'Desktop App - Auto Tracked',
    hours: 60 / 3600
  });

  const req = https.request('https://astra-tracker-mu.vercel.app/api/log', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, (res) => {
    if (callback) callback(true);
  });

  req.on('error', (e) => {
    console.error('Ping failed:', e);
    if (callback) callback(false);
  });

  req.write(payload);
  req.end();
}

function startNativeTracking(memberId) {
  if (trackingInterval) clearInterval(trackingInterval);
  
  // Fire IMMEDIATELY on clock-in so user sees a result right away
  sendPing(memberId, (success) => {
    if (mainWindow) {
      mainWindow.webContents.send(success ? 'tracking-ping-success' : 'tracking-ping-failed');
    }
  });
  
  trackingInterval = setInterval(() => {
    const idleTime = powerMonitor.getSystemIdleTime();
    
    if (idleTime < 60) {
      sendPing(memberId, (success) => {
        if (mainWindow) {
          mainWindow.webContents.send(success ? 'tracking-ping-success' : 'tracking-ping-failed');
        }
      });
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
