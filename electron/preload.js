const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kfLicense', {
  status: () => ipcRenderer.invoke('license:status'),
  activate: (key) => ipcRenderer.invoke('license:activate', String(key || '')),
  openContact: (kind) => ipcRenderer.invoke('license:contact', kind === 'call' ? 'call' : 'whatsapp'),
});

contextBridge.exposeInMainWorld('kfUpdate', {
  // Renderer calls this to ask: is there an update waiting?
  check: () => ipcRenderer.invoke('update:check'),
  // Renderer calls this to open the download page in the browser.
  openDownload: () => ipcRenderer.invoke('update:openDownload'),
  // Main process pushes update-available events to the renderer.
  onAvailable: (cb) => {
    ipcRenderer.on('update:available', (_e, info) => cb(info));
  },
});
