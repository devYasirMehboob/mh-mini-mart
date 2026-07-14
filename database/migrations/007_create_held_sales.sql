CREATE TABLE held_sales (
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

CREATE TABLE held_sale_items (
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
