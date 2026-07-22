-- Migration 017: Shared Stock Source and Variants
-- Run this AFTER migration 016

-- ============================================================
-- 1. Add new stock and consumption columns to products table
-- ============================================================
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'stock_mode');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `products` ADD COLUMN `stock_mode` ENUM(''own'', ''source'', ''shared'') NOT NULL DEFAULT ''own'' AFTER `category_id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'stock_source_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `products` ADD COLUMN `stock_source_id` BIGINT UNSIGNED NULL AFTER `stock_mode`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'consumption_quantity');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `products` ADD COLUMN `consumption_quantity` DECIMAL(12,3) NULL AFTER `minimum_stock`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'consumption_unit_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `products` ADD COLUMN `consumption_unit_id` BIGINT UNSIGNED NULL AFTER `consumption_quantity`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'consumption_quantity_base');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `products` ADD COLUMN `consumption_quantity_base` DECIMAL(15,6) NULL AFTER `consumption_unit_id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'allow_custom_sale');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `products` ADD COLUMN `allow_custom_sale` TINYINT(1) NOT NULL DEFAULT 0 AFTER `consumption_quantity_base`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'default_custom_sale_unit_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `products` ADD COLUMN `default_custom_sale_unit_id` BIGINT UNSIGNED NULL AFTER `allow_custom_sale`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add Foreign Keys
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND CONSTRAINT_NAME = 'products_stock_source_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `products` ADD CONSTRAINT `products_stock_source_fk` FOREIGN KEY (`stock_source_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND CONSTRAINT_NAME = 'products_consumption_unit_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `products` ADD CONSTRAINT `products_consumption_unit_fk` FOREIGN KEY (`consumption_unit_id`) REFERENCES `units`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND CONSTRAINT_NAME = 'products_custom_sale_unit_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `products` ADD CONSTRAINT `products_custom_sale_unit_fk` FOREIGN KEY (`default_custom_sale_unit_id`) REFERENCES `units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================================
-- 2. Migrate existing "allow_weighted_sale" to stock_mode = 'source'
-- ============================================================
UPDATE `products` 
SET `stock_mode` = 'source', 
    `allow_custom_sale` = 1,
    `default_custom_sale_unit_id` = `default_sale_unit_id`
WHERE `allow_weighted_sale` = 1;

-- ============================================================
-- 3. Migrate `product_sale_presets` to `products` (Shared variants)
-- We must make sure to generate unique product_codes for them.
-- Since MySQL does not support variable concatenation well in INSERT SELECT with AUTO_INCREMENT,
-- we'll use a prefix 'V-' + preset ID.
-- ============================================================
INSERT INTO `products` (
    `stock_mode`, `stock_source_id`, `category_id`, `name`, `product_code`, 
    `barcode`, `barcode_source`, `selling_price`, 
    `consumption_quantity`, `consumption_unit_id`, `consumption_quantity_base`,
    `track_stock`, `track_batches`, `track_expiry`, `track_containers`, `status`,
    `base_unit_id`, `default_purchase_unit_id`, `default_sale_unit_id`
)
SELECT 
    'shared', p.id, p.category_id, CONCAT(p.name, ' ', sp.label), CONCAT('V-', p.product_code, '-', sp.id),
    sp.barcode, sp.barcode_source, 
    IFNULL(sp.selling_price_override, p.selling_price * sp.quantity_base),
    sp.quantity_entered, sp.unit_id, sp.quantity_base,
    1, 0, 0, 0, sp.status,
    p.base_unit_id, p.default_purchase_unit_id, sp.unit_id
FROM `product_sale_presets` sp
JOIN `products` p ON sp.product_id = p.id;

-- ============================================================
-- 4. Drop legacy preset tables and columns
-- ============================================================
-- First drop foreign keys and columns referencing presets
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sale_item_allocations' AND CONSTRAINT_NAME = 'sia_preset_fk');
SET @sql = IF(@fk_exists > 0, 'ALTER TABLE `sale_item_allocations` DROP FOREIGN KEY `sia_preset_fk`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sale_item_allocations' AND COLUMN_NAME = 'sale_preset_id');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE `sale_item_allocations` DROP COLUMN `sale_preset_id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sale_items' AND CONSTRAINT_NAME = 'si_preset_fk');
SET @sql = IF(@fk_exists > 0, 'ALTER TABLE `sale_items` DROP FOREIGN KEY `si_preset_fk`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sale_items' AND COLUMN_NAME = 'sale_preset_id');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE `sale_items` DROP COLUMN `sale_preset_id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Now drop the table
DROP TABLE IF EXISTS `product_sale_presets`;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'allow_weighted_sale');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE `products` DROP COLUMN `allow_weighted_sale`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

