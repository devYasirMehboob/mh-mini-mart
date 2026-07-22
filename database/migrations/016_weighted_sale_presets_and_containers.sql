-- Migration 016: Weighted Sale Presets and Stock Containers
-- Run this AFTER migration 014 and 015

-- ============================================================
-- 1. Fix unit_type bug: Piece was wrongly set to 'volume'
-- ============================================================
UPDATE `units` SET `unit_type` = 'count' WHERE `symbol` = 'pc' AND `unit_type` = 'volume';

-- ============================================================
-- 2. Add missing practical units
-- ============================================================
INSERT IGNORE INTO `units` (`name`, `symbol`, `unit_type`, `precision`, `status`) VALUES
('Maund',   'man',  'weight', 3, 'active'),  -- 1 Maund = 40 kg = 40000 g
('Quintal',  'q',   'weight', 3, 'active'),  -- 1 Quintal = 100 kg = 100000 g
('Seer',    'sr',   'weight', 3, 'active'),  -- 1 Seer = 1 kg = 1000 g
('Metre',   'm',    'length', 3, 'active'),  -- fabric, rope, ribbon
('Centimetre', 'cm','length', 1, 'active'),
('Bottle',  'btl',  'count',  0, 'active'),  -- cold drink, oil bottles
('Can',     'can',  'volume', 3, 'active'),  -- oil jerry can
('Tray',    'tray', 'count',  0, 'active'),  -- egg trays
('Bundle',  'bndl', 'count',  0, 'active');  -- bundles of items

-- Add is_system flag safely (skip if already exists)
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'units' AND COLUMN_NAME = 'is_system');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `units` ADD COLUMN `is_system` TINYINT(1) NOT NULL DEFAULT 0 AFTER `status`',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Mark original system units as protected
UPDATE `units` SET `is_system` = 1 WHERE `id` IN (1, 2, 3, 4, 5, 6, 7, 8, 9);

