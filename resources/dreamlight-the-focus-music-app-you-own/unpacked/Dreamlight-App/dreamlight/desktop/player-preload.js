const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopPrefs", {
  read: () => ipcRenderer.sendSync("dreamlight:prefs:read"),
  write: (data) => ipcRenderer.send("dreamlight:prefs:write", data),
});

contextBridge.exposeInMainWorld("desktopAutoplay", {
  status: () => ipcRenderer.invoke("dreamlight:autoplay:status"),
  set: (patch) => ipcRenderer.invoke("dreamlight:autoplay:set", patch),
  onStatus: (listener) => {
    if (typeof listener !== "function") return () => {};
    const handler = (_event, status) => listener(status);
    ipcRenderer.on("dreamlight:autoplay:status", handler);
    return () => ipcRenderer.removeListener("dreamlight:autoplay:status", handler);
  },
});

contextBridge.exposeInMainWorld("desktopConnections", {
  status: () => ipcRenderer.invoke("dreamlight:connections:status"),
  connect: () => ipcRenderer.invoke("dreamlight:connections:connect"),
  addFocusBlock: (payload) => ipcRenderer.invoke("dreamlight:connections:addFocusBlock", payload),
  onStatus: (listener) => {
    if (typeof listener !== "function") return () => {};
    const handler = (_event, status) => listener(status);
    ipcRenderer.on("dreamlight:connections:status", handler);
    return () => ipcRenderer.removeListener("dreamlight:connections:status", handler);
  },
});
