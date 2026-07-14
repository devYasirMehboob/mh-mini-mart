USE mh_mini_mart;

CREATE TABLE IF NOT EXISTS roles (
    id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL,
    description VARCHAR(255) NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY roles_slug_unique (slug),
    KEY roles_status_index (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO roles (id,name,slug,description,status) VALUES
(1,'Admin','admin','Full access to shop management and security.','active'),
(2,'Cashier','cashier','Point of sale and permitted personal sales access.','active')
ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),status=VALUES(status);

ALTER TABLE access_credentials
    MODIFY id TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
    ADD COLUMN IF NOT EXISTS name VARCHAR(100) NOT NULL DEFAULT 'Shop User' AFTER id,
    ADD COLUMN IF NOT EXISTS last_login_at DATETIME NULL AFTER is_active,
    ADD COLUMN IF NOT EXISTS session_version INT UNSIGNED NOT NULL DEFAULT 1 AFTER last_login_at,
    ADD INDEX IF NOT EXISTS access_credentials_name_index (name),
    ADD INDEX IF NOT EXISTS access_credentials_role_index (role),
    ADD INDEX IF NOT EXISTS access_credentials_last_login_index (last_login_at);

UPDATE access_credentials SET name='Admin' WHERE id=1 AND name='Shop User';

CREATE TABLE IF NOT EXISTS permissions (
    id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    permission_key VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY permissions_key_unique (permission_key),
    KEY permissions_module_index (module)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id TINYINT UNSIGNED NOT NULL,
    permission_id SMALLINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id,permission_id),
    CONSTRAINT role_permissions_role_fk FOREIGN KEY (role_id) REFERENCES roles(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT role_permissions_permission_fk FOREIGN KEY (permission_id) REFERENCES permissions(id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_permissions (
    user_id TINYINT UNSIGNED NOT NULL,
    permission_id SMALLINT UNSIGNED NOT NULL,
    effect ENUM('allow','deny') NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id,permission_id),
    CONSTRAINT user_permissions_user_fk FOREIGN KEY (user_id) REFERENCES access_credentials(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT user_permissions_permission_fk FOREIGN KEY (permission_id) REFERENCES permissions(id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    actor_user_id TINYINT UNSIGNED NULL,
    subject_user_id TINYINT UNSIGNED NULL,
    action VARCHAR(80) NOT NULL,
    description VARCHAR(255) NOT NULL,
    metadata TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY activity_logs_actor_index (actor_user_id,created_at),
    KEY activity_logs_subject_index (subject_user_id,created_at),
    KEY activity_logs_action_index (action,created_at),
    CONSTRAINT activity_logs_actor_fk FOREIGN KEY (actor_user_id) REFERENCES access_credentials(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT activity_logs_subject_fk FOREIGN KEY (subject_user_id) REFERENCES access_credentials(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO permissions (name,permission_key,module,description) VALUES
('View dashboard','dashboard.view','Dashboard','Open the shop dashboard.'),
('Access POS','pos.access','POS','Open the point of sale.'),
('View sales','sales.view','Sales','View permitted sales.'),
('View all sales','sales.view_all','Sales','View sales from every cashier.'),
('Complete sales','sales.complete','Sales','Complete point-of-sale transactions.'),
('Hold sales','sales.hold','Sales','Hold and resume point-of-sale carts.'),
('Cancel sales','sales.cancel','Sales','Cancel completed sales.'),
('Process refunds','sales.refund','Sales','Process sale refunds.'),
('Reprint receipts','sales.reprint','Sales','View and print permitted receipts.'),
('View products','products.view','Products','View the product catalogue.'),
('Create products','products.create','Products','Create products.'),
('Update products','products.update','Products','Edit products and status.'),
('Delete products','products.delete','Products','Delete unused products.'),
('View purchase costs','products.costs.view','Products','View product costs and margins.'),
('Manage categories','categories.manage','Categories','Create, edit and deactivate categories.'),
('View inventory','inventory.view','Inventory','View stock levels and history.'),
('Adjust inventory','inventory.adjust','Inventory','Perform manual stock changes.'),
('View expenses','expenses.view','Expenses','View shop expenses.'),
('Manage expenses','expenses.manage','Expenses','Create, edit and void expenses.'),
('View reports','reports.view','Reports','Open operational reports.'),
('View profit reports','reports.profit','Reports','View profit, cost and margin data.'),
('Export reports','reports.export','Reports','Export reporting data.'),
('Manage users','users.manage','Users','Manage users, roles and permissions.'),
('Manage settings','settings.manage','Settings','Change shop settings.'),
('Create backups','backups.create','Backups','Create local backups.'),
('Restore backups','backups.restore','Backups','Restore a backup.'),
('View activity logs','activity_logs.view','Activity Logs','View security and user activity.')
ON DUPLICATE KEY UPDATE name=VALUES(name),module=VALUES(module),description=VALUES(description);

INSERT IGNORE INTO role_permissions (role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.slug='admin';

INSERT IGNORE INTO role_permissions (role_id,permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p ON p.permission_key IN
('pos.access','sales.view','sales.complete','sales.hold','sales.reprint') WHERE r.slug='cashier';