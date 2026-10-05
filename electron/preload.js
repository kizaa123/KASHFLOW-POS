const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kfLicense', {
  status: () => ipcRenderer.invoke('license:status'),
  activate: (key) => ipcRenderer.invoke('license:activate', String(key || '')),
  openContact: (kind) => ipcRenderer.invoke('license:contact', kind === 'call' ? 'call' : 'whatsapp'),
});
