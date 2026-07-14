CREATE TABLE IF NOT EXISTS settings (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 setting_group VARCHAR(40) NOT NULL,
 setting_key VARCHAR(80) NOT NULL,
 setting_value TEXT NULL,
 value_type ENUM('string','integer','decimal','boolean','json') NOT NULL DEFAULT 'string',
 is_public TINYINT(1) NOT NULL DEFAULT 0,
 updated_by TINYINT UNSIGNED NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uq_settings_group_key (setting_group,setting_key),
 KEY idx_settings_public (is_public),
 CONSTRAINT fk_settings_updated_by FOREIGN KEY (updated_by) REFERENCES access_credentials(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO settings (setting_group,setting_key,setting_value,value_type,is_public) VALUES
('shop','shop_name','MH Mini Mart','string',1),('shop','logo','','string',1),('shop','address','','string',1),('shop','phone','','string',1),('shop','email','','string',1),('shop','registration_number','','string',1),('shop','default_customer_name','Walk-in Customer','string',1),('shop','receipt_footer','Thank you for shopping with us.','string',1),('shop','return_policy','Please keep your receipt for returns.','string',1),
('localization','currency_code','PKR','string',1),('localization','currency_symbol','Rs.','string',1),('localization','currency_position','before','string',1),('localization','decimal_places','2','integer',1),('localization','thousand_separator',',','string',1),('localization','decimal_separator','.','string',1),('localization','timezone','Asia/Karachi','string',1),('localization','date_format','d-m-Y','string',1),('localization','time_format','12','string',1),('localization','first_day_of_week','monday','string',1),
('tax','enabled','0','boolean',1),('tax','name','Tax','string',1),('tax','percentage','0','decimal',1),('tax','calculation_mode','after_discount','string',1),('tax','show_on_receipt','1','boolean',1),
('discounts','enabled','1','boolean',1),('discounts','default_type','fixed','string',1),('discounts','default_value','0','decimal',1),('discounts','maximum_cashier_discount','10','decimal',1),('discounts','allow_cashier_discounts','1','boolean',1),('discounts','require_admin_above_limit','1','boolean',1),
('inventory','global_tracking_enabled','1','boolean',1),('inventory','default_minimum_stock','5','decimal',1),('inventory','allow_negative_stock','0','boolean',1),('inventory','low_stock_alerts','1','boolean',1),('inventory','out_of_stock_alerts','1','boolean',1),('inventory','wastage_tracking','1','boolean',1),('inventory','expiry_tracking','0','boolean',1),
('barcode','enabled','1','boolean',1),('barcode','auto_focus','1','boolean',1),('barcode','auto_add','1','boolean',1),('barcode','input_timeout_ms','250','integer',1),
('customers','enabled','1','boolean',1),('customers','use_walk_in','1','boolean',1),('customers','require_phone','0','boolean',1),('customers','save_optional_information','1','boolean',1),
('receipt','paper_width','80mm','string',1),('receipt','show_logo','1','boolean',1),('receipt','show_customer','1','boolean',1),('receipt','show_cashier','1','boolean',1),('receipt','show_tax','1','boolean',1),('receipt','show_discount','1','boolean',1),('receipt','show_payment_method','1','boolean',1),('receipt','show_change','1','boolean',1),('receipt','auto_print','0','boolean',1),
('printer','printer_name','','string',0),('printer','printing_method','browser','string',0),('printer','direct_printing_enabled','0','boolean',0),('printer','copies','1','integer',0),
('security','inactivity_timeout_minutes','30','integer',0),('security','automatic_logout','1','boolean',0),('security','require_password_for_sensitive_actions','0','boolean',0),
('backups','backup_folder','backups','string',0),('backups','retention_days','30','integer',0),('backups','automatic_backup','0','boolean',0),('backups','automatic_backup_time','02:00','string',0),('backups','cloud_folder','','string',0),('backups','timestamp_filenames','1','boolean',0);
