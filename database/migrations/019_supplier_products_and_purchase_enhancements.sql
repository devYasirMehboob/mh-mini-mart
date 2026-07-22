-- Migration 019: Supplier Products Mapping and Purchase Enhancements

-- 1. Create supplier_products table
CREATE TABLE IF NOT EXISTS `supplier_products` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `supplier_id` BIGINT UNSIGNED NOT NULL,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `supplier_item_code` VARCHAR(60) NULL,
    `supplier_item_name` VARCHAR(150) NULL,
    `supplier_barcode` VARCHAR(100) NULL,
    `last_purchase_cost` DECIMAL(12,2) NULL,
    `last_purchase_unit_id` BIGINT UNSIGNED NULL,
    `last_purchase_date` DATE NULL,
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `supplier_products_unique` (`supplier_id`, `product_id`),
    KEY `supplier_products_supplier_idx` (`supplier_id`),
    KEY `supplier_products_product_idx` (`product_id`),
    KEY `supplier_products_item_code_idx` (`supplier_item_code`),
    KEY `supplier_products_barcode_idx` (`supplier_barcode`),
    KEY `supplier_products_date_idx` (`last_purchase_date`),
    CONSTRAINT `supplier_products_supplier_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT `supplier_products_product_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT `supplier_products_unit_fk` FOREIGN KEY (`last_purchase_unit_id`) REFERENCES `units`(`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Add supplier_item_description to purchase_items if missing
SET @exist := (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() AND table_name = 'purchase_items' AND column_name = 'supplier_item_description');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE purchase_items ADD COLUMN supplier_item_description VARCHAR(150) NULL AFTER product_code', 'SELECT 1');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add permission for Quick Add Product
INSERT INTO permissions (name, permission_key, module, description) VALUES
('Quick Add Product', 'purchases.quick_add_product', 'Purchases', 'Create a new product directly inside the purchase form.')
ON DUPLICATE KEY UPDATE name=VALUES(name), module=VALUES(module), description=VALUES(description);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.slug='admin' AND p.permission_key = 'purchases.quick_add_product';
