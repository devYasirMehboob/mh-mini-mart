CREATE DATABASE IF NOT EXISTS mh_mini_mart
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE mh_mini_mart;

CREATE TABLE IF NOT EXISTS access_credentials (
    id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'cashier') NOT NULL DEFAULT 'admin',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY access_credentials_active_index (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(1000) NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY categories_name_unique (name),
    KEY categories_status_index (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(150) NOT NULL,
    product_code VARCHAR(60) NOT NULL,
    barcode VARCHAR(100) NULL,
    barcode_type VARCHAR(20) NULL,
    barcode_source VARCHAR(20) NULL,
    barcode_printed_at DATETIME NULL,
    barcode_print_count INT UNSIGNED NOT NULL DEFAULT 0,
    purchase_cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    selling_price DECIMAL(12, 2) NOT NULL,
    quantity DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    minimum_stock DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    unit_type ENUM('piece', 'pack', 'kilogram', 'gram', 'dozen', 'box', 'bottle') NOT NULL,
    image VARCHAR(255) NULL,
    track_stock TINYINT(1) NOT NULL DEFAULT 1,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY products_code_unique (product_code),
    UNIQUE KEY products_barcode_unique (barcode),
    KEY products_category_index (category_id),
    KEY products_status_index (status),
    KEY products_name_index (name),
    CONSTRAINT products_category_fk
        FOREIGN KEY (category_id) REFERENCES categories(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    user_id TINYINT UNSIGNED NOT NULL,
    transaction_type ENUM(
        'opening', 'addition', 'reduction', 'adjustment',
        'damaged', 'expired', 'wastage', 'sale', 'refund'
    ) NOT NULL,
    quantity DECIMAL(12, 3) NOT NULL,
    previous_stock DECIMAL(12, 3) NOT NULL,
    new_stock DECIMAL(12, 3) NOT NULL,
    reason VARCHAR(500) NULL,
    reference_type VARCHAR(50) NULL,
    reference_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY stock_transactions_product_index (product_id),
    KEY stock_transactions_user_index (user_id),
    KEY stock_transactions_type_index (transaction_type),
    KEY stock_transactions_created_index (created_at),
    CONSTRAINT stock_transactions_product_fk
        FOREIGN KEY (product_id) REFERENCES products(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT stock_transactions_user_fk
        FOREIGN KEY (user_id) REFERENCES access_credentials(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoice_sequences (
    sequence_date DATE NOT NULL PRIMARY KEY,
    last_number INT UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sales (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(40) NOT NULL,
    request_token VARCHAR(100) NOT NULL,
    cashier_id TINYINT UNSIGNED NOT NULL,
    customer_name VARCHAR(150) NULL,
    customer_phone VARCHAR(30) NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    discount_type ENUM('none','fixed','percentage') NOT NULL DEFAULT 'none',
    discount_value DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    grand_total DECIMAL(12,2) NOT NULL,
    amount_received DECIMAL(12,2) NOT NULL,
    change_returned DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    payment_method ENUM('cash','card','bank_transfer','mobile_wallet','other') NOT NULL,
    payment_status ENUM('paid','pending','failed','refunded') NOT NULL DEFAULT 'paid',
    status ENUM('completed','cancelled','refunded') NOT NULL DEFAULT 'completed',
    notes VARCHAR(1000) NULL,
    cancellation_reason VARCHAR(500) NULL,
    cancelled_by TINYINT UNSIGNED NULL,
    cancelled_at DATETIME NULL,
    refunded_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY sales_invoice_unique (invoice_number),
    UNIQUE KEY sales_request_token_unique (request_token),
    KEY sales_cashier_index (cashier_id),
    KEY sales_created_index (created_at),
    KEY sales_status_index (status),
    KEY sales_payment_method_index (payment_method),
    KEY sales_payment_status_index (payment_status),
    KEY sales_status_created_index (status, created_at),
    KEY sales_cashier_created_index (cashier_id, created_at),
    CONSTRAINT sales_cashier_fk FOREIGN KEY (cashier_id) REFERENCES access_credentials(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT sales_cancelled_by_fk FOREIGN KEY (cancelled_by) REFERENCES access_credentials(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sale_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sale_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    product_code VARCHAR(60) NOT NULL,
    quantity DECIMAL(12,3) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    purchase_cost DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    line_total DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY sale_items_sale_index (sale_id),
    KEY sale_items_product_index (product_id),
    CONSTRAINT sale_items_sale_fk FOREIGN KEY (sale_id) REFERENCES sales(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT sale_items_product_fk FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sale_id BIGINT UNSIGNED NOT NULL,
    payment_method ENUM('cash','card','bank_transfer','mobile_wallet','other') NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    status ENUM('paid','pending','failed','refunded') NOT NULL DEFAULT 'paid',
    reference VARCHAR(150) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY payments_sale_index (sale_id),
    KEY payments_method_index (payment_method),
    CONSTRAINT payments_sale_fk FOREIGN KEY (sale_id) REFERENCES sales(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS expense_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500) NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY expense_categories_name_unique (name),
    KEY expense_categories_status_index (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO expense_categories (name) VALUES
('Electricity'),('Gas'),('Rent'),('Employee salary'),('Ingredients'),
('Packaging'),('Equipment repair'),('Transport'),('Cleaning'),('Other expenses');

CREATE TABLE IF NOT EXISTS expenses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    expense_category_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(150) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    expense_date DATE NOT NULL,
    description VARCHAR(1000) NULL,
    receipt_image VARCHAR(255) NULL,
    payment_method ENUM('cash','card','bank_transfer','mobile_wallet','other') NOT NULL DEFAULT 'cash',
    reference_number VARCHAR(150) NULL,
    added_by TINYINT UNSIGNED NOT NULL,
    status ENUM('active','voided') NOT NULL DEFAULT 'active',
    voided_by TINYINT UNSIGNED NULL,
    voided_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY expenses_date_status_index (expense_date, status),
    KEY expenses_category_index (expense_category_id),
    KEY expenses_added_by_index (added_by),
    KEY expenses_payment_method_index (payment_method),
    KEY expenses_created_index (created_at),
    KEY expenses_voided_by_index (voided_by),
    CONSTRAINT expenses_category_fk FOREIGN KEY (expense_category_id) REFERENCES expense_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT expenses_added_by_fk FOREIGN KEY (added_by) REFERENCES access_credentials(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT expenses_voided_by_fk FOREIGN KEY (voided_by) REFERENCES access_credentials(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS refunds (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sale_id BIGINT UNSIGNED NOT NULL,
    processed_by TINYINT UNSIGNED NOT NULL,
    refund_amount DECIMAL(12,2) NOT NULL,
    refund_method ENUM('cash','card','bank_transfer','mobile_wallet','other') NOT NULL,
    reason VARCHAR(500) NOT NULL,
    status ENUM('completed','failed') NOT NULL DEFAULT 'completed',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY refunds_sale_unique (sale_id),
    KEY refunds_processed_by_index (processed_by),
    KEY refunds_created_index (created_at),
    CONSTRAINT refunds_sale_fk FOREIGN KEY (sale_id) REFERENCES sales(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT refunds_processed_by_fk FOREIGN KEY (processed_by) REFERENCES access_credentials(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS held_sales (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reference_number VARCHAR(40) NOT NULL,
    held_by TINYINT UNSIGNED NOT NULL,
    request_token VARCHAR(100) NOT NULL,
    customer_name VARCHAR(150) NULL,
    customer_phone VARCHAR(30) NULL,
    discount_type ENUM('none','fixed','percentage') NOT NULL DEFAULT 'none',
    discount_value DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    payment_method ENUM('cash','card','bank_transfer','mobile_wallet','other') NOT NULL DEFAULT 'cash',
    payment_reference VARCHAR(150) NULL,
    amount_received DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    notes VARCHAR(1000) NULL,
    status ENUM('active','completed') NOT NULL DEFAULT 'active',
    completed_sale_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY held_sales_reference_unique (reference_number),
    UNIQUE KEY held_sales_request_token_unique (request_token),
    KEY held_sales_user_status_index (held_by, status, updated_at),
    KEY held_sales_completed_sale_index (completed_sale_id),
    CONSTRAINT held_sales_user_fk FOREIGN KEY (held_by) REFERENCES access_credentials(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT held_sales_completed_sale_fk FOREIGN KEY (completed_sale_id) REFERENCES sales(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS held_sale_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    held_sale_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    product_code VARCHAR(60) NOT NULL,
    unit_price_snapshot DECIMAL(12,2) NOT NULL,
    quantity DECIMAL(12,3) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY held_sale_items_sale_index (held_sale_id),
    KEY held_sale_items_product_index (product_id),
    CONSTRAINT held_sale_items_sale_fk FOREIGN KEY (held_sale_id) REFERENCES held_sales(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT held_sale_items_product_fk FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Users and permissions module
CREATE TABLE IF NOT EXISTS roles (
    id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL,
    description VARCHAR(255) NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY roles_slug_unique (slug),
    KEY roles_status_index (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO roles (id,name,slug,description,status) VALUES
(1,'Admin','admin','Full access to shop management and security.','active'),
(2,'Cashier','cashier','Point of sale and permitted personal sales access.','active')
ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),status=VALUES(status);

ALTER TABLE access_credentials
    MODIFY id TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
    ADD COLUMN IF NOT EXISTS name VARCHAR(100) NOT NULL DEFAULT 'Shop User' AFTER id,
    ADD COLUMN IF NOT EXISTS phone VARCHAR(20) NULL DEFAULT NULL AFTER name,
    ADD COLUMN IF NOT EXISTS last_login_at DATETIME NULL AFTER is_active,
    ADD COLUMN IF NOT EXISTS session_version INT UNSIGNED NOT NULL DEFAULT 1 AFTER last_login_at,
    ADD INDEX IF NOT EXISTS access_credentials_name_index (name),
    ADD INDEX IF NOT EXISTS access_credentials_role_index (role),
    ADD INDEX IF NOT EXISTS access_credentials_last_login_index (last_login_at);

UPDATE access_credentials SET name='Admin' WHERE id=1 AND name='Shop User';

CREATE TABLE IF NOT EXISTS permissions (
    id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    permission_key VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY permissions_key_unique (permission_key),
    KEY permissions_module_index (module)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id TINYINT UNSIGNED NOT NULL,
    permission_id SMALLINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id,permission_id),
    CONSTRAINT role_permissions_role_fk FOREIGN KEY (role_id) REFERENCES roles(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT role_permissions_permission_fk FOREIGN KEY (permission_id) REFERENCES permissions(id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_permissions (
    user_id TINYINT UNSIGNED NOT NULL,
    permission_id SMALLINT UNSIGNED NOT NULL,
    effect ENUM('allow','deny') NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id,permission_id),
    CONSTRAINT user_permissions_user_fk FOREIGN KEY (user_id) REFERENCES access_credentials(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT user_permissions_permission_fk FOREIGN KEY (permission_id) REFERENCES permissions(id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    actor_user_id TINYINT UNSIGNED NULL,
    subject_user_id TINYINT UNSIGNED NULL,
    action VARCHAR(80) NOT NULL,
    description VARCHAR(255) NOT NULL,
    metadata TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY activity_logs_actor_index (actor_user_id,created_at),
    KEY activity_logs_subject_index (subject_user_id,created_at),
    KEY activity_logs_action_index (action,created_at),
    CONSTRAINT activity_logs_actor_fk FOREIGN KEY (actor_user_id) REFERENCES access_credentials(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT activity_logs_subject_fk FOREIGN KEY (subject_user_id) REFERENCES access_credentials(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO permissions (name,permission_key,module,description) VALUES
('View dashboard','dashboard.view','Dashboard','Open the shop dashboard.'),
('Access POS','pos.access','POS','Open the point of sale.'),
('View sales','sales.view','Sales','View permitted sales.'),
('View all sales','sales.view_all','Sales','View sales from every cashier.'),
('Complete sales','sales.complete','Sales','Complete point-of-sale transactions.'),
('Hold sales','sales.hold','Sales','Hold and resume point-of-sale carts.'),
('Cancel sales','sales.cancel','Sales','Cancel completed sales.'),
('Process refunds','sales.refund','Sales','Process sale refunds.'),
('Reprint receipts','sales.reprint','Sales','View and print permitted receipts.'),
('View products','products.view','Products','View the product catalogue.'),
('Create products','products.create','Products','Create products.'),
('Update products','products.update','Products','Edit products and status.'),
('Delete products','products.delete','Products','Delete unused products.'),
('View purchase costs','products.costs.view','Products','View product costs and margins.'),
('Manage categories','categories.manage','Categories','Create, edit and deactivate categories.'),
('View inventory','inventory.view','Inventory','View stock levels and history.'),
('Adjust inventory','inventory.adjust','Inventory','Perform manual stock changes.'),
('View expenses','expenses.view','Expenses','View shop expenses.'),
('Manage expenses','expenses.manage','Expenses','Create, edit and void expenses.'),
('View reports','reports.view','Reports','Open operational reports.'),
('View profit reports','reports.profit','Reports','View profit, cost and margin data.'),
('Export reports','reports.export','Reports','Export reporting data.'),
('Manage users','users.manage','Users','Manage users, roles and permissions.'),
('Manage settings','settings.manage','Settings','Change shop settings.'),
('Create backups','backups.create','Backups','Create local backups.'),
('Restore backups','backups.restore','Backups','Restore a backup.'),
('View activity logs','activity_logs.view','Activity Logs','View security and user activity.'),
('Generate barcodes','barcodes.generate','Products','Generate or manually assign barcodes.'),
('Print labels','labels.print','Products','Print product barcode labels.')
ON DUPLICATE KEY UPDATE name=VALUES(name),module=VALUES(module),description=VALUES(description);

INSERT IGNORE INTO role_permissions (role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.slug='admin';

INSERT IGNORE INTO role_permissions (role_id,permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p ON p.permission_key IN
('pos.access','sales.view','sales.complete','sales.hold','sales.reprint','labels.print') WHERE r.slug='cashier';
CREATE TABLE IF NOT EXISTS settings (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 setting_group VARCHAR(40) NOT NULL,
 setting_key VARCHAR(80) NOT NULL,
 setting_value TEXT NULL,
 value_type ENUM('string','integer','decimal','boolean','json') NOT NULL DEFAULT 'string',
 is_public TINYINT(1) NOT NULL DEFAULT 0,
 updated_by TINYINT UNSIGNED NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uq_settings_group_key (setting_group,setting_key),
 KEY idx_settings_public (is_public),
 CONSTRAINT fk_settings_updated_by FOREIGN KEY (updated_by) REFERENCES access_credentials(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO settings (setting_group,setting_key,setting_value,value_type,is_public) VALUES
('shop','shop_name','MH Mini Mart','string',1),('shop','logo','','string',1),('shop','address','','string',1),('shop','phone','','string',1),('shop','email','','string',1),('shop','registration_number','','string',1),('shop','default_customer_name','Walk-in Customer','string',1),('shop','receipt_footer','Thank you for shopping with us.','string',1),('shop','return_policy','Please keep your receipt for returns.','string',1),
('localization','currency_code','PKR','string',1),('localization','currency_symbol','Rs.','string',1),('localization','currency_position','before','string',1),('localization','decimal_places','2','integer',1),('localization','thousand_separator',',','string',1),('localization','decimal_separator','.','string',1),('localization','timezone','Asia/Karachi','string',1),('localization','date_format','d-m-Y','string',1),('localization','time_format','12','string',1),('localization','first_day_of_week','monday','string',1),
('tax','enabled','0','boolean',1),('tax','name','Tax','string',1),('tax','percentage','0','decimal',1),('tax','calculation_mode','after_discount','string',1),('tax','show_on_receipt','1','boolean',1),
('discounts','enabled','1','boolean',1),('discounts','default_type','fixed','string',1),('discounts','default_value','0','decimal',1),('discounts','maximum_cashier_discount','10','decimal',1),('discounts','allow_cashier_discounts','1','boolean',1),('discounts','require_admin_above_limit','1','boolean',1),
('inventory','global_tracking_enabled','1','boolean',1),('inventory','default_minimum_stock','5','decimal',1),('inventory','allow_negative_stock','0','boolean',1),('inventory','low_stock_alerts','1','boolean',1),('inventory','out_of_stock_alerts','1','boolean',1),('inventory','wastage_tracking','1','boolean',1),('inventory','expiry_tracking','0','boolean',1),
('barcode','enabled','1','boolean',1),('barcode','auto_focus','1','boolean',1),('barcode','auto_add','1','boolean',1),('barcode','input_timeout_ms','250','integer',1),
('label','default_width','40','integer',1),('label','default_height','30','integer',1),('label','labels_per_row','1','integer',1),('label','gap_x','2','decimal',1),('label','gap_y','2','decimal',1),('label','print_method','browser','string',0),
('customers','enabled','1','boolean',1),('customers','use_walk_in','1','boolean',1),('customers','require_phone','0','boolean',1),('customers','save_optional_information','1','boolean',1),
('receipt','paper_width','80mm','string',1),('receipt','show_logo','1','boolean',1),('receipt','show_customer','1','boolean',1),('receipt','show_cashier','1','boolean',1),('receipt','show_tax','1','boolean',1),('receipt','show_discount','1','boolean',1),('receipt','show_payment_method','1','boolean',1),('receipt','show_change','1','boolean',1),('receipt','auto_print','0','boolean',1),
('printer','printer_name','','string',0),('printer','printing_method','browser','string',0),('printer','direct_printing_enabled','0','boolean',0),('printer','copies','1','integer',0),
('security','inactivity_timeout_minutes','30','integer',0),('security','automatic_logout','1','boolean',0),('security','require_password_for_sensitive_actions','0','boolean',0),
('backups','backup_folder','backups','string',0),('backups','retention_days','30','integer',0),('backups','automatic_backup','0','boolean',0),('backups','automatic_backup_time','02:00','string',0),('backups','cloud_folder','','string',0),('backups','timestamp_filenames','1','boolean',0);

-- Purchase and supplier management
ALTER TABLE stock_transactions MODIFY transaction_type ENUM(
 'opening','addition','reduction','adjustment','damaged','expired','wastage','sale','refund',
 'purchase','purchase_return','purchase_cancel'
) NOT NULL;

CREATE TABLE IF NOT EXISTS suppliers (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(150) NOT NULL,
 contact_person VARCHAR(120) NULL,
 phone VARCHAR(30) NULL,
 alternate_phone VARCHAR(30) NULL,
 email VARCHAR(150) NULL,
 address VARCHAR(500) NULL,
 opening_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
 current_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
 notes VARCHAR(1000) NULL,
 status ENUM('active','inactive') NOT NULL DEFAULT 'active',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY suppliers_name_unique (name),
 KEY suppliers_status_index (status),
 KEY suppliers_phone_index (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_sequences (
 sequence_date DATE PRIMARY KEY,
 last_number INT UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_return_sequences (
 sequence_date DATE PRIMARY KEY,
 last_number INT UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchases (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 purchase_number VARCHAR(40) NOT NULL,
 request_token CHAR(36) NOT NULL,
 supplier_id BIGINT UNSIGNED NOT NULL,
 supplier_invoice_number VARCHAR(100) NULL,
 purchase_date DATE NOT NULL,
 subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
 discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
 tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
 shipping_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
 other_charges DECIMAL(12,2) NOT NULL DEFAULT 0.00,
 grand_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
 amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0.00,
 balance_due DECIMAL(12,2) NOT NULL DEFAULT 0.00,
 payment_status ENUM('unpaid','partially_paid','paid') NOT NULL DEFAULT 'unpaid',
 purchase_status ENUM('draft','completed','cancelled','partially_returned','returned') NOT NULL DEFAULT 'draft',
 notes VARCHAR(1000) NULL,
 created_by TINYINT UNSIGNED NOT NULL,
 cancelled_by TINYINT UNSIGNED NULL,
 cancellation_reason VARCHAR(500) NULL,
 cancelled_at DATETIME NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY purchases_number_unique (purchase_number),
 UNIQUE KEY purchases_token_unique (request_token),
 UNIQUE KEY purchases_supplier_invoice_unique (supplier_id,supplier_invoice_number),
 KEY purchases_supplier_index (supplier_id,purchase_date),
 KEY purchases_status_index (purchase_status,payment_status),
 KEY purchases_date_index (purchase_date),
 CONSTRAINT purchases_supplier_fk FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
 CONSTRAINT purchases_created_by_fk FOREIGN KEY (created_by) REFERENCES access_credentials(id) ON UPDATE CASCADE ON DELETE RESTRICT,
 CONSTRAINT purchases_cancelled_by_fk FOREIGN KEY (cancelled_by) REFERENCES access_credentials(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_items (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 purchase_id BIGINT UNSIGNED NOT NULL,
 product_id BIGINT UNSIGNED NOT NULL,
 product_name VARCHAR(150) NOT NULL,
 product_code VARCHAR(60) NOT NULL,
 quantity DECIMAL(12,3) NOT NULL,
 unit_cost DECIMAL(12,2) NOT NULL,
 line_discount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
 tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
 line_total DECIMAL(12,2) NOT NULL,
 returned_quantity DECIMAL(12,3) NOT NULL DEFAULT 0.000,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY purchase_items_purchase_product_unique (purchase_id,product_id),
 KEY purchase_items_product_index (product_id),
 CONSTRAINT purchase_items_purchase_fk FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON UPDATE CASCADE ON DELETE CASCADE,
 CONSTRAINT purchase_items_product_fk FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_payments (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 purchase_id BIGINT UNSIGNED NOT NULL,
 supplier_id BIGINT UNSIGNED NOT NULL,
 amount DECIMAL(12,2) NOT NULL,
 payment_method ENUM('cash','card','bank_transfer','mobile_wallet','other') NOT NULL,
 reference_number VARCHAR(150) NULL,
 payment_date DATE NOT NULL,
 notes VARCHAR(500) NULL,
 paid_by TINYINT UNSIGNED NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY purchase_payments_purchase_index (purchase_id,payment_date),
 KEY purchase_payments_supplier_index (supplier_id,payment_date),
 CONSTRAINT purchase_payments_purchase_fk FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON UPDATE CASCADE ON DELETE RESTRICT,
 CONSTRAINT purchase_payments_supplier_fk FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
 CONSTRAINT purchase_payments_user_fk FOREIGN KEY (paid_by) REFERENCES access_credentials(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_returns (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 return_number VARCHAR(40) NOT NULL,
 purchase_id BIGINT UNSIGNED NOT NULL,
 supplier_id BIGINT UNSIGNED NOT NULL,
 return_date DATE NOT NULL,
 subtotal DECIMAL(12,2) NOT NULL,
 refund_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
 balance_adjustment DECIMAL(12,2) NOT NULL,
 reason VARCHAR(500) NOT NULL,
 status ENUM('completed') NOT NULL DEFAULT 'completed',
 processed_by TINYINT UNSIGNED NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY purchase_returns_number_unique (return_number),
 KEY purchase_returns_purchase_index (purchase_id,return_date),
 KEY purchase_returns_supplier_index (supplier_id,return_date),
 CONSTRAINT purchase_returns_purchase_fk FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON UPDATE CASCADE ON DELETE RESTRICT,
 CONSTRAINT purchase_returns_supplier_fk FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
 CONSTRAINT purchase_returns_user_fk FOREIGN KEY (processed_by) REFERENCES access_credentials(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_return_items (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 purchase_return_id BIGINT UNSIGNED NOT NULL,
 purchase_item_id BIGINT UNSIGNED NOT NULL,
 product_id BIGINT UNSIGNED NOT NULL,
 quantity DECIMAL(12,3) NOT NULL,
 unit_cost DECIMAL(12,2) NOT NULL,
 line_total DECIMAL(12,2) NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY purchase_return_items_return_index (purchase_return_id),
 KEY purchase_return_items_product_index (product_id),
 CONSTRAINT purchase_return_items_return_fk FOREIGN KEY (purchase_return_id) REFERENCES purchase_returns(id) ON UPDATE CASCADE ON DELETE CASCADE,
 CONSTRAINT purchase_return_items_purchase_item_fk FOREIGN KEY (purchase_item_id) REFERENCES purchase_items(id) ON UPDATE CASCADE ON DELETE RESTRICT,
 CONSTRAINT purchase_return_items_product_fk FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO permissions (name,permission_key,module,description) VALUES
('View suppliers','suppliers.view','Suppliers','View suppliers and statements.'),
('Manage suppliers','suppliers.manage','Suppliers','Create, edit and deactivate suppliers.'),
('View purchases','purchases.view','Purchases','View purchase bills and returns.'),
('Create purchases','purchases.create','Purchases','Create draft and completed purchases.'),
('Update purchases','purchases.update','Purchases','Edit and complete draft purchases.'),
('Cancel purchases','purchases.cancel','Purchases','Cancel eligible completed purchases.'),
('Pay suppliers','purchases.pay','Purchases','Record supplier payments.'),
('Return purchases','purchases.return','Purchases','Process purchase returns.'),
('Export purchases','purchases.export','Purchases','Export purchase history.')
ON DUPLICATE KEY UPDATE name=VALUES(name),module=VALUES(module),description=VALUES(description);

INSERT IGNORE INTO role_permissions (role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
WHERE r.slug='admin' AND p.module IN ('Suppliers','Purchases');
CREATE TABLE IF NOT EXISTS notifications (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 notification_type VARCHAR(100) NOT NULL,
 severity ENUM('info', 'success', 'warning', 'critical') NOT NULL DEFAULT 'info',
 title VARCHAR(255) NOT NULL,
 message VARCHAR(1000) NOT NULL,
 module VARCHAR(100) NULL,
 related_type VARCHAR(100) NULL,
 related_id BIGINT UNSIGNED NULL,
 action_url VARCHAR(500) NULL,
 source_key VARCHAR(150) NULL,
 status ENUM('unread', 'read', 'dismissed', 'resolved') NOT NULL DEFAULT 'unread',
 is_system_generated TINYINT(1) NOT NULL DEFAULT 1,
 created_by TINYINT UNSIGNED NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 resolved_at TIMESTAMP NULL,
 expires_at TIMESTAMP NULL,
 metadata_json JSON NULL,
 UNIQUE KEY notifications_source_key_unique (source_key),
 KEY notifications_type_index (notification_type),
 KEY notifications_severity_index (severity),
 KEY notifications_status_index (status),
 KEY notifications_created_at_index (created_at),
 CONSTRAINT notifications_created_by_fk FOREIGN KEY (created_by) REFERENCES access_credentials(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification_recipients (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 notification_id BIGINT UNSIGNED NOT NULL,
 user_id TINYINT UNSIGNED NOT NULL,
 read_at TIMESTAMP NULL,
 dismissed_at TIMESTAMP NULL,
 delivered_at TIMESTAMP NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY notification_recipients_unique (notification_id, user_id),
 KEY notification_recipients_user_read_index (user_id, read_at),
 CONSTRAINT notification_recipients_notification_fk FOREIGN KEY (notification_id) REFERENCES notifications(id) ON UPDATE CASCADE ON DELETE CASCADE,
 CONSTRAINT notification_recipients_user_fk FOREIGN KEY (user_id) REFERENCES access_credentials(id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification_preferences (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id TINYINT UNSIGNED NOT NULL,
 notification_type VARCHAR(100) NOT NULL,
 in_app_enabled TINYINT(1) NOT NULL DEFAULT 1,
 sound_enabled TINYINT(1) NOT NULL DEFAULT 1,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY notification_preferences_unique (user_id, notification_type),
 CONSTRAINT notification_preferences_user_fk FOREIGN KEY (user_id) REFERENCES access_credentials(id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO permissions (name, permission_key, module, description) VALUES 
('View notifications', 'notifications.view', 'System', 'View system and business notifications.'),
('Manage notifications', 'notifications.manage', 'System', 'Manage and dismiss notifications globally.'),
('Resolve alerts', 'notifications.resolve', 'System', 'Manually resolve system alerts.'),
('Announcements', 'notifications.announce', 'System', 'Create manual announcements for users.'),
('Manage preferences', 'notifications.preferences', 'System', 'Update personal notification preferences.'),
('Evaluate alerts', 'notifications.evaluate', 'System', 'Trigger system alert evaluation manually.');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.slug = 'admin' AND p.permission_key LIKE 'notifications.%';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.slug = 'cashier' AND p.permission_key IN ('notifications.view', 'notifications.preferences');
