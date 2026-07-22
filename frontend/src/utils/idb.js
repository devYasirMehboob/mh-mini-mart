// IndexedDB Utility for MH Mini Mart Offline Emergency Mode
const DB_NAME = 'MHMiniMartOfflineDB';
const DB_VERSION = 1;

let dbInstance = null;

export function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Store 1: Config (Device binding, PIN hash, offline admin session)
      if (!db.objectStoreNames.contains('offline_config')) {
        db.createObjectStore('offline_config', { keyPath: 'key' });
      }

      // Store 2: Products Cache (For Offline POS lookup & scanning)
      if (!db.objectStoreNames.contains('products_cache')) {
        const productStore = db.createObjectStore('products_cache', { keyPath: 'id' });
        productStore.createIndex('barcode', 'barcode', { unique: false });
        productStore.createIndex('code', 'code', { unique: false });
        productStore.createIndex('name', 'name', { unique: false });
      }

      // Store 3: Offline Sales (Pending & synced local sales)
      if (!db.objectStoreNames.contains('offline_sales')) {
        const salesStore = db.createObjectStore('offline_sales', { keyPath: 'offline_sale_id' });
        salesStore.createIndex('sync_status', 'sync_status', { unique: false });
        salesStore.createIndex('created_at', 'created_at', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

// ----------------------------------------------------
// Web Crypto Helper Functions for Secure PIN Hashing
// ----------------------------------------------------

export async function generateSalt() {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPin(pin, saltHex) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + saltHex);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ----------------------------------------------------
// Device & Config Operations
// ----------------------------------------------------

export async function getDeviceConfig() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_config', 'readonly');
    const store = tx.objectStore('offline_config');
    const request = store.get('device_config');
    request.onsuccess = () => resolve(request.result?.value || null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDeviceConfig(configValue) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_config', 'readwrite');
    const store = tx.objectStore('offline_config');
    const request = store.put({ key: 'device_config', value: configValue });
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

// ----------------------------------------------------
// Products Cache Operations
// ----------------------------------------------------

export async function cacheProducts(productsList, clearFirst = true) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('products_cache', 'readwrite');
    const store = tx.objectStore('products_cache');

    if (clearFirst) {
      store.clear();
    }

    const now = new Date().toISOString();
    productsList.forEach((product) => {
      // Exclude purchase_cost to keep offline data safe
      const safeProduct = {
        id: Number(product.id),
        name: product.name,
        code: product.code || '',
        barcode: product.barcode || '',
        selling_price: parseFloat(product.selling_price || product.price || 0),
        quantity: parseFloat(product.quantity || 0),
        unit_type: product.unit_type || product.unit_name || 'pcs',
        base_unit_id: product.base_unit_id || null,
        track_stock: Number(product.track_stock ?? 1),
        status: product.status || 'active',
        category_id: product.category_id ? Number(product.category_id) : null,
        category_name: product.category_name || '',
        min_stock: parseFloat(product.min_stock || product.minimum_stock || 0),
        allow_custom_sale: Boolean(product.allow_custom_sale),
        tax_percentage: parseFloat(product.tax_percentage || 0),
        image: product.image || null,
        formattedPrice: product.formattedPrice || null,
        stock_mode: product.stock_mode || 'direct',
        last_updated: now,
      };
      store.put(safeProduct);
    });

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedProducts() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('products_cache', 'readonly');
    const store = tx.objectStore('products_cache');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function findCachedProductByBarcode(barcode) {
  const db = await openDB();
  const products = await getCachedProducts();
  const cleanBarcode = String(barcode).trim().toLowerCase();
  return products.find(p => p.barcode && String(p.barcode).trim().toLowerCase() === cleanBarcode) || null;
}

export async function deductCachedStock(items) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('products_cache', 'readwrite');
    const store = tx.objectStore('products_cache');

    items.forEach((item) => {
      const getReq = store.get(Number(item.product_id));
      getReq.onsuccess = () => {
        const product = getReq.result;
        if (product && product.track_stock === 1) {
          product.quantity = Math.max(0, product.quantity - parseFloat(item.quantity));
          store.put(product);
        }
      };
    });

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

// ----------------------------------------------------
// Offline Sales Operations
// ----------------------------------------------------

export async function saveOfflineSale(saleRecord) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_sales', 'readwrite');
    const store = tx.objectStore('offline_sales');
    const request = store.put(saleRecord);
    request.onsuccess = () => resolve(saleRecord);
    request.onerror = () => reject(request.error);
  });
}

export async function getOfflineSales(statusFilter = null) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_sales', 'readonly');
    const store = tx.objectStore('offline_sales');
    const request = store.getAll();

    request.onsuccess = () => {
      let sales = request.result || [];
      // Sort newest first
      sales.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      if (statusFilter && statusFilter !== 'all') {
        sales = sales.filter((s) => s.sync_status === statusFilter);
      }
      resolve(sales);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function updateOfflineSaleStatus(offlineSaleId, updateObj) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_sales', 'readwrite');
    const store = tx.objectStore('offline_sales');
    const getReq = store.get(offlineSaleId);

    getReq.onsuccess = () => {
      const existing = getReq.result;
      if (!existing) return resolve(false);

      const updated = { ...existing, ...updateObj };
      const putReq = store.put(updated);
      putReq.onsuccess = () => resolve(updated);
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function getPendingOfflineSalesCount() {
  const sales = await getOfflineSales();
  return sales.filter(s => s.sync_status === 'pending' || s.sync_status === 'failed' || s.sync_status === 'syncing').length;
}

export function generateOfflineSaleId() {
  return 'off_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}
