-- Migration 014: Unit Conversion and Weighted Products System

-- 1. Create units table
CREATE TABLE IF NOT EXISTS `units` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL,
    `symbol` VARCHAR(20) NOT NULL,
    `unit_type` ENUM('weight', 'volume', 'count', 'length', 'custom') NOT NULL,
    `precision` INT UNSIGNED NOT NULL DEFAULT 0,
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `units_name_unique` (`name`),
    UNIQUE KEY `units_symbol_unique` (`symbol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default system units
INSERT IGNORE INTO `units` (`id`, `name`, `symbol`, `unit_type`, `precision`) VALUES
(1, 'Gram', 'g', 'weight', 0),
(2, 'Kilogram', 'kg', 'weight', 3),
(3, 'Millilitre', 'ml', 'volume', 0),
(4, 'Litre', 'L', 'volume', 3),
(5, 'Piece', 'pc', 'count', 0),
(6, 'Pack', 'pack', 'count', 0),
(7, 'Box', 'box', 'count', 0),
(8, 'Dozen', 'dz', 'count', 0),
(9, 'Bag', 'bag', 'weight', 0);

-- 2. Create product_units table
CREATE TABLE IF NOT EXISTS `product_units` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `unit_id` BIGINT UNSIGNED NOT NULL,
    `conversion_to_base` DECIMAL(18,6) NOT NULL DEFAULT 1.000000,
    `is_base_unit` TINYINT(1) NOT NULL DEFAULT 0,
    `is_purchase_unit` TINYINT(1) NOT NULL DEFAULT 0,
    `is_sale_unit` TINYINT(1) NOT NULL DEFAULT 0,
    `selling_price` DECIMAL(12,2) NULL,
    `purchase_cost` DECIMAL(12,2) NULL,
    `barcode` VARCHAR(100) NULL,
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `product_units_product_unit_unique` (`product_id`, `unit_id`),
    UNIQUE KEY `product_units_barcode_unique` (`barcode`),
    CONSTRAINT `product_units_product_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT `product_units_unit_fk` FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 3. Modify products table
ALTER TABLE `products`
    CHANGE `quantity` `stock_quantity_base` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    ADD COLUMN `base_unit_id` BIGINT UNSIGNED NULL AFTER `selling_price`,
    ADD COLUMN `default_purchase_unit_id` BIGINT UNSIGNED NULL AFTER `base_unit_id`,
    ADD COLUMN `default_sale_unit_id` BIGINT UNSIGNED NULL AFTER `default_purchase_unit_id`,
    ADD COLUMN `allow_weighted_sale` TINYINT(1) NOT NULL DEFAULT 0 AFTER `default_sale_unit_id`;

ALTER TABLE `products`
    ADD CONSTRAINT `products_base_unit_fk` FOREIGN KEY (`base_unit_id`) REFERENCES `units`(`id`) ON DELETE SET NULL,
    ADD CONSTRAINT `products_default_purchase_unit_fk` FOREIGN KEY (`default_purchase_unit_id`) REFERENCES `units`(`id`) ON DELETE SET NULL,
    ADD CONSTRAINT `products_default_sale_unit_fk` FOREIGN KEY (`default_sale_unit_id`) REFERENCES `units`(`id`) ON DELETE SET NULL;


-- 4. Migrate existing product data (Convert kg to g)
-- For products that were 'kilogram', convert stock_quantity_base by multiplying by 1000
UPDATE `products` SET `stock_quantity_base` = `stock_quantity_base` * 1000, `purchase_cost` = `purchase_cost` / 1000, `selling_price` = `selling_price` / 1000 WHERE `unit_type` = 'kilogram';
UPDATE `products` SET `stock_quantity_base` = `stock_quantity_base` * 1000, `purchase_cost` = `purchase_cost` / 1000, `selling_price` = `selling_price` / 1000 WHERE `unit_type` = 'bottle' OR `unit_type` = 'litre'; -- Assuming volume

-- Map unit types to base_unit_id
UPDATE `products` SET `base_unit_id` = 1, `default_purchase_unit_id` = 2, `default_sale_unit_id` = 2, `allow_weighted_sale` = 1 WHERE `unit_type` IN ('kilogram', 'gram');
UPDATE `products` SET `base_unit_id` = 3, `default_purchase_unit_id` = 4, `default_sale_unit_id` = 4, `allow_weighted_sale` = 1 WHERE `unit_type` IN ('bottle', 'litre');
UPDATE `products` SET `base_unit_id` = 5, `default_purchase_unit_id` = 5, `default_sale_unit_id` = 5, `allow_weighted_sale` = 0 WHERE `unit_type` IN ('piece', 'pack', 'dozen', 'box');
-- Fallback
UPDATE `products` SET `base_unit_id` = 5, `default_purchase_unit_id` = 5, `default_sale_unit_id` = 5 WHERE `base_unit_id` IS NULL;

-- Create default product_units for existing products (Base units)
INSERT IGNORE INTO `product_units` (`product_id`, `unit_id`, `conversion_to_base`, `is_base_unit`, `is_purchase_unit`, `is_sale_unit`, `status`)
SELECT `id`, `base_unit_id`, 1.000000, 1, 1, 1, 'active' FROM `products` WHERE `base_unit_id` IS NOT NULL;

-- Create default product_units for existing products (Default Sale units if different from base)
INSERT IGNORE INTO `product_units` (`product_id`, `unit_id`, `conversion_to_base`, `is_base_unit`, `is_purchase_unit`, `is_sale_unit`, `status`)
SELECT `id`, `default_sale_unit_id`, 1000.000000, 0, 1, 1, 'active' 
FROM `products` 
WHERE `base_unit_id` = 1 AND `default_sale_unit_id` = 2; -- Gram to Kg

-- Now remove the old unit_type column
ALTER TABLE `products` DROP COLUMN `unit_type`;


-- 5. Modify transactions and item tables
-- sale_items
ALTER TABLE `sale_items`
    CHANGE `quantity` `quantity_base` DECIMAL(12,3) NOT NULL,
    ADD COLUMN `unit_id` BIGINT UNSIGNED NULL AFTER `product_code`,
    ADD COLUMN `unit_name_snapshot` VARCHAR(50) NULL AFTER `unit_id`,
    ADD COLUMN `unit_symbol_snapshot` VARCHAR(20) NULL AFTER `unit_name_snapshot`,
    ADD COLUMN `quantity_entered` DECIMAL(12,3) NOT NULL DEFAULT 0.000 AFTER `unit_symbol_snapshot`,
    ADD COLUMN `conversion_to_base_snapshot` DECIMAL(18,6) NOT NULL DEFAULT 1.000000 AFTER `quantity_entered`;

-- Update existing sale_items to map legacy quantity to quantity_entered/base
UPDATE `sale_items` si
JOIN `products` p ON si.product_id = p.id
SET si.quantity_entered = si.quantity_base, si.unit_id = p.base_unit_id, si.unit_name_snapshot = (SELECT name FROM units WHERE id = p.base_unit_id), si.unit_symbol_snapshot = (SELECT symbol FROM units WHERE id = p.base_unit_id);

-- purchase_items
ALTER TABLE `purchase_items`
    CHANGE `quantity` `quantity_base` DECIMAL(12,3) NOT NULL,
    ADD COLUMN `unit_id` BIGINT UNSIGNED NULL AFTER `product_code`,
    ADD COLUMN `unit_name_snapshot` VARCHAR(50) NULL AFTER `unit_id`,
    ADD COLUMN `unit_symbol_snapshot` VARCHAR(20) NULL AFTER `unit_name_snapshot`,
    ADD COLUMN `quantity_entered` DECIMAL(12,3) NOT NULL DEFAULT 0.000 AFTER `unit_symbol_snapshot`,
    ADD COLUMN `conversion_to_base_snapshot` DECIMAL(18,6) NOT NULL DEFAULT 1.000000 AFTER `quantity_entered`;

UPDATE `purchase_items` pi
JOIN `products` p ON pi.product_id = p.id
SET pi.quantity_entered = pi.quantity_base, pi.unit_id = p.base_unit_id, pi.unit_name_snapshot = (SELECT name FROM units WHERE id = p.base_unit_id), pi.unit_symbol_snapshot = (SELECT symbol FROM units WHERE id = p.base_unit_id);

-- purchase_return_items
ALTER TABLE `purchase_return_items`
    CHANGE `quantity` `quantity_base` DECIMAL(12,3) NOT NULL,
    ADD COLUMN `unit_id` BIGINT UNSIGNED NULL AFTER `product_id`,
    ADD COLUMN `unit_name_snapshot` VARCHAR(50) NULL AFTER `unit_id`,
    ADD COLUMN `unit_symbol_snapshot` VARCHAR(20) NULL AFTER `unit_name_snapshot`,
    ADD COLUMN `quantity_entered` DECIMAL(12,3) NOT NULL DEFAULT 0.000 AFTER `unit_symbol_snapshot`,
    ADD COLUMN `conversion_to_base_snapshot` DECIMAL(18,6) NOT NULL DEFAULT 1.000000 AFTER `quantity_entered`;

-- stock_transactions
ALTER TABLE `stock_transactions`
    CHANGE `quantity` `quantity_base` DECIMAL(12,3) NOT NULL,
    CHANGE `previous_stock` `previous_stock_base` DECIMAL(12,3) NOT NULL,
    CHANGE `new_stock` `new_stock_base` DECIMAL(12,3) NOT NULL,
    ADD COLUMN `unit_id` BIGINT UNSIGNED NULL AFTER `transaction_type`,
    ADD COLUMN `unit_name_snapshot` VARCHAR(50) NULL AFTER `unit_id`,
    ADD COLUMN `quantity_entered` DECIMAL(12,3) NOT NULL DEFAULT 0.000 AFTER `unit_name_snapshot`,
    ADD COLUMN `conversion_to_base_snapshot` DECIMAL(18,6) NOT NULL DEFAULT 1.000000 AFTER `quantity_entered`;

-- Update stock_transactions legacy records
UPDATE `stock_transactions` st
JOIN `products` p ON st.product_id = p.id
SET st.quantity_entered = st.quantity_base, st.unit_id = p.base_unit_id, st.unit_name_snapshot = (SELECT name FROM units WHERE id = p.base_unit_id);

-- product_batches
ALTER TABLE `product_batches`
    CHANGE `received_quantity` `received_quantity_base` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    CHANGE `remaining_quantity` `remaining_quantity_base` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    CHANGE `reserved_quantity` `reserved_quantity_base` DECIMAL(12,3) NOT NULL DEFAULT 0.000;

-- sale_item_batches
ALTER TABLE `sale_item_batches`
    CHANGE `quantity` `quantity_base` DECIMAL(12,3) NOT NULL;

-- Add Permissions
INSERT IGNORE INTO `permissions` (`name`, `description`) VALUES
('units.view', 'View unit definitions'),
('units.manage', 'Manage unit definitions'),
('product_units.view', 'View product units'),
('product_units.manage', 'Manage product units');

-- Assign to Admin role
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `roles` r, `permissions` p
WHERE r.name = 'admin' AND p.name IN ('units.view', 'units.manage', 'product_units.view', 'product_units.manage');

-- held_sale_items
ALTER TABLE `held_sale_items`
    CHANGE `quantity` `quantity_base` DECIMAL(12,3) NOT NULL,
    ADD COLUMN `unit_id` BIGINT UNSIGNED NULL AFTER `product_code`,
    ADD COLUMN `unit_name_snapshot` VARCHAR(50) NULL AFTER `unit_id`,
    ADD COLUMN `unit_symbol_snapshot` VARCHAR(20) NULL AFTER `unit_name_snapshot`,
    ADD COLUMN `quantity_entered` DECIMAL(12,3) NOT NULL DEFAULT 0.000 AFTER `unit_symbol_snapshot`,
    ADD COLUMN `conversion_to_base_snapshot` DECIMAL(18,6) NOT NULL DEFAULT 1.000000 AFTER `quantity_entered`;
