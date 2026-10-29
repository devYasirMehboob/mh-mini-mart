const https = require('https');
const http = require('http');
const { getPendingSales, markSaleSynced, upsertProducts } = require('./db.cjs');

function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;

    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Connection timed out'));
    });

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function checkServerOnline(apiBaseUrl) {
  try {
    const res = await fetchJson(`${apiBaseUrl}/health`, { method: 'GET' });
    return res.status === 200;
  } catch {
    return false;
  }
}

async function pushSalesToServer(apiBaseUrl, cookie) {
  const pending = getPendingSales();
  if (!pending || pending.length === 0) return { synced: 0 };

  const payload = {
    sales: pending.map((s) => ({
      offline_sale_id: s.offline_sale_id,
      request_token: s.request_token,
      created_at: s.created_at,
      items: s.items.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
      subtotal: s.subtotal,
      discount_type: s.discount_type,
      discount_value: s.discount_value,
      amount_received: s.amount_received,
      payment_method: s.payment_method,
      customer_id: s.customer_id,
      customer_name: s.customer_name,
      customer_phone: s.customer_phone,
      notes: s.notes,
    })),
  };

  try {
    const res = await fetchJson(`${apiBaseUrl}/sales/sync-offline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: payload,
    });

    if (res.status === 200 && res.data?.success) {
      const results = res.data.data?.results || [];
      for (const r of results) {
        if (r.status === 'synced') {
          markSaleSynced(r.offline_sale_id, r.invoice_number);
        }
      }
      return { synced: results.length };
    }
  } catch (err) {
    console.error('[Sync] Failed to push sales:', err.message);
  }
  return { synced: 0 };
}

async function pullProductsFromServer(apiBaseUrl, cookie) {
  try {
    const res = await fetchJson(`${apiBaseUrl}/pos/products?limit=10000`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
      },
    });

    if (res.status === 200 && res.data?.data) {
      const list = res.data.data.products || res.data.data;
      if (Array.isArray(list) && list.length > 0) {
        upsertProducts(list);
        return { count: list.length };
      }
    }
  } catch (err) {
    console.error('[Sync] Failed to pull products:', err.message);
  }
  return { count: 0 };
}

module.exports = {
  checkServerOnline,
  pushSalesToServer,
  pullProductsFromServer,
};
