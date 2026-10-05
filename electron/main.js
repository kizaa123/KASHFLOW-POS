/* KASHFLOW POS desktop shell: opens the app in its own window (no Chrome needed).
   Shop data is kept by Electron in %APPDATA%\KASHFLOW POS, so it survives app updates. */
const { app, BrowserWindow, Menu, shell, session } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

const APP_ROOT = path.join(__dirname, '..');
const APP_URL_PREFIX = pathToFileURL(APP_ROOT + path.sep).href;
const ICON = path.join(APP_ROOT, 'assets', 'logo.png');

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
    if (isAppPage(url)) return;
    e.preventDefault();
    openOutside(url);
  });

  win.loadFile(path.join(APP_ROOT, 'login.html'));
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
  buildMenu();
  createWindow();
});

app.on('window-all-closed', () => app.quit());
