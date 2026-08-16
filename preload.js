'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('spartacus', {
  getVideoInfo: (url) => ipcRenderer.invoke('yt:info', url),
  prepareTrack: (url, id) => ipcRenderer.invoke('yt:prepare', { url, id }),
  uncache: (id) => ipcRenderer.invoke('yt:uncache', id),
  minimize: () => ipcRenderer.send('win:minimize'),
  toggleMaximize: () => ipcRenderer.send('win:toggle-maximize'),
  close: () => ipcRenderer.send('win:close'),
  isMaximized: () => ipcRenderer.invoke('win:isMaximized'),
  onMaximized: (cb) => ipcRenderer.on('win:maximized', (_e, v) => cb(v)),
});
