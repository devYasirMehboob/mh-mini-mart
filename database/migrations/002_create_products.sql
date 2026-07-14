CREATE TABLE IF NOT EXISTS products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(150) NOT NULL,
    product_code VARCHAR(60) NOT NULL,
    barcode VARCHAR(100) NULL,
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
