-- 1. Add batch tracking flags to products
ALTER TABLE `products`
ADD COLUMN `track_batches` tinyint(1) NOT NULL DEFAULT 0 AFTER `track_stock`,
ADD COLUMN `track_expiry` tinyint(1) NOT NULL DEFAULT 0 AFTER `track_batches`;

-- 2. Create product_batches table
CREATE TABLE `product_batches` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint(20) unsigned NOT NULL,
  `purchase_id` bigint(20) unsigned DEFAULT NULL,
  `purchase_item_id` bigint(20) unsigned DEFAULT NULL,
  `batch_number` varchar(100) NOT NULL,
  `manufacturing_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `received_quantity` decimal(12,3) NOT NULL DEFAULT 0.000,
  `remaining_quantity` decimal(12,3) NOT NULL DEFAULT 0.000,
  `reserved_quantity` decimal(12,3) NOT NULL DEFAULT 0.000,
  `unit_cost` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` enum('active','depleted','expired','blocked','returned','disposed') NOT NULL DEFAULT 'active',
  `received_at` timestamp NULL DEFAULT NULL,
  `created_by` tinyint(3) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_batch_product` (`product_id`),
  KEY `fk_batch_purchase` (`purchase_id`),
  KEY `fk_batch_purchase_item` (`purchase_item_id`),
  KEY `idx_batch_number` (`batch_number`),
  KEY `idx_batch_status` (`status`),
  KEY `idx_batch_expiry` (`expiry_date`),
  CONSTRAINT `fk_batch_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `fk_batch_purchase` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`id`),
  CONSTRAINT `fk_batch_purchase_item` FOREIGN KEY (`purchase_item_id`) REFERENCES `purchase_items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3. Create sale_item_batches table
CREATE TABLE `sale_item_batches` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `sale_id` bigint(20) unsigned NOT NULL,
  `sale_item_id` bigint(20) unsigned NOT NULL,
  `product_batch_id` bigint(20) unsigned NOT NULL,
  `quantity` decimal(12,3) NOT NULL,
  `unit_cost` decimal(12,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_sib_sale` (`sale_id`),
  KEY `fk_sib_sale_item` (`sale_item_id`),
  KEY `fk_sib_batch` (`product_batch_id`),
  CONSTRAINT `fk_sib_batch` FOREIGN KEY (`product_batch_id`) REFERENCES `product_batches` (`id`),
  CONSTRAINT `fk_sib_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`),
  CONSTRAINT `fk_sib_sale_item` FOREIGN KEY (`sale_item_id`) REFERENCES `sale_items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 4. Create batch_disposals table
CREATE TABLE `batch_disposals` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `product_batch_id` bigint(20) unsigned NOT NULL,
  `quantity` decimal(12,3) NOT NULL,
  `reason` varchar(500) DEFAULT NULL,
  `disposal_type` varchar(50) NOT NULL,
  `processed_by` tinyint(3) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_bd_batch` (`product_batch_id`),
  CONSTRAINT `fk_bd_batch` FOREIGN KEY (`product_batch_id`) REFERENCES `product_batches` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 5. Add batch_id to stock_transactions
ALTER TABLE `stock_transactions`
ADD COLUMN `batch_id` bigint(20) unsigned DEFAULT NULL AFTER `product_id`,
ADD KEY `fk_st_batch` (`batch_id`),
ADD CONSTRAINT `fk_st_batch` FOREIGN KEY (`batch_id`) REFERENCES `product_batches` (`id`);
