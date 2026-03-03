const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pioneer", {
  openPdfDialog: () => ipcRenderer.invoke("dialog:openPdf"),
  extractPdf: (filePath) => ipcRenderer.invoke("pdf:extract", filePath),
  generateDGDec: (payload) => ipcRenderer.invoke("generate-dgdec", payload),
  generatePreadvise: (payload) =>
    ipcRenderer.invoke("generate-preadvise", payload),
  generateLOI: (payload) => ipcRenderer.invoke("generate-loi", payload),
  generateNonDGCert: (payload) =>
    ipcRenderer.invoke("generate-nondg-cert", payload),
});
