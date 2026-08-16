'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('spartacus', {
  getVideoInfo: (url) => ipcRenderer.invoke('yt:info', url),
  prepareTrack: (url, id) => ipcRenderer.invoke('yt:prepare', { url, id }),
  uncache: (id) => ipcRenderer.invoke('yt:uncache', id),
  builtinUrl: (file) => 'spartacus://builtin/' + file,
  minimize: () => ipcRenderer.send('win:minimize'),
  toggleMaximize: () => ipcRenderer.send('win:toggle-maximize'),
  close: () => ipcRenderer.send('win:close'),
  isMaximized: () => ipcRenderer.invoke('win:isMaximized'),
  onMaximized: (cb) => ipcRenderer.on('win:maximized', (_e, v) => cb(v)),
  flash: (on) => ipcRenderer.send('win:flash', !!on),
  setMiniMode: (on) => ipcRenderer.send('win:mini-mode', !!on),
  notify: (title, body) => ipcRenderer.send('notify', { title, body }),
  getVersion: () => ipcRenderer.invoke('app:version'),
  fetchQuote: () => ipcRenderer.invoke('quote:fetch'),
  checkUpdates: () => ipcRenderer.send('updates:check'),
  installUpdate: () => ipcRenderer.send('updates:install'),
  updatesSupported: () => ipcRenderer.invoke('updates:supported'),
  onUpdateStatus: (cb) => ipcRenderer.on('update:status', (_e, s) => cb(s)),
  smoke: process.env.SMOKE_TEST === '1',
});
