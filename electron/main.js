/* KASHFLOW POS desktop shell: opens the app in its own window (no Chrome needed).
   Shop data is kept by Electron in %APPDATA%\KASHFLOW POS, so it survives app updates. */
const { app, BrowserWindow, Menu, shell, session, ipcMain, net } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const { createLicense } = require('./license');

// ---- Update checker ----
// Point this at a JSON file you host. It must return { "version": "1.2.0", "downloadUrl": "https://..." }
// Example: a raw GitHub release asset or a simple file on your website.
const UPDATE_CHECK_URL  = 'https://raw.githubusercontent.com/kizaa123/KASHFLOW-POS/main/version.json';
const UPDATE_INTERVAL_MS = 6 * 60 * 60 * 1000; // check every 6 hours


const APP_ROOT = path.join(__dirname, '..');
const APP_URL_PREFIX = pathToFileURL(APP_ROOT + path.sep).href;
const ICON = path.join(APP_ROOT, 'assets', 'logo.png');
const LOCK_PAGE = 'locked.html';
const SUPPORT_PHONE_INTL = '233531806381';

// Current app version comes from package.json (set by electron-builder on build).
const CURRENT_VERSION = app.getVersion();
let pendingUpdate = null; // { version, downloadUrl } when a newer build is available.


let license = null;
let lastStatus = null;

function refreshLicense() {
  lastStatus = license.status();
  return lastStatus;
}

function isLocked() {
  return !lastStatus || (lastStatus.state !== 'trial' && lastStatus.state !== 'licensed');
}

function isLockPage(url) {
  return url.split(/[?#]/)[0].endsWith('/' + LOCK_PAGE);
}

function showLockPage() {
  if (win && !isLockPage(win.webContents.getURL())) win.loadFile(path.join(APP_ROOT, LOCK_PAGE));
}

// ---- Version helpers ----
function parseVer(v) {
  return String(v || '0').split('.').map(Number);
}
function isNewer(remote, local) {
  const r = parseVer(remote);
  const l = parseVer(local);
  for (let i = 0; i < Math.max(r.length, l.length); i++) {
    const a = r[i] || 0;
    const b = l[i] || 0;
    if (a > b) return true;
    if (a < b) return false;
  }
  return false;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = net.request({ url, method: 'GET' });
    let body = '';
    req.on('response', (res) => {
      res.on('data', (chunk) => { body += chunk.toString(); });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error('Bad JSON')); }
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });
}

async function checkForUpdate() {
  try {
    const data = await fetchJson(UPDATE_CHECK_URL);
    if (!data || !data.version) return;
    if (!isNewer(data.version, CURRENT_VERSION)) return;
    pendingUpdate = { version: data.version, downloadUrl: data.downloadUrl || '' };
    // Push to the open window so the banner appears immediately.
    if (win && !win.isDestroyed()) {
      win.webContents.send('update:available', pendingUpdate);
    }
  } catch (_e) {
    // No internet or server unreachable — silently ignore.
  }
}



// Only one KASHFLOW window at a time; a second launch just brings the first one forward.
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let win = null;

function isAppPage(url) {
  return url.startsWith(APP_URL_PREFIX);
}

// WhatsApp and other web links open outside the POS; nothing else from the web is loaded inside it.
function openOutside(url) {
  if (/^https?:\/\//i.test(url)) shell.openExternal(url);
}

function buildMenu() {
  const template = [
    {
      label: 'View',
      submenu: [
        { role: 'reload', label: 'Reload' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Full screen' },
        ...(app.isPackaged ? [] : [{ role: 'toggleDevTools', label: 'Developer tools' }]),
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  win = new BrowserWindow({
    width: 1366,
    height: 820,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    title: 'KASHFLOW POS',
    icon: ICON,
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !app.isPackaged,
      spellcheck: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Zoom is handled by the pages themselves (80%–120%); stop Chromium's own zoom and touch pinch.
  win.webContents.setVisualZoomLevelLimits(1, 1);
  win.webContents.on('zoom-changed', () => win.webContents.setZoomFactor(1));
  win.webContents.on('did-finish-load', () => win.webContents.setZoomFactor(1));

  win.once('ready-to-show', () => {
    win.maximize();
    win.show();
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    openOutside(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (isAppPage(url) && (!isLocked() || isLockPage(url))) return;
    e.preventDefault();
    if (isAppPage(url)) showLockPage();
    else openOutside(url);
  });
  // Back/forward and anything else that slips past will-navigate.
  win.webContents.on('did-navigate', (_e, url) => {
    if (isLocked() && !isLockPage(url)) showLockPage();
  });

  win.loadFile(path.join(APP_ROOT, isLocked() ? LOCK_PAGE : 'login.html'));
  win.on('closed', () => { win = null; });
}

app.on('second-instance', () => {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.focus();
});

app.whenReady().then(() => {
  // The POS never needs the camera, microphone, location or notifications permission.
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  // Block any network request FROM THE RENDERER: everything the app needs is inside the install folder.
  // Note: net.request() in the main process (used for update checks) is NOT affected by this rule.
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_details, callback) => {
    callback({ cancel: true });
  });
  license = createLicense(app.getPath('userData'));
  refreshLicense();

  // Pages only learn whether the app is locked and the Machine ID, never the trial dates.
  ipcMain.handle('license:status', () => {
    const s = refreshLicense();
    if (!isLocked()) return { locked: false };
    return { locked: true, wrongDate: s.state === 'clock', machineId: s.machineId };
  });
  ipcMain.handle('license:activate', (_e, key) => {
    const result = license.activate(key);
    refreshLicense();
    return result;
  });
  ipcMain.handle('license:contact', (_e, kind) => {
    const id = lastStatus ? lastStatus.machineId : '';
    const text = encodeURIComponent(`Hello KB.TECH STUDIO, I want to buy the KASHFLOW POS licence.\nMachine ID: ${id}`);
    if (kind === 'call') shell.openExternal(`tel:+${SUPPORT_PHONE_INTL}`);
    else shell.openExternal(`https://wa.me/${SUPPORT_PHONE_INTL}?text=${text}`);
  });

  // ---- Update IPC ----
  ipcMain.handle('update:check', () => pendingUpdate);
  ipcMain.handle('update:openDownload', () => {
    const url = (pendingUpdate && pendingUpdate.downloadUrl) || 'https://github.com/kizaa123/KASHFLOW-POS/releases/latest';
    shell.openExternal(url);
  });

  buildMenu();
  createWindow();

  // The trial can run out while the POS is open; check every 10 minutes.
  setInterval(() => {
    refreshLicense();
    if (isLocked()) showLockPage();
  }, 10 * 60 * 1000);

  // Check for a newer version shortly after launch, then every 6 hours.
  setTimeout(checkForUpdate, 15 * 1000);
  setInterval(checkForUpdate, UPDATE_INTERVAL_MS);
});

app.on('window-all-closed', () => app.quit());
