# Implementation Walkthrough — MH Mini Mart Offline Emergency Mode

A complete **Offline Emergency Mode** fallback system has been implemented for MH Mini Mart. When the internet connection or local Apache API server is unreachable, store operations continue seamlessly.

---

## 1. Accomplished Work & Architectural Enhancements

### A. Database Migration & Transaction Safety
- **Migration `018_offline_emergency_mode.sql`**: Added `offline_sale_id VARCHAR(64) UNIQUE NULL` to the `sales` table.
- **Repository (`SaleRepository.php`)**: Added `findByOfflineSaleId()` method to detect already-synced offline transactions.
- **Service (`SaleService.php`)**: Created `syncOfflineSales()` method. Uses full PDO database transactions and `FOR UPDATE` row-locking to ensure stock deductions are accurate, preventing duplicate sales or double inventory reduction.

### B. Backend Controller & API Endpoint
- **Endpoint `POST /sales/sync-offline`**: Registered in `backend/api/index.php` with authorization checks (`sales.complete`). Receives batch offline sales, processes each inside isolated transactions, and returns itemized success/conflict reports.
- **Health Check Endpoint `GET /health`**: Verified to support connectivity probes.

### C. PWA & Service Worker App-Shell Caching
- **`manifest.json`**: Created Web App Manifest for PWA installation (`display: standalone`).
- **`sw.js`**: Created Service Worker with network-first strategy for navigation routes (`/login`, `/dashboard`, `/pos`, `/sales`), serving cached SPA entry fallback when offline, while strictly bypassing `/api/*` requests.

### D. Client-Side Storage & Web Crypto Security (`idb.js`)
- **IndexedDB Stores**:
  1. `offline_config`: Holds terminal device registration, 7-day expiration, and PBKDF2/SHA-256 salted PIN hash.
  2. `products_cache`: Stores active products for barcode scanning and POS search. *Excludes purchase cost to keep financial data secure.*
  3. `offline_sales`: Holds pending, synced, and conflict offline sales records.
- **Web Crypto API**: Implemented salted SHA-256 hashing for the 6–8 digit Offline PIN. Never saves plain text passwords or PINs.

### E. Frontend Offline Management & Page Integrations
- **`OfflineContext.jsx` & `useOffline.js`**: Real-time network probe, periodic health check pinging, auto-sync when online, and IndexedDB state management.
- **`OfflineBanner.jsx`**: Global banner informing staff when offline mode is active or when offline sales are pending sync.
- **`LoginPage.jsx`**: Added "Emergency Offline PIN" tab. Supports 6–8 digit PIN login with 5-attempt rate-limiting lockout and 7-day expiration enforcement.
- **`DashboardPage.jsx`**: Renders dedicated Offline Emergency Dashboard showing local IndexedDB metrics (cached products, today's offline sales amount/count, pending syncs, conflicts) with disclaimer banners.
- **`PosPage.jsx`**:
  - Automatically loads cached products from IndexedDB when offline.
  - Enforces Cash-only payments during offline emergency mode.
  - Generates unique `offline_sale_id`, deducts local stock in IndexedDB immediately, saves sale, and opens receipt preview.
- **`ReceiptPreview.jsx`**: Displays prominent `*** Offline Sale — Pending Sync ***` watermark on receipts printed while offline.
- **`SalesPage.jsx`**: Displays offline sales history with status indicators (`pending`, `synced`, `conflict`), receipt reprinting, and manual sync triggering.
- **`SettingsPage.jsx` & `OfflineSettingsForm.jsx`**: Added "Offline Emergency" tab in Settings to set/update 6–8 digit PIN, device authorization, and manual catalog cache sync.

---

## 2. Verification & Build Results

### PHP Backend Syntax Checks
- `php -l` executed on:
  - `backend/controllers/SaleController.php` (No syntax errors)
  - `backend/services/SaleService.php` (No syntax errors)
  - `backend/repositories/SaleRepository.php` (No syntax errors)
  - `backend/validators/SaleValidator.php` (No syntax errors)
  - `backend/api/index.php` (No syntax errors)

### Frontend Production Build
- `npm run build` executed cleanly:
  - Transformed 2017 modules.
  - Outputted `dist/assets/index-CaMczrS8.js` and `dist/index.html` without errors.

---

## 3. Summary of Files Changed

| File | Type | Purpose |
| --- | --- | --- |
| `database/migrations/018_offline_emergency_mode.sql` | NEW | SQL schema migration adding `offline_sale_id` UNIQUE constraint |
| `backend/repositories/SaleRepository.php` | MODIFIED | Added `findByOfflineSaleId()` and updated `create()` |
| `backend/validators/SaleValidator.php` | MODIFIED | Added `offline_sale_id` field validation |
| `backend/services/SaleService.php` | MODIFIED | Added idempotent `syncOfflineSales()` transaction method |
| `backend/controllers/SaleController.php` | MODIFIED | Added `syncOffline()` controller handler |
| `backend/api/index.php` | MODIFIED | Registered `POST /sales/sync-offline` API route |
| `frontend/public/manifest.json` | NEW | PWA manifest definition |
| `frontend/public/sw.js` | NEW | Service Worker for offline app-shell caching |
| `frontend/index.html` | MODIFIED | Manifest link and Service Worker registration |
| `frontend/src/utils/idb.js` | NEW | IndexedDB wrapper & Web Crypto PIN hashing |
| `frontend/src/context/OfflineContext.jsx` | NEW | Offline context provider, health ping, auto-sync |
| `frontend/src/hooks/useOffline.js` | NEW | Custom hook for consuming OfflineContext |
| `frontend/src/components/common/OfflineBanner.jsx` | NEW | Header banner for offline status & sync notifications |
| `frontend/src/App.jsx` | MODIFIED | Wrapped app with `OfflineProvider` & `OfflineBanner` |
| `frontend/src/routes/ProtectedRoute.jsx` | MODIFIED | Extended auth check for offline emergency sessions |
| `frontend/src/routes/PermissionRoute.jsx` | MODIFIED | Scoped navigation paths during offline emergency mode |
| `frontend/src/pages/LoginPage.jsx` | MODIFIED | Added Offline PIN login tab with lockout protection |
| `frontend/src/pages/DashboardPage.jsx` | MODIFIED | Rendered Offline Emergency Dashboard view with IndexedDB metrics |
| `frontend/src/pages/PosPage.jsx` | MODIFIED | IndexedDB product fallback, Cash enforcement, local stock deduction |
| `frontend/src/components/sales/ReceiptPreview.jsx` | MODIFIED | Rendered `*** Offline Sale — Pending Sync ***` receipt watermark |
| `frontend/src/pages/SalesPage.jsx` | MODIFIED | Added offline sales listing and local receipt reprinting |
| `frontend/src/components/settings/settingsConfig.js` | MODIFIED | Added "Offline Emergency" section configuration |
| `frontend/src/components/settings/OfflineSettingsForm.jsx` | NEW | Form for setting PIN, authorization, and product cache sync |
| `frontend/src/pages/SettingsPage.jsx` | MODIFIED | Embedded `OfflineSettingsForm` tab |
