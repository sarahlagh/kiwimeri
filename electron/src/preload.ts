/* eslint-disable @typescript-eslint/no-require-imports */
require('./rt/electron-rt');
const { contextBridge, ipcRenderer } = require('electron');

//////////////////////////////
// User Defined Preload scripts below
contextBridge.exposeInMainWorld('electronAPI', {
  forwardRequest: (resource, config) =>
    ipcRenderer.invoke('capacitor:fetch', [resource, config]),
  readFile: filename => ipcRenderer.invoke('capacitor:fs:readFile', [filename]),
  writeFile: (filename, data) =>
    ipcRenderer.invoke('capacitor:fs:writeFile', [filename, data]),
  renameFile: (filename, newFileName) =>
    ipcRenderer.invoke('capacitor:fs:renameFile', [filename, newFileName])
});
