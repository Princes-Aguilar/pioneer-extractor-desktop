const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pioneer", {
  openPdfDialog: () => ipcRenderer.invoke("dialog:openPdf"),
  openMsdsPdfsDialog: () => ipcRenderer.invoke("dialog:openMsdsPdfs"),
  extractManyMsdsPdfs: (filePaths) =>
    ipcRenderer.invoke("msds:extractMany", filePaths),
  openMsdsPdfDialog: () => ipcRenderer.invoke("dialog:openMsdsPdf"),
  extractMsdsPdf: (filePath) => ipcRenderer.invoke("msds:extract", filePath),
  extractPdf: (filePath) => ipcRenderer.invoke("pdf:extract", filePath),
  generateDGDec: (payload) => ipcRenderer.invoke("generate-dgdec", payload),
  generatePreadvise: (payload) =>
    ipcRenderer.invoke("generate-preadvise", payload),
  generateLOI: (payload) => ipcRenderer.invoke("generate-loi", payload),
  generateNonDGCert: (payload) =>
    ipcRenderer.invoke("generate-nondg-cert", payload),

  // SUPABASE
  supabaseLoadAll: () => ipcRenderer.invoke("supabase:load-all"),
  supabaseSaveShipmentRecord: (record) =>
    ipcRenderer.invoke("supabase:save-shipment-record", record),
  supabaseDeleteShipmentGroup: (payload) =>
    ipcRenderer.invoke("supabase:delete-shipment-group", payload),

  supabaseSaveMsdsItems: (items) =>
    ipcRenderer.invoke("supabase:save-msds-items", items),
  supabaseInsertMsdsItem: (row) =>
    ipcRenderer.invoke("supabase:insert-msds-item", row),
  supabaseUpdateMsdsItem: ({ rowId, patch }) =>
    ipcRenderer.invoke("supabase:update-msds-item", { rowId, patch }),
  supabaseDeleteMsdsItem: ({ rowId }) =>
    ipcRenderer.invoke("supabase:delete-msds-item", { rowId }),
});
