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
