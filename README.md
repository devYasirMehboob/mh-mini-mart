# MH Mini Mart

Local, offline-first point-of-sale and shop management foundation built with React, Vite, Tailwind CSS, object-oriented Core PHP, and MySQL.

## Requirements

- Node.js 20 or newer
- PHP 8.1 or newer with PDO MySQL enabled
- MySQL 8 or MariaDB 10.4+
- XAMPP (recommended for the local Apache, PHP, and MySQL environment)

## Database setup

Import `database/schema.sql` for a new installation. Existing installations should apply the SQL files in database/migrations in numeric order through 012_reconcile_stock_history.sql. Migration 012 safely records legacy quantity discrepancies as auditable stock movements.

1. Start MySQL in XAMPP.
2. Import `database/schema.sql` using phpMyAdmin or the MySQL command line.
3. Copy `backend/config/database.example.php` to `backend/config/database.local.php`.
4. Update the local file if your MySQL username or password differs from the XAMPP defaults.
5. Save the single access password using the provided local setup command:

```bash
php backend/scripts/set-access-password.php
```

The command validates the password, hashes it with password_hash(), and stores only the hash using a PDO prepared statement. The login screen accepts only this password. The plain password is never stored in React or returned by the API.

## Backend setup

The frontend expects the API at:

```text
http://localhost/mh-mini-mart-api/api
```

Point an Apache alias or a folder named `mh-mini-mart-api` at the repository's `backend` directory. Apache must allow `.htaccess` overrides so API routes are handled by `backend/api/index.php`.

For a repository served directly from `htdocs/projects/mh-mini-mart`, you can instead set the frontend URL to:

```env
VITE_API_BASE_URL=http://localhost/projects/mh-mini-mart/backend/api
```

Copy `frontend/.env.example` to `frontend/.env` and choose the URL matching your Apache setup.

Generate the optimized PHP class autoloader after backend class changes:

```bash
composer dump-autoload --optimize
```

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

Useful checks:

```bash
npm run lint
npm run build
```

## API route groups

All business routes return the shared JSON envelope, require an authenticated PHP session, and enforce backend permissions. State-changing routes also require the session CSRF token.

- Authentication: /csrf-token, /auth/login, /auth/me, /auth/logout
- Dashboard: /dashboard
- Categories and products: /categories, /products
- Inventory: /inventory and /inventory/transactions
- POS and held carts: /pos/products, /pos/categories, /held-sales
- Sales and receipts: /sales, /sales/summary, /sales/{id}/receipt
- Expenses: /expenses and /expense-categories
- Reports: /reports and /reports/export
- Users and permissions: /users, /roles, /permissions
- Settings: /settings and /settings/public
- Suppliers, purchases, payments and returns: /suppliers, /purchases, /purchase-returns
- Backups: /backups, /backups/{filename}/download, /backups/{filename}/restore

Database and internal PHP errors are logged server-side and are not exposed to clients.

## POS held sales

Held POS carts are stored in the `held_sales` and `held_sale_items` database tables. Apply `database/migrations/007_create_held_sales.sql` to an existing database before using this workflow. Holding does not create a sale, payment, stock reduction, or stock transaction. Products, prices, and stock are revalidated when a cart is resumed and again inside the final sale transaction.

## Expenses module

Existing installations must apply `database/migrations/008_create_expenses_module.sql` once. It preserves legacy expense rows, assigns them to **Other expenses**, and converts legacy recorded/cancelled statuses to active/voided. New installations already receive the final tables from `database/schema.sql`.

Expense and expense-category endpoints are admin-only. The module provides `/expenses`, `/expenses/summary`, `/expenses/export`, `/expenses/{id}`, `/expense-categories`, and `/expense-categories/{id}` plus the category status endpoint. State-changing requests require the session CSRF token. Receipts accept JPEG, PNG, or WebP files up to 2 MB and are stored under `backend/uploads/expenses` with generated filenames.

## Reports module

The Reports workspace uses real sales, historical sale-item costs, payments, refunds, active expenses, products, and stock transactions. All report endpoints require authentication. The complete financial, expense, cashier, inventory-valuation, profit, and export reports are administrator-only; a cashier API session is limited to personal sales and grouped sales reports.

Routes include `/reports/overview`, `/reports/sales`, grouped daily/weekly/monthly sales, product/category/cashier/payment reports, `/reports/expenses`, `/reports/profit`, stock/low-stock/out-of-stock, wastage, best sellers, filter options, and `/reports/export`.

