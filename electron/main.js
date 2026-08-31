const { app, BrowserWindow, session, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');

app.setName('Five Stars');

let splashWindow;
let mainWindow;
let localServer;
let localServerPort;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function startLocalServer() {
  const root = path.resolve(__dirname, '..');
  localServer = http.createServer((req, res) => {
    try {
      const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const relative = requestPath === '/' ? 'shell.html' : requestPath.replace(/^\/+/, '');
      const filePath = path.resolve(root, relative);
      if (filePath !== root && !filePath.startsWith(root + path.sep)) {
        res.writeHead(403); res.end('Forbidden'); return;
      }
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        res.writeHead(404); res.end('Not found'); return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': 'no-store'
      });
      fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      console.error('[Five Stars local server]', err);
      if (!res.headersSent) res.writeHead(500);
      res.end('Internal error');
    }
  });

  return new Promise((resolve, reject) => {
    const onError = err => reject(err);
    localServer.once('error', onError);
    localServer.listen(0, '127.0.0.1', () => {
      localServer.removeListener('error', onError);
      localServerPort = localServer.address().port;
      resolve(localServerPort);
    });
  });
}

function closeLocalServer() {
  if (!localServer) return;
  try { localServer.close(); } catch {}
  localServer = null;
  localServerPort = null;
}

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

async function makeMain() {
  await startLocalServer();
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
  await mainWindow.loadURL(`http://127.0.0.1:${localServerPort}/shell.html?app=${crypto.randomBytes(4).toString('hex')}`);

  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      mainWindow.show();
      mainWindow.focus();
      if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
      splashWindow = null;
    }, 850);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    closeLocalServer();
  });
}

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'media' || permission === 'notifications');
  });
  makeSplash();
  try {
    await makeMain();
  } catch (err) {
    console.error('[Five Stars startup]', err);
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) makeMain().catch(() => app.quit());
  });
});

app.on('window-all-closed', () => {
  closeLocalServer();
  if (process.platform !== 'darwin') app.quit();
});
