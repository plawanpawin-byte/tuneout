'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('host', {
  openFiles: (opts) => ipcRenderer.invoke('file:open', opts),
  saveFile: (opts) => ipcRenderer.invoke('file:save', opts),
  writeFile: (id, data) => ipcRenderer.invoke('file:write', id, data),
  readFile: (id) => ipcRenderer.invoke('file:read', id),
  info: () => ipcRenderer.invoke('app:info'),
  
  run: (opts) => ipcRenderer.invoke('media:run', opts),
  peaks: (id, n) => ipcRenderer.invoke('media:peaks', id, n),
  mediaUrl: (id) => ipcRenderer.invoke('media:url', id),
  tempFile: (data, ext) => ipcRenderer.invoke('file:temp', data, ext),
  removeFile: (id) => ipcRenderer.invoke('file:remove', id),
  reveal: (id) => ipcRenderer.invoke('file:reveal', id),
  chooseFolder: () => ipcRenderer.invoke('file:folder'),
  probe: (id) => ipcRenderer.invoke('media:probe', id),
  cancel: () => ipcRenderer.invoke('media:cancel'),
  onProgress: (fn) => { ipcRenderer.removeAllListeners('media:progress'); ipcRenderer.on('media:progress', (_e, v) => fn(v)); },
});
