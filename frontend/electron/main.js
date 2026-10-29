const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { initDatabase, searchProducts, recordSale } = require('./db');
const { checkServerOnline, pushSalesToServer, pullProductsFromServer } = require('./sync');

let mainWindow = null;
const API_URL = process.env.VITE_API_BASE_URL || 'https://store.mhminimart.com/api';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'MH Mini Mart POS',
    icon: path.join(__dirname, '../public/icon-512.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allows loading local assets seamlessly
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ----------------- App Lifecycle -----------------
app.whenReady().then(() => {
  try {
    initDatabase();
    createWindow();
  } catch (err) {
    console.error('Failed to initialize app:', err);
    dialog.showErrorBox('Initialization Error', err.message);
  }

  // Background Sync Loop (runs every 60 seconds)
  setInterval(async () => {
    const isOnline = await checkServerOnline(API_URL);
    if (isOnline) {
      await pushSalesToServer(API_URL);
      await pullProductsFromServer(API_URL);
    }
  }, 60000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ----------------- IPC Handlers -----------------

// Database: Product Search in SQLite
ipcMain.handle('db:searchProducts', async (event, params) => {
  try {
    return searchProducts(params || {});
  } catch (err) {
    return { error: err.message, products: [], pagination: {} };
  }
});

// Database: Record Sale in SQLite
ipcMain.handle('db:recordSale', async (event, saleData) => {
  try {
    return recordSale(saleData);
  } catch (err) {
    return { error: err.message, success: false };
  }
});

// Printer: List available printers
ipcMain.handle('printer:getPrinters', async () => {
  if (!mainWindow) return [];
  return mainWindow.webContents.getPrintersAsync();
});

// Printer: Silent Direct Print
ipcMain.handle('printer:printReceipt', async (event, { receiptHtml, printerName }) => {
  return new Promise((resolve) => {
    const printWin = new BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: false },
    });

    printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(receiptHtml)}`);

    printWin.webContents.on('did-finish-load', () => {
      const options = {
        silent: true,
        printBackground: true,
      };
      if (printerName) {
        options.deviceName = printerName;
      }

      printWin.webContents.print(options, (success, failureReason) => {
        printWin.close();
        if (!success) {
          resolve({ success: false, error: failureReason });
        } else {
          resolve({ success: true });
        }
      });
    });
  });
});

// Sync: Manual Trigger
ipcMain.handle('sync:trigger', async () => {
  const isOnline = await checkServerOnline(API_URL);
  if (!isOnline) {
    return { online: false, message: 'Server is currently offline.' };
  }
  const salesResult = await pushSalesToServer(API_URL);
  const productsResult = await pullProductsFromServer(API_URL);
  return { online: true, salesSynced: salesResult.synced, productsCached: productsResult.count };
});

// Sync: Online Status Check
ipcMain.handle('sync:checkOnline', async () => {
  return checkServerOnline(API_URL);
});
