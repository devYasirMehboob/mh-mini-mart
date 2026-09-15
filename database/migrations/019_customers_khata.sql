-- Migration 019: Customer Management, Walk-in Credit & Khata Ledger
-- Safe: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS

-- 1. Customer code sequences (race-safe)
CREATE TABLE IF NOT EXISTS `customer_sequences` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `placeholder` TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Customers table
CREATE TABLE IF NOT EXISTS `customers` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `customer_code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(30) NULL,
    `email` VARCHAR(150) NULL,
    `address` VARCHAR(500) NULL,
    `notes` VARCHAR(1000) NULL,
    `customer_type` ENUM('walk_in_system','walk_in_khata','regular') NOT NULL DEFAULT 'regular',
    `khata_enabled` TINYINT(1) NOT NULL DEFAULT 0,
    `credit_limit` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '0 = no limit',
    `current_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'Cached outstanding (positive=owes shop)',
    `advance_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'Cached advance (positive=shop owes customer)',
    `status` ENUM('active','inactive') NOT NULL DEFAULT 'active',
    `is_system_walk_in` TINYINT(1) NOT NULL DEFAULT 0,
    `created_by` TINYINT UNSIGNED NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `customers_code_unique` (`customer_code`),
    UNIQUE KEY `customers_phone_unique` (`phone`),
    KEY `customers_name_index` (`name`),
    KEY `customers_type_index` (`customer_type`),
    KEY `customers_status_index` (`status`),
    KEY `customers_balance_index` (`current_balance`),
    CONSTRAINT `customers_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `access_credentials`(`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Customer ledger entries
CREATE TABLE IF NOT EXISTS `customer_ledger_entries` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `customer_id` BIGINT UNSIGNED NOT NULL,
    `entry_number` VARCHAR(30) NOT NULL,
    `entry_type` ENUM(
        'opening_balance','credit_sale','sale_payment','customer_payment',
        'refund','sale_cancellation','debit_adjustment','credit_adjustment',
        'payment_reversal','advance_deposit','advance_used','advance_refund'
    ) NOT NULL,
    `reference_type` VARCHAR(50) NULL,
    `reference_id` BIGINT UNSIGNED NULL,
    `sale_id` BIGINT UNSIGNED NULL,
    `payment_id` BIGINT UNSIGNED NULL,
    `debit_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'Increases outstanding',
    `credit_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'Reduces outstanding',
    `balance_after` DECIMAL(12,2) NOT NULL,
    `advance_debit` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `advance_credit` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `advance_balance_after` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `description` VARCHAR(500) NOT NULL,
    `entry_date` DATE NOT NULL,
    `status` ENUM('active','reversed') NOT NULL DEFAULT 'active',
    `reversal_of` BIGINT UNSIGNED NULL,
    `request_token` VARCHAR(100) NULL,
    `created_by` TINYINT UNSIGNED NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `ledger_entry_number_unique` (`entry_number`),
    UNIQUE KEY `ledger_request_token_unique` (`request_token`),
    KEY `ledger_customer_date_index` (`customer_id`, `entry_date`),
    KEY `ledger_customer_type_index` (`customer_id`, `entry_type`),
    KEY `ledger_sale_index` (`sale_id`),
    KEY `ledger_reference_index` (`reference_type`, `reference_id`),
    CONSTRAINT `ledger_customer_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT `ledger_sale_fk` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT `ledger_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `access_credentials`(`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Customer payment sequences
CREATE TABLE IF NOT EXISTS `customer_payment_sequences` (
    `sequence_date` DATE NOT NULL PRIMARY KEY,
    `last_number` INT UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Customer payments (standalone khata payments, not tied to a sale)
CREATE TABLE IF NOT EXISTS `customer_payments` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `payment_number` VARCHAR(30) NOT NULL,
    `customer_id` BIGINT UNSIGNED NOT NULL,
    `sale_id` BIGINT UNSIGNED NULL COMMENT 'Set when payment was made at time of sale',
    `amount` DECIMAL(12,2) NOT NULL,
    `payment_method` ENUM('cash','card','bank_transfer','mobile_wallet','other') NOT NULL DEFAULT 'cash',
    `reference_number` VARCHAR(150) NULL,
    `payment_date` DATE NOT NULL,
    `notes` VARCHAR(500) NULL,
    `status` ENUM('active','reversed') NOT NULL DEFAULT 'active',
    `request_token` VARCHAR(100) NOT NULL,
    `previous_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `balance_after` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `received_by` TINYINT UNSIGNED NOT NULL,
    `reversed_by` TINYINT UNSIGNED NULL,
    `reversed_at` DATETIME NULL,
    `reversal_reason` VARCHAR(500) NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `customer_payments_number_unique` (`payment_number`),
    UNIQUE KEY `customer_payments_token_unique` (`request_token`),
    KEY `customer_payments_customer_date_index` (`customer_id`, `payment_date`),
    KEY `customer_payments_sale_index` (`sale_id`),
    KEY `customer_payments_status_index` (`status`),
    CONSTRAINT `customer_payments_customer_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT `customer_payments_sale_fk` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT `customer_payments_received_by_fk` FOREIGN KEY (`received_by`) REFERENCES `access_credentials`(`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT `customer_payments_reversed_by_fk` FOREIGN KEY (`reversed_by`) REFERENCES `access_credentials`(`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Add customer columns to sales table
ALTER TABLE `sales`
    ADD COLUMN IF NOT EXISTS `customer_id` BIGINT UNSIGNED NULL AFTER `cashier_id`,
    ADD COLUMN IF NOT EXISTS `previous_customer_balance` DECIMAL(12,2) NULL AFTER `customer_phone`,
    ADD COLUMN IF NOT EXISTS `credit_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER `previous_customer_balance`,
    ADD COLUMN IF NOT EXISTS `customer_payment_applied` DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER `credit_amount`,
    ADD COLUMN IF NOT EXISTS `advance_used` DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER `customer_payment_applied`,
    ADD COLUMN IF NOT EXISTS `customer_balance_after` DECIMAL(12,2) NULL AFTER `advance_used`,
    ADD INDEX IF NOT EXISTS `sales_customer_index` (`customer_id`);

-- Add FK separately
ALTER TABLE `sales`
    ADD CONSTRAINT `sales_customer_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE CASCADE ON DELETE RESTRICT;

-- 7. Customer permissions
INSERT IGNORE INTO `permissions` (`name`, `permission_key`, `module`, `description`) VALUES
('View customers',          'customers.view',            'Customers', 'View the customer list and profiles.'),
('Create customers',        'customers.create',          'Customers', 'Create new customer profiles.'),
('Update customers',        'customers.update',          'Customers', 'Edit customer details.'),
('Deactivate customers',    'customers.deactivate',      'Customers', 'Deactivate or reactivate customers.'),
('View customer ledger',    'customers.view_ledger',     'Customers', 'View the customer khata ledger.'),
('Receive khata payment',   'customers.receive_payment', 'Customers', 'Receive standalone khata payments.'),
('Create credit sale',      'customers.credit_sale',     'Customers', 'Complete POS sales on credit.'),
('Set credit limit',        'customers.set_credit_limit','Customers', 'Set or change customer credit limits.'),
('Adjust balance',          'customers.adjust_balance',  'Customers', 'Post manual ledger adjustments.'),
('Reverse payment',         'customers.reverse_payment', 'Customers', 'Reverse a posted customer payment.');

-- 8. Grant all customer permissions to admin
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.`id`, p.`id`
FROM `roles` r
CROSS JOIN `permissions` p
WHERE r.`slug` = 'admin'
  AND p.`permission_key` LIKE 'customers.%';

-- 9. Grant limited customer permissions to cashier
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.`id`, p.`id`
FROM `roles` r
JOIN `permissions` p ON p.`permission_key` IN (
    'customers.view', 'customers.create', 'customers.view_ledger',
    'customers.receive_payment', 'customers.credit_sale'
)
WHERE r.`slug` = 'cashier';

-- 10. Seed the protected system Walk-in Customer
INSERT IGNORE INTO `customers`
    (`customer_code`, `name`, `customer_type`, `khata_enabled`, `status`, `is_system_walk_in`)
VALUES
    ('CUS-WALKIN', 'Walk-in Customer', 'walk_in_system', 0, 'active', 1);
