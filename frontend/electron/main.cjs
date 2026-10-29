const { app, BrowserWindow, ipcMain, dialog, session } = require('electron');
const path = require('path');
const { initDatabase, searchProducts, recordSale } = require('./db.cjs');
const { checkServerOnline, pushSalesToServer, pullProductsFromServer } = require('./sync.cjs');

let mainWindow = null;
const API_URL = process.env.VITE_API_BASE_URL || 'https://store.mhminimart.com/api';

process.on('uncaughtException', (err) => {
  console.error('[Main] Uncaught Exception:', err);
  try {
    dialog.showErrorBox('MH Mini Mart - Application Error', (err && err.stack) || String(err));
  } catch (_) {}
});

process.on('unhandledRejection', (reason) => {
  console.error('[Main] Unhandled Rejection:', reason);
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'MH Mini Mart POS',
    icon: path.join(__dirname, '../public/icon-512.png'),
    autoHideMenuBar: true,
    show: true,
    backgroundColor: '#f6f7f9',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  // Enable F12 for DevTools if ever needed
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      mainWindow.webContents.toggleDevTools();
    }
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', errorCode, errorDescription, validatedURL);
    dialog.showErrorBox('Page Load Error', `${errorDescription} (Code: ${errorCode})\nURL: ${validatedURL}`);
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('loadFile error:', err);
      dialog.showErrorBox('Startup Error', `Failed to load UI: ${err.message}\nPath: ${indexPath}`);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ----------------- App Lifecycle -----------------
app.whenReady().then(() => {
  // Ensure Electron requests to API send valid Origin/Referer and retain cookies
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    if (details.url.includes('store.mhminimart.com')) {
      details.requestHeaders['Origin'] = 'https://store.mhminimart.com';
      details.requestHeaders['Referer'] = 'https://store.mhminimart.com/';
    }
    callback({ requestHeaders: details.requestHeaders });
  });

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    const cookieKey = Object.keys(responseHeaders).find(k => k.toLowerCase() === 'set-cookie');
    if (cookieKey && Array.isArray(responseHeaders[cookieKey])) {
      responseHeaders[cookieKey] = responseHeaders[cookieKey].map((cookie) => {
        let c = cookie.replace(/;\s*samesite=lax/gi, '; SameSite=None; Secure');
        c = c.replace(/;\s*samesite=strict/gi, '; SameSite=None; Secure');
        if (!/samesite=/i.test(c)) {
          c += '; SameSite=None; Secure';
        }
        return c;
      });
    }
    callback({ responseHeaders });
  });

  try {
    initDatabase();
  } catch (err) {
    console.error('Failed to initialize local database:', err);
    dialog.showErrorBox('Database Error', `Failed to initialize offline database:\n${err.message}`);
  }

  createWindow();

  // Background Sync Loop (runs every 60 seconds)
  setInterval(async () => {
    try {
      const isOnline = await checkServerOnline(API_URL);
      if (isOnline) {
        await pushSalesToServer(API_URL);
        await pullProductsFromServer(API_URL);
      }
    } catch (e) {
      console.warn('[Sync Loop Warning]', e.message);
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
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(receiptHtml)}`);

    printWin.webContents.on('did-finish-load', () => {
      const printOptions = {
        silent: true,
        printBackground: true,
        margins: { marginType: 'none' },
      };

      if (printerName) {
        printOptions.deviceName = printerName;
      }

      printWin.webContents.print(printOptions, (success, errorType) => {
        printWin.close();
        if (!success) {
          console.error('[Printer] Print failed:', errorType);
          resolve({ success: false, error: errorType });
        } else {
          resolve({ success: true });
        }
      });
    });
  });
});

// Sync: Trigger Manual Sync
ipcMain.handle('sync:trigger', async () => {
  const isOnline = await checkServerOnline(API_URL);
  if (!isOnline) {
    return { success: false, message: 'Server is currently unreachable.' };
  }
  const pushed = await pushSalesToServer(API_URL);
  const pulled = await pullProductsFromServer(API_URL);
  return { success: true, pushed, pulled };
});

// Sync: Check Online Status
ipcMain.handle('sync:checkOnline', async () => {
  return checkServerOnline(API_URL);
});
