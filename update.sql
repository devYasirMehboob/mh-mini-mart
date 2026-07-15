ALTER TABLE products 
ADD COLUMN barcode_type VARCHAR(20) NULL AFTER barcode,
ADD COLUMN barcode_source VARCHAR(20) NULL AFTER barcode_type,
ADD COLUMN barcode_printed_at DATETIME NULL AFTER barcode_source,
ADD COLUMN barcode_print_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER barcode_printed_at;

INSERT IGNORE INTO permissions (name,permission_key,module,description) VALUES
('Generate barcodes','barcodes.generate','Products','Generate or manually assign barcodes.'),
('Print labels','labels.print','Products','Print product barcode labels.')
ON DUPLICATE KEY UPDATE name=VALUES(name),module=VALUES(module),description=VALUES(description);

INSERT IGNORE INTO role_permissions (role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.slug='admin' AND p.permission_key IN ('barcodes.generate', 'labels.print');

INSERT IGNORE INTO role_permissions (role_id,permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p ON p.permission_key IN ('labels.print') WHERE r.slug='cashier';

INSERT IGNORE INTO settings (setting_group,setting_key,setting_value,value_type,is_public) VALUES
('label','default_width','40','integer',1),
('label','default_height','30','integer',1),
('label','labels_per_row','1','integer',1),
('label','gap_x','2','decimal',1),
('label','gap_y','2','decimal',1),
('label','print_method','browser','string',0);
