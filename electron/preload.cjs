const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pioneer", {
  openPdfDialog: () => ipcRenderer.invoke("dialog:openPdf"),
  extractPdf: (filePath) => ipcRenderer.invoke("pdf:extract", filePath),
  generateDGDec: (payload) => ipcRenderer.invoke("generate-dgdec", payload),
});
