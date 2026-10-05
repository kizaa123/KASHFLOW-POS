/* KASHFLOW POS desktop shell: opens the app in its own window (no Chrome needed).
   Shop data is kept by Electron in %APPDATA%\KASHFLOW POS, so it survives app updates. */
const { app, BrowserWindow, Menu, shell, session, ipcMain } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const { createLicense } = require('./license');

const APP_ROOT = path.join(__dirname, '..');
const APP_URL_PREFIX = pathToFileURL(APP_ROOT + path.sep).href;
const ICON = path.join(APP_ROOT, 'assets', 'logo.png');
const LOCK_PAGE = 'locked.html';
const SUPPORT_PHONE_INTL = '233531806381';

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

app.setAppUserModelId('com.kbtech.kashflowpos');

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
  // Block any network request: everything the app needs is inside the install folder.
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

  buildMenu();
  createWindow();

  // The trial can run out while the POS is open; check every 10 minutes.
  setInterval(() => {
    refreshLicense();
    if (isLocked()) showLockPage();
  }, 10 * 60 * 1000);
});

app.on('window-all-closed', () => app.quit());
