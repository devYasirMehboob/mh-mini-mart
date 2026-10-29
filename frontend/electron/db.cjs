const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let db = null;

function getDbPath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'mh_pos.sqlite');
}

function initDatabase() {
  if (db) return db;

  const dbPath = getDbPath();
  db = new Database(dbPath);

  // Enable WAL mode for high concurrency & speed
  db.pragma('journal_mode = WAL');

  // Schema creation
  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT,
      barcode TEXT,
      category_id INTEGER,
      category_name TEXT,
      selling_price REAL NOT NULL DEFAULT 0,
      cost_price REAL DEFAULT 0,
      stock_quantity REAL NOT NULL DEFAULT 0,
      unit_name TEXT DEFAULT 'pcs',
      status TEXT DEFAULT 'active',
      is_weighed INTEGER DEFAULT 0,
      updated_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      customer_code TEXT,
      current_balance REAL DEFAULT 0,
      khata_enabled INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS offline_sales (
      offline_sale_id TEXT PRIMARY KEY,
      request_token TEXT,
      invoice_number TEXT,
      created_at TEXT NOT NULL,
      cashier_id INTEGER,
      cashier_name TEXT,
      customer_id INTEGER,
      customer_name TEXT,
      customer_phone TEXT,
      subtotal REAL NOT NULL,
      discount_type TEXT DEFAULT 'none',
      discount_value REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      grand_total REAL NOT NULL,
      amount_received REAL NOT NULL,
      change_returned REAL DEFAULT 0,
      payment_method TEXT DEFAULT 'cash',
      payment_status TEXT DEFAULT 'paid',
      notes TEXT,
      sync_status TEXT DEFAULT 'pending', -- pending, synced, error
      sync_error TEXT,
      synced_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sales_sync ON offline_sales(sync_status);

    CREATE TABLE IF NOT EXISTS offline_sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      offline_sale_id TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      product_code TEXT,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      line_total REAL NOT NULL,
      FOREIGN KEY(offline_sale_id) REFERENCES offline_sales(offline_sale_id) ON DELETE CASCADE
    );
  `);

  return db;
}

function getDatabase() {
  if (!db) {
    return initDatabase();
  }
  return db;
}

// ----------------- Product Operations -----------------
function upsertProducts(productsList) {
  const database = getDatabase();
  const stmt = database.prepare(`
    INSERT INTO products (id, name, code, barcode, category_id, category_name, selling_price, cost_price, stock_quantity, unit_name, status, is_weighed, updated_at)
    VALUES (@id, @name, @code, @barcode, @category_id, @category_name, @selling_price, @cost_price, @stock_quantity, @unit_name, @status, @is_weighed, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name,
      code=excluded.code,
      barcode=excluded.barcode,
      category_id=excluded.category_id,
      category_name=excluded.category_name,
      selling_price=excluded.selling_price,
      cost_price=excluded.cost_price,
      stock_quantity=excluded.stock_quantity,
      unit_name=excluded.unit_name,
      status=excluded.status,
      is_weighed=excluded.is_weighed,
      updated_at=excluded.updated_at
  `);

  const tx = database.transaction((items) => {
    for (const p of items) {
      stmt.run({
        id: p.id,
        name: p.name,
        code: p.code || '',
        barcode: p.barcode || '',
        category_id: p.category_id || null,
        category_name: p.category_name || '',
        selling_price: Number(p.selling_price || p.price || 0),
        cost_price: Number(p.cost_price || 0),
        stock_quantity: Number(p.stock_quantity || p.quantity || 0),
        unit_name: p.unit_name || 'pcs',
        status: p.status || 'active',
        is_weighed: p.is_weighed ? 1 : 0,
        updated_at: new Date().toISOString(),
      });
    }
  });

  tx(productsList);
}

function searchProducts({ query = '', category_id = null, limit = 50, page = 1 }) {
  const database = getDatabase();
  let sql = 'SELECT * FROM products WHERE status = "active"';
  const params = [];

  if (category_id) {
    sql += ' AND category_id = ?';
    params.push(category_id);
  }

  if (query && query.trim() !== '') {
    const q = `%${query.trim()}%`;
    sql += ' AND (name LIKE ? OR barcode LIKE ? OR code LIKE ?)';
    params.push(q, q, q);
  }

  // Count total
  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
  const totalRow = database.prepare(countSql).get(...params);
  const total = totalRow ? totalRow.count : 0;

  // Pagination
  sql += ' ORDER BY name ASC LIMIT ? OFFSET ?';
  const offset = (page - 1) * limit;
  params.push(limit, offset);

  const products = database.prepare(sql).all(...params);

  return {
    products,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit) || 1,
    },
  };
}

// ----------------- Sale Operations -----------------
function recordSale(saleData) {
  const database = getDatabase();

  const insertSale = database.prepare(`
    INSERT INTO offline_sales (
      offline_sale_id, request_token, invoice_number, created_at, cashier_id, cashier_name,
      customer_id, customer_name, customer_phone, subtotal, discount_type, discount_value,
      discount_amount, tax_amount, grand_total, amount_received, change_returned,
      payment_method, payment_status, notes, sync_status
    ) VALUES (
      @offline_sale_id, @request_token, @invoice_number, @created_at, @cashier_id, @cashier_name,
      @customer_id, @customer_name, @customer_phone, @subtotal, @discount_type, @discount_value,
      @discount_amount, @tax_amount, @grand_total, @amount_received, @change_returned,
      @payment_method, @payment_status, @notes, 'pending'
    )
  `);

  const insertItem = database.prepare(`
    INSERT INTO offline_sale_items (offline_sale_id, product_id, product_name, product_code, quantity, unit_price, line_total)
    VALUES (@offline_sale_id, @product_id, @product_name, @product_code, @quantity, @unit_price, @line_total)
  `);

  const deductStock = database.prepare(`
    UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?
  `);

  const tx = database.transaction((sale) => {
    insertSale.run(sale);
    for (const item of sale.items) {
      insertItem.run({
        offline_sale_id: sale.offline_sale_id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_code: item.product_code || '',
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total,
      });
      // Deduct stock in SQLite
      deductStock.run(item.quantity, item.product_id);
    }
  });

  tx(saleData);
  return { success: true, offline_sale_id: saleData.offline_sale_id };
}

function getPendingSales() {
  const database = getDatabase();
  const sales = database.prepare('SELECT * FROM offline_sales WHERE sync_status = "pending" ORDER BY created_at ASC').all();
  const getItemStmt = database.prepare('SELECT * FROM offline_sale_items WHERE offline_sale_id = ?');

  for (const sale of sales) {
    sale.items = getItemStmt.all(sale.offline_sale_id);
  }

  return sales;
}

function markSaleSynced(offlineSaleId, serverInvoiceNumber) {
  const database = getDatabase();
  database.prepare(`
    UPDATE offline_sales
    SET sync_status = 'synced',
        invoice_number = COALESCE(?, invoice_number),
        synced_at = ?
    WHERE offline_sale_id = ?
  `).run(serverInvoiceNumber, new Date().toISOString(), offlineSaleId);
}

module.exports = {
  initDatabase,
  getDatabase,
  upsertProducts,
  searchProducts,
  recordSale,
  getPendingSales,
  markSaleSynced,
};
