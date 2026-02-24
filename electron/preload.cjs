const { contextBridge } = require("electron");

// Placeholder for future native functions (file system, dialogs, etc.)
contextBridge.exposeInMainWorld("pioneer", {
  version: () => "0.0.1",
});