-- ============================================================
-- 4. Create product_sale_presets table
-- Each row is one preset for a product: e.g., "250g" or "1kg"
-- ============================================================
CREATE TABLE IF NOT EXISTS `product_sale_presets` (
    `id`                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `product_id`              BIGINT UNSIGNED NOT NULL,
    `label`                   VARCHAR(100) NOT NULL COMMENT 'Display label e.g. 250g, 1kg, Half Kg',
    `unit_id`                 BIGINT UNSIGNED NOT NULL COMMENT 'The unit used for this preset',
    `quantity_entered`        DECIMAL(12,3) NOT NULL COMMENT 'The quantity in the entered unit',
    `quantity_base`           DECIMAL(15,6) NOT NULL COMMENT 'Quantity converted to product base unit',
    `barcode`                 VARCHAR(100) NOT NULL COMMENT 'Required — user-entered or auto-generated',
    `barcode_source`          ENUM('manual','generated') NOT NULL DEFAULT 'generated',
    `barcode_type`            VARCHAR(20) NOT NULL DEFAULT 'C128',
    `selling_price_override`  DECIMAL(12,2) NULL COMMENT 'Fixed price for this preset; NULL = proportional',
    `use_proportional_price`  TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Calculate from product base price if no override',
    `is_default`              TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Default preset for this product on POS',
    `sort_order`              INT UNSIGNED NOT NULL DEFAULT 0,
    `status`                  ENUM('active','inactive') NOT NULL DEFAULT 'active',
    `created_at`              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `sale_presets_barcode_unique` (`barcode`),
    KEY `sale_presets_product_idx` (`product_id`),
    KEY `sale_presets_status_idx` (`status`),
    CONSTRAINT `sale_presets_product_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `sale_presets_unit_fk` FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. Create stock_containers table
-- Each row is one physical container (bag, can, box, etc.)
-- Created when a purchase is completed for a container-tracked product
-- ============================================================
CREATE TABLE IF NOT EXISTS `stock_containers` (
    `id`                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `product_id`              BIGINT UNSIGNED NOT NULL,
    `batch_id`                BIGINT UNSIGNED NULL COMMENT 'Link to product_batches if batch tracking enabled',
    `purchase_id`             BIGINT UNSIGNED NULL COMMENT 'Which purchase brought this container',
    `purchase_item_id`        BIGINT UNSIGNED NULL COMMENT 'Which purchase line item',
    `container_code`          VARCHAR(60) NOT NULL COMMENT 'Unique human-readable code e.g. BAG-000001',
    `container_type`          VARCHAR(30) NOT NULL DEFAULT 'bag' COMMENT 'bag, can, box, bottle, roll, etc.',
    `original_quantity_base`  DECIMAL(15,6) NOT NULL COMMENT 'Original qty in product base unit on receipt',
    `remaining_quantity_base` DECIMAL(15,6) NOT NULL COMMENT 'Current remaining qty in base unit',
    `barcode`                 VARCHAR(100) NOT NULL COMMENT 'Required — auto-generated or admin-set',
    `barcode_source`          ENUM('manual','generated') NOT NULL DEFAULT 'generated',
    `status`                  ENUM('sealed','open','depleted','sold','blocked','returned','disposed') NOT NULL DEFAULT 'sealed',
    `opened_at`               DATETIME NULL,
    `depleted_at`             DATETIME NULL,
    `created_at`              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `stock_containers_code_unique` (`container_code`),
    UNIQUE KEY `stock_containers_barcode_unique` (`barcode`),
    KEY `stock_containers_product_idx` (`product_id`),
    KEY `stock_containers_status_idx` (`status`),
    KEY `stock_containers_purchase_idx` (`purchase_id`),
    CONSTRAINT `stock_containers_product_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `stock_containers_batch_fk` FOREIGN KEY (`batch_id`) REFERENCES `product_batches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `stock_containers_purchase_fk` FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `stock_containers_purchase_item_fk` FOREIGN KEY (`purchase_item_id`) REFERENCES `purchase_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. Create sale_item_allocations table
-- Records exactly which container(s) supplied a sold quantity
-- Used for accurate refunds and returns
-- ============================================================
CREATE TABLE IF NOT EXISTS `sale_item_allocations` (
    `id`                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `sale_id`              BIGINT UNSIGNED NOT NULL,
    `sale_item_id`         BIGINT UNSIGNED NOT NULL,
    `product_id`           BIGINT UNSIGNED NOT NULL,
    `stock_container_id`   BIGINT UNSIGNED NULL COMMENT 'NULL if product has no container tracking',
    `sale_preset_id`       BIGINT UNSIGNED NULL COMMENT 'Which preset was used, if any',
    `quantity_base`        DECIMAL(15,6) NOT NULL COMMENT 'How much base stock was consumed from this container',
    `created_at`           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY `sia_sale_idx` (`sale_id`),
    KEY `sia_sale_item_idx` (`sale_item_id`),
    KEY `sia_container_idx` (`stock_container_id`),
    CONSTRAINT `sia_sale_fk` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `sia_sale_item_fk` FOREIGN KEY (`sale_item_id`) REFERENCES `sale_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `sia_container_fk` FOREIGN KEY (`stock_container_id`) REFERENCES `stock_containers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `sia_preset_fk` FOREIGN KEY (`sale_preset_id`) REFERENCES `product_sale_presets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add track_containers and container_type to products safely
SET @c1 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='products' AND COLUMN_NAME='track_containers');
SET @sql = IF(@c1=0,'ALTER TABLE `products` ADD COLUMN `track_containers` TINYINT(1) NOT NULL DEFAULT 0 AFTER `track_expiry`','SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @c2 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='products' AND COLUMN_NAME='container_type');
SET @sql = IF(@c2=0,'ALTER TABLE `products` ADD COLUMN `container_type` VARCHAR(30) NULL AFTER `track_containers`','SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Add container columns to purchase_items safely
SET @c3 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='purchase_items' AND COLUMN_NAME='container_count');
SET @sql = IF(@c3=0,'ALTER TABLE `purchase_items` ADD COLUMN `container_count` INT UNSIGNED NULL AFTER `quantity_base`','SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @c4 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='purchase_items' AND COLUMN_NAME='qty_per_container');
SET @sql = IF(@c4=0,'ALTER TABLE `purchase_items` ADD COLUMN `qty_per_container` DECIMAL(12,3) NULL AFTER `container_count`','SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Add sale_preset_id to sale_items safely
SET @c5 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sale_items' AND COLUMN_NAME='sale_preset_id');
SET @sql = IF(@c5=0,'ALTER TABLE `sale_items` ADD COLUMN `sale_preset_id` BIGINT UNSIGNED NULL AFTER `unit_id`','SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sale_items' AND CONSTRAINT_NAME='si_preset_fk');
SET @sql = IF(@fk_exists=0 AND @c5=0,'ALTER TABLE `sale_items` ADD CONSTRAINT `si_preset_fk` FOREIGN KEY (`sale_preset_id`) REFERENCES `product_sale_presets`(`id`) ON DELETE SET NULL','SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ============================================================
-- 10. Add a barcode sequences table for guaranteed unique codes
-- ============================================================
CREATE TABLE IF NOT EXISTS `barcode_sequences` (
    `prefix`    VARCHAR(20) NOT NULL PRIMARY KEY,
    `last_seq`  BIGINT UNSIGNED NOT NULL DEFAULT 0,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed sequence rows
INSERT IGNORE INTO `barcode_sequences` (`prefix`, `last_seq`) VALUES
('MH-SP',  0),   -- Sale preset barcodes: MH-SP-000001
('MH-BAG', 0),   -- Container barcodes: MH-BAG-000001
('MH-PRD', 0);   -- Product barcodes (fallback): MH-PRD-000001
