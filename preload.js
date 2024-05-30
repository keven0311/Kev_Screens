const { contextBridge, ipcRenderer } = require("electron");
const dotenv = require("dotenv");
dotenv.config();

console.log("Preload script loaded");

contextBridge.exposeInMainWorld("env", {
  ipcRenderer: ipcRenderer(),
  env: process.env,
});
