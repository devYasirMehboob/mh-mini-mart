ALTER TABLE sales
    ADD COLUMN cancellation_reason VARCHAR(500) NULL AFTER notes,
    ADD COLUMN cancelled_by TINYINT UNSIGNED NULL AFTER cancellation_reason,
    ADD COLUMN cancelled_at DATETIME NULL AFTER cancelled_by,
    ADD COLUMN refunded_at DATETIME NULL AFTER cancelled_at,
    ADD KEY sales_payment_method_index (payment_method),
    ADD KEY sales_payment_status_index (payment_status),
    ADD KEY sales_status_created_index (status, created_at),
    ADD KEY sales_cashier_created_index (cashier_id, created_at),
    ADD CONSTRAINT sales_cancelled_by_fk FOREIGN KEY (cancelled_by)
        REFERENCES access_credentials(id) ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE TABLE refunds (
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