Reporting rules:

- Active revenue includes only completed sales.
- Cancelled and fully refunded sales remain visible for audit counts but are excluded from active revenue and cost of goods.
- Refund amounts come from completed refund records.
- Profit uses historical `sale_items.purchase_cost`, never the current product cost.
- Net sales are subtotal less discount; tax is reported separately and excluded from the profit revenue formula, matching the current dashboard.
- Estimated net profit is net sales less historical cost of goods and active expenses.
- Voided expenses are excluded unless explicitly selected in the expense report.
- Weeks start on Monday.
- The current system supports full-sale refunds only; partial refund reporting is intentionally not estimated.
- Wastage cost impact is labelled estimated because stock transactions do not store a historical cost snapshot.

Reports print through the browser using the current filtered result and export CSV with UTF-8-compatible output. No additional chart or UI dependency is required.

## Users and permissions

Apply `database/migrations/009_create_users_permissions.sql` to upgrade the existing `access_credentials` records without breaking historical sales, expenses, refunds, held sales, or stock transactions. The migration adds user display names, last-login tracking, session versions, roles, permissions, role permissions, user allow/deny overrides, and activity logs.

Authentication remains password-only. The backend verifies the entered password against every active user hash, requires exactly one match, and never returns password hashes. Passwords are hashed with `password_hash()` and checked with `password_verify()`. New and reset passwords must contain at least six characters, must not be a common default pattern, and must be unique across all stored users so activating an inactive account can never make password-only login ambiguous.

User administration routes:

- `GET|POST /users`
- `GET|PUT|DELETE /users/{id}`
- `PATCH /users/{id}/status`
- `POST /users/{id}/reset-password`
- `GET|PUT /users/{id}/permissions`
- `GET /roles`
- `GET /permissions`
- `GET|PUT /roles/{id}/permissions`

All routes require an active authenticated session and `users.manage`. Role and status changes plus password resets increment the user session version, so previous sessions are rejected on their next protected request. The Admin role permissions and final active administrator are protected from lockout. Permanent deletion is rejected when business or audit history exists; deactivation is the normal offboarding workflow.

## Settings module

Import `database/migrations/010_create_settings.sql` after the earlier migrations. The migration creates an idempotent, typed settings store and seeds safe defaults.

- `GET /settings/public` is intentionally available without a session and returns only allow-listed cashier-safe settings.
- `GET /settings`, `PUT /settings`, `POST /settings/logo`, and `DELETE /settings/logo` require the `settings.manage` permission and CSRF protection for changes.
- Shop logos are stored under `backend/uploads/settings` as generated JPG, PNG, or WebP filenames (maximum 2 MB).
- Browser printing is the working default. QZ Tray values can be stored but require a separate future integration.
- Backup schedule and folder values are preferences for the Backups module; this page does not execute scheduled backups.
- A valid saved PHP time zone is applied at the beginning of every API request. Changes therefore affect the update response and subsequent requests immediately.

## Backups module

The Backups page creates checksummed JSON database archives in the configured safe relative folder. Backup files are denied direct Apache access and can only be listed or downloaded through authenticated API routes with backups.create. Restore additionally requires backups.restore, a matching schema fingerprint, a valid checksum, the exact RESTORE confirmation, and an automatic pre-restore safety backup.

Database backups contain sensitive password hashes and business records. Keep the backup folder private. Uploaded product images, logos, and expense receipt files are not included yet. Automatic-backup preferences require a separate Windows Task Scheduler command; the application does not claim a scheduled run occurred.

The isolated critical-flow test can be run with:

    php backend/tests/integration_audit.php

It creates and drops only the fixed mh_mini_mart_audit_test database and uses temporary backup storage.

## Purchases and suppliers

Existing installations must apply `database/migrations/011_create_purchases_suppliers.sql` after migration 010. Fresh installations receive the same supplier, purchase, payment, return, permission, sequence, and stock-transaction structures through `database/schema.sql`.

The module adds authenticated, permission-controlled supplier routes under `/suppliers`, purchase routes under `/purchases`, return routes under `/purchase-returns`, and seven purchase report endpoints under `/reports/purchases`. Purchase completion, cancellation, payments, and returns use PDO transactions. Tracked stock is posted once with linked stock history; drafts and untracked products do not create stock movements. The current product purchase cost uses the latest completed purchase unit cost, while historical purchase items preserve their original product and cost values. General expenses remain separate from inventory purchases and supplier payments.
