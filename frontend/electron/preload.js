const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,

  // Database operations
  searchProducts: (params) => ipcRenderer.invoke('db:searchProducts', params),
  recordSale: (saleData) => ipcRenderer.invoke('db:recordSale', saleData),

  // Printing operations
  getPrinters: () => ipcRenderer.invoke('printer:getPrinters'),
  printReceipt: (receiptHtml, printerName) =>
    ipcRenderer.invoke('printer:printReceipt', { receiptHtml, printerName }),

  // Synchronization operations
  syncNow: () => ipcRenderer.invoke('sync:trigger'),
  checkOnline: () => ipcRenderer.invoke('sync:checkOnline'),
});
