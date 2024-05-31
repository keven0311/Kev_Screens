const peerConfiguration = require("./src/config/peerConfiguration")
const { contextBridge, ipcRenderer } = require("electron");

require('dotenv').config();

console.log("Preload script loaded");

contextBridge.exposeInMainWorld("ipcRenderer", {
  send: (...arg) => ipcRenderer.send(...arg),
  invoke: (...arg) => {
    return ipcRenderer.invoke(...arg)
  } 
});

contextBridge.exposeInMainWorld('env', {
  PORT: process.env.PORT,
  BASE_URL: process.env.BASE_URL
})

contextBridge.exposeInMainWorld('peerConfig',{
  config: peerConfiguration
})