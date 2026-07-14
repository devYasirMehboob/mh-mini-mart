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
