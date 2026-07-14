CREATE TABLE IF NOT EXISTS expense_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500) NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY expense_categories_name_unique (name),
    KEY expense_categories_status_index (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO expense_categories (name, description) VALUES
('Electricity', 'Electricity bills and related charges.'),
('Gas', 'Gas bills and cylinder expenses.'),
('Rent', 'Shop rent and related property charges.'),
('Employee salary', 'Staff salary and wage expenses.'),
('Ingredients', 'Bakery and shop ingredients.'),
('Packaging', 'Bags, boxes, labels, and packaging supplies.'),
('Equipment repair', 'Equipment maintenance and repair.'),
('Transport', 'Delivery, fuel, and transport expenses.'),
('Cleaning', 'Cleaning supplies and services.'),
('Other expenses', 'Expenses that do not fit another category.');

ALTER TABLE expenses DROP FOREIGN KEY expenses_user_fk;

ALTER TABLE expenses
    CHANGE COLUMN user_id added_by TINYINT UNSIGNED NOT NULL,
    CHANGE COLUMN description title VARCHAR(150) NOT NULL,
    CHANGE COLUMN notes description VARCHAR(1000) NULL,
    ADD COLUMN expense_category_id BIGINT UNSIGNED NULL AFTER id,
    ADD COLUMN receipt_image VARCHAR(255) NULL AFTER description,
    ADD COLUMN payment_method ENUM('cash','card','bank_transfer','mobile_wallet','other') NOT NULL DEFAULT 'cash' AFTER receipt_image,
    ADD COLUMN reference_number VARCHAR(150) NULL AFTER payment_method,
    ADD COLUMN voided_by TINYINT UNSIGNED NULL AFTER status,
    ADD COLUMN voided_at DATETIME NULL AFTER voided_by,
    MODIFY COLUMN status ENUM('recorded','cancelled','active','voided') NOT NULL DEFAULT 'active';

UPDATE expenses
SET expense_category_id = (SELECT id FROM expense_categories WHERE name = 'Other expenses' LIMIT 1),
    status = CASE WHEN status = 'cancelled' THEN 'voided' ELSE 'active' END;

ALTER TABLE expenses
    MODIFY COLUMN expense_category_id BIGINT UNSIGNED NOT NULL,
    MODIFY COLUMN status ENUM('active','voided') NOT NULL DEFAULT 'active',
    ADD KEY expenses_category_index (expense_category_id),
    ADD KEY expenses_payment_method_index (payment_method),
    ADD KEY expenses_created_index (created_at),
    ADD KEY expenses_voided_by_index (voided_by),
    ADD CONSTRAINT expenses_added_by_fk FOREIGN KEY (added_by) REFERENCES access_credentials(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    ADD CONSTRAINT expenses_category_fk FOREIGN KEY (expense_category_id) REFERENCES expense_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    ADD CONSTRAINT expenses_voided_by_fk FOREIGN KEY (voided_by) REFERENCES access_credentials(id) ON UPDATE CASCADE ON DELETE RESTRICT;
