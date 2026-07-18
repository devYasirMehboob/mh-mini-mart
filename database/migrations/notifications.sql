CREATE TABLE IF NOT EXISTS notifications (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 notification_type VARCHAR(100) NOT NULL,
 severity ENUM('info', 'success', 'warning', 'critical') NOT NULL DEFAULT 'info',
 title VARCHAR(255) NOT NULL,
 message VARCHAR(1000) NOT NULL,
 module VARCHAR(100) NULL,
 related_type VARCHAR(100) NULL,
 related_id BIGINT UNSIGNED NULL,
 action_url VARCHAR(500) NULL,
 source_key VARCHAR(150) NULL,
 status ENUM('unread', 'read', 'dismissed', 'resolved') NOT NULL DEFAULT 'unread',
 is_system_generated TINYINT(1) NOT NULL DEFAULT 1,
 created_by TINYINT UNSIGNED NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 resolved_at TIMESTAMP NULL,
 expires_at TIMESTAMP NULL,
 metadata_json JSON NULL,
 UNIQUE KEY notifications_source_key_unique (source_key),
 KEY notifications_type_index (notification_type),
 KEY notifications_severity_index (severity),
 KEY notifications_status_index (status),
 KEY notifications_created_at_index (created_at),
 CONSTRAINT notifications_created_by_fk FOREIGN KEY (created_by) REFERENCES access_credentials(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification_recipients (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 notification_id BIGINT UNSIGNED NOT NULL,
 user_id TINYINT UNSIGNED NOT NULL,
 read_at TIMESTAMP NULL,
 dismissed_at TIMESTAMP NULL,
 delivered_at TIMESTAMP NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY notification_recipients_unique (notification_id, user_id),
 KEY notification_recipients_user_read_index (user_id, read_at),
 CONSTRAINT notification_recipients_notification_fk FOREIGN KEY (notification_id) REFERENCES notifications(id) ON UPDATE CASCADE ON DELETE CASCADE,
 CONSTRAINT notification_recipients_user_fk FOREIGN KEY (user_id) REFERENCES access_credentials(id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification_preferences (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id TINYINT UNSIGNED NOT NULL,
 notification_type VARCHAR(100) NOT NULL,
 in_app_enabled TINYINT(1) NOT NULL DEFAULT 1,
 sound_enabled TINYINT(1) NOT NULL DEFAULT 1,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY notification_preferences_unique (user_id, notification_type),
 CONSTRAINT notification_preferences_user_fk FOREIGN KEY (user_id) REFERENCES access_credentials(id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO permissions (name, permission_key, module, description) VALUES 
('View notifications', 'notifications.view', 'System', 'View system and business notifications.'),
('Manage notifications', 'notifications.manage', 'System', 'Manage and dismiss notifications globally.'),
('Resolve alerts', 'notifications.resolve', 'System', 'Manually resolve system alerts.'),
('Announcements', 'notifications.announce', 'System', 'Create manual announcements for users.'),
('Manage preferences', 'notifications.preferences', 'System', 'Update personal notification preferences.'),
('Evaluate alerts', 'notifications.evaluate', 'System', 'Trigger system alert evaluation manually.');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.slug = 'admin' AND p.permission_key LIKE 'notifications.%';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.slug = 'cashier' AND p.permission_key IN ('notifications.view', 'notifications.preferences');
