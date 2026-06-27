const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0e0e11',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Determine if we are running from a packaged app
  const isPackaged = app.isPackaged;
  
  // Load the React app from the dist folder
  const distPath = isPackaged 
    ? path.join(process.resourcesPath, 'dist', 'index.html') 
    : path.join(__dirname, '..', 'frontend', 'dist', 'index.html');
    
  mainWindow.loadFile(distPath);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startBackend() {
  const isPackaged = app.isPackaged;
  const serverPath = isPackaged 
    ? path.join(process.resourcesPath, 'backend', 'server.js')
    : path.join(__dirname, '..', 'backend', 'server.js');
  
  backendProcess = spawn('node', [serverPath], {
    windowsHide: true, // Completely hides the cmd window
    detached: false,
    stdio: 'ignore'
  });

  backendProcess.on('error', (err) => {
    console.error('Failed to start hidden backend process:', err);
  });
}

app.whenReady().then(() => {
  startBackend();
  createWindow();

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
  // Ensure the backend process is killed when the desktop app is closed
  if (backendProcess) {
    backendProcess.kill();
  }
});
