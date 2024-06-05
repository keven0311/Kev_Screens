const { contextBridge, ipcRenderer } = require("electron");

console.log("Preload script loaded");

contextBridge.exposeInMainWorld("ipcRenderer", {
  send: (...arg) => ipcRenderer.send(...arg),
  invoke: (...arg) => {
    return ipcRenderer.invoke(...arg)
  } 
});