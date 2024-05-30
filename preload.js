const { contextBridge, ipcRenderer } = require("electron");
const dotenv = require("dotenv");
dotenv.config();

console.log("Preload script loaded");

contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: ipcRenderer,
  env: process.env,
});
