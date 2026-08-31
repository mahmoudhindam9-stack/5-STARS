const { app, BrowserWindow, session, Menu } = require('electron');
const path = require('path');

app.setName('Five Stars');

let splashWindow;
let mainWindow;

function makeSplash() {
  splashWindow = new BrowserWindow({
    width: 520,
    height: 360,
    frame: false,
    resizable: false,
    movable: true,
    center: true,
    show: false,
    backgroundColor: '#0f172a',
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.once('ready-to-show', () => splashWindow.show());
}

function makeMain() {
  mainWindow = new BrowserWindow({
    minWidth: 1100,
    minHeight: 700,
    width: 1440,
    height: 900,
    show: false,
    backgroundColor: '#f8fafc',
    autoHideMenuBar: true,
    title: 'Five Stars',
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: false,
      spellcheck: false
    }
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadFile(path.join(__dirname, '..', 'shell.html'));

  mainWindow.once('ready-to-show', () => {
    const showDelay = 850;
    setTimeout(() => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      mainWindow.show();
      mainWindow.focus();
      if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
      splashWindow = null;
    }, showDelay);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'media');
  });
  makeSplash();
  makeMain();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) makeMain();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
