-- Reconcile legacy tracked quantities that were edited before stock-history enforcement.
-- This migration is idempotent: it only inserts when the current quantity has no matching latest transaction.
START TRANSACTION;

INSERT INTO stock_transactions (
    product_id,
    user_id,
    transaction_type,
    quantity,
    previous_stock,
    new_stock,
    reason,
    reference_type,
    reference_id
)
SELECT
    p.id,
    (SELECT ac.id FROM access_credentials ac WHERE ac.role = 'admin' AND ac.is_active = 1 ORDER BY ac.id LIMIT 1),
    'opening',
    ABS(p.quantity),
    0.000,
    p.quantity,
    'Integration audit reconciliation: legacy opening quantity had no stock history.',
    'product_reconciliation',
    p.id
FROM products p
WHERE p.track_stock = 1
  AND p.quantity <> 0
  AND NOT EXISTS (
      SELECT 1 FROM stock_transactions existing WHERE existing.product_id = p.id
  )
  AND EXISTS (
      SELECT 1 FROM access_credentials ac WHERE ac.role = 'admin' AND ac.is_active = 1
  );

INSERT INTO stock_transactions (
    product_id,
    user_id,
    transaction_type,
    quantity,
    previous_stock,
    new_stock,
    reason,
    reference_type,
    reference_id
)
SELECT
    p.id,
    (SELECT ac.id FROM access_credentials ac WHERE ac.role = 'admin' AND ac.is_active = 1 ORDER BY ac.id LIMIT 1),
    'adjustment',
    ABS(p.quantity - latest.new_stock),
    latest.new_stock,
    p.quantity,
    'Integration audit reconciliation: product quantity differed from its latest stock transaction.',
    'product_reconciliation',
    p.id
FROM products p
INNER JOIN stock_transactions latest
    ON latest.id = (
        SELECT st.id
        FROM stock_transactions st
        WHERE st.product_id = p.id
        ORDER BY st.id DESC
        LIMIT 1
    )
WHERE p.track_stock = 1
  AND ABS(p.quantity - latest.new_stock) >= 0.001
  AND EXISTS (
      SELECT 1 FROM access_credentials ac WHERE ac.role = 'admin' AND ac.is_active = 1
  );

COMMIT;