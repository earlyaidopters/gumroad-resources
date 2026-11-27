const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("dl", {
  cmd: (name, ...args) => ipcRenderer.send("dl:cmd", name, ...args),
  resize: (height) => ipcRenderer.send("dl:resize", height),
  onState: (fn) => ipcRenderer.on("dl:state", (_event, state) => fn(state)),
  onVisibility: (fn) => ipcRenderer.on("dl:visibility", (_event, visible) => fn(visible)),
});
