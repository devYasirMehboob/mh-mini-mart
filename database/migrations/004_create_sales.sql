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
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY sales_invoice_unique (invoice_number),
    UNIQUE KEY sales_request_token_unique (request_token),
    KEY sales_cashier_index (cashier_id),
    KEY sales_created_index (created_at),
    KEY sales_status_index (status),
    CONSTRAINT sales_cashier_fk FOREIGN KEY (cashier_id) REFERENCES access_credentials(id) ON UPDATE CASCADE ON DELETE RESTRICT
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
