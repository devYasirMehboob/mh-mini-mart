ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS offline_sale_id VARCHAR(64) NULL AFTER request_token,
ADD UNIQUE KEY IF NOT EXISTS sales_offline_sale_id_unique (offline_sale_id);
