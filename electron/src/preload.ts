/* eslint-disable @typescript-eslint/no-require-imports */
require('./rt/electron-rt');
const { contextBridge, ipcRenderer } = require('electron');

//////////////////////////////
// User Defined Preload scripts below
contextBridge.exposeInMainWorld('electronAPI', {
  forwardRequest: (resource, config) =>
    ipcRenderer.invoke('capacitor:fetch', [resource, config])
});
