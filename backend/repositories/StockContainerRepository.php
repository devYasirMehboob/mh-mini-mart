<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Config\Database;
use PDO;

class StockContainerRepository
{
    public function __construct(private readonly Database $db) {}

    public function findByProduct(int $productId, ?string $status = null): array
    {
        $sql = "SELECT * FROM stock_containers WHERE product_id = :product_id";
        $params = [':product_id' => $productId];
        if ($status !== null) {
            $sql .= " AND status = :status";
            $params[':status'] = $status;
        }
        $sql .= " ORDER BY status ASC, id ASC"; // open first, then sealed, by oldest id
        $stmt = $this->db->connection()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->connection()->prepare(
            "SELECT * FROM stock_containers WHERE id = :id"
        );
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function findByBarcode(string $barcode): ?array
    {
        $stmt = $this->db->connection()->prepare(
            "SELECT sc.*, p.name AS product_name, p.selling_price AS product_selling_price,
                    p.base_unit_id, p.stock_quantity_base, p.status AS product_status, p.track_stock
             FROM stock_containers sc
             JOIN products p ON sc.product_id = p.id
             WHERE sc.barcode = :barcode"
        );
        $stmt->execute([':barcode' => $barcode]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * Get eligible containers for deduction (open first, then oldest sealed).
     * Locks the rows for update within a transaction.
     */
    public function findEligibleForSale(int $productId, bool $lock = false): array
    {
        $lockClause = $lock ? 'FOR UPDATE' : '';
        // Priority: 1=open first, 2=sealed second, ordered by oldest first (FIFO)
        $stmt = $this->db->connection()->prepare("
            SELECT * FROM stock_containers
            WHERE product_id = :product_id
              AND status IN ('open', 'sealed')
              AND remaining_quantity_base > 0
            ORDER BY
                CASE status WHEN 'open' THEN 0 ELSE 1 END ASC,
                id ASC
            {$lockClause}
        ");
        $stmt->execute([':product_id' => $productId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function barcodeExists(string $barcode, ?int $excludeId = null): bool
    {
        $pdo = $this->db->connection();
        // Check all barcode tables
        foreach (['products' => null, 'product_units' => null, 'product_sale_presets' => null] as $table => $_) {
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM `{$table}` WHERE barcode = :b");
            $stmt->execute([':b' => $barcode]);
            if ((int)$stmt->fetchColumn() > 0) return true;
        }
        $sql = "SELECT COUNT(*) FROM stock_containers WHERE barcode = :b";
        $params = [':b' => $barcode];
        if ($excludeId !== null) {
            $sql .= " AND id != :ex";
            $params[':ex'] = $excludeId;
        }
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return (int)$stmt->fetchColumn() > 0;
    }

    public function create(array $data): int
    {
        $stmt = $this->db->connection()->prepare("
            INSERT INTO stock_containers
                (product_id, batch_id, purchase_id, purchase_item_id,
                 container_code, container_type,
                 original_quantity_base, remaining_quantity_base,
                 barcode, barcode_source, status)
            VALUES
                (:product_id, :batch_id, :purchase_id, :purchase_item_id,
                 :container_code, :container_type,
                 :original_quantity_base, :remaining_quantity_base,
                 :barcode, :barcode_source, :status)
        ");
        $stmt->execute([
            ':product_id'              => $data['product_id'],
            ':batch_id'                => $data['batch_id'] ?? null,
            ':purchase_id'             => $data['purchase_id'] ?? null,
            ':purchase_item_id'        => $data['purchase_item_id'] ?? null,
            ':container_code'          => $data['container_code'],
            ':container_type'          => $data['container_type'] ?? 'bag',
            ':original_quantity_base'  => $data['original_quantity_base'],
            ':remaining_quantity_base' => $data['original_quantity_base'],
            ':barcode'                 => $data['barcode'],
            ':barcode_source'          => $data['barcode_source'] ?? 'generated',
            ':status'                  => $data['status'] ?? 'sealed',
        ]);
        return (int)$this->db->connection()->lastInsertId();
    }

    public function deduct(int $id, float $quantityBase): void
    {
        $stmt = $this->db->connection()->prepare("
            UPDATE stock_containers
            SET remaining_quantity_base = remaining_quantity_base - :qty,
                status = CASE
                    WHEN remaining_quantity_base - :qty2 <= 0 THEN 'depleted'
                    WHEN status = 'sealed' THEN 'open'
                    ELSE status
                END,
                opened_at = CASE WHEN status = 'sealed' THEN NOW() ELSE opened_at END,
                depleted_at = CASE WHEN remaining_quantity_base - :qty3 <= 0 THEN NOW() ELSE depleted_at END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
        ");
        $stmt->execute([
            ':qty'  => $quantityBase,
            ':qty2' => $quantityBase,
            ':qty3' => $quantityBase,
            ':id'   => $id,
        ]);
    }

    public function restore(int $id, float $quantityBase): void
    {
        // Restore stock and update status back from depleted/open
        $stmt = $this->db->connection()->prepare("
            UPDATE stock_containers
            SET remaining_quantity_base = LEAST(remaining_quantity_base + :qty, original_quantity_base),
                status = CASE
                    WHEN remaining_quantity_base + :qty2 >= original_quantity_base THEN 'sealed'
                    ELSE 'open'
                END,
                depleted_at = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id AND status IN ('open', 'depleted')
        ");
        $stmt->execute([':qty' => $quantityBase, ':qty2' => $quantityBase, ':id' => $id]);
    }

    public function updateBarcode(int $id, string $barcode, string $source): bool
    {
        $stmt = $this->db->connection()->prepare("
            UPDATE stock_containers
            SET barcode = :barcode, barcode_source = :source, updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
        ");
        return $stmt->execute([':barcode' => $barcode, ':source' => $source, ':id' => $id]);
    }

    public function updateStatus(int $id, string $status): bool
    {
        $stmt = $this->db->connection()->prepare(
            "UPDATE stock_containers SET status = :status, updated_at = CURRENT_TIMESTAMP WHERE id = :id"
        );
        return $stmt->execute([':status' => $status, ':id' => $id]);
    }

    /**
     * Generate next barcode for containers using atomic sequence table.
     */
    public function nextContainerBarcode(string $prefix = 'MH-BAG'): string
    {
        $pdo = $this->db->connection();
        $pdo->exec("UPDATE barcode_sequences SET last_seq = LAST_INSERT_ID(last_seq + 1) WHERE `prefix` = " . $pdo->quote($prefix));
        $stmt = $pdo->query("SELECT LAST_INSERT_ID() AS seq");
        $seq = (int)$stmt->fetchColumn();
        return $prefix . '-' . str_pad((string)$seq, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Generate next container code (non-barcode, for internal tracking).
     */
    public function nextContainerCode(string $type = 'BAG'): string
    {
        $pdo = $this->db->connection();
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM stock_containers WHERE container_type = :t");
        $stmt->execute([':t' => strtolower($type)]);
        $count = (int)$stmt->fetchColumn() + 1;
        return strtoupper($type) . '-' . str_pad((string)$count, 6, '0', STR_PAD_LEFT);
    }

    public function getSummaryByProduct(int $productId): array
    {
        $stmt = $this->db->connection()->prepare("
            SELECT
                COUNT(*) AS total_containers,
                SUM(CASE WHEN status = 'sealed' THEN 1 ELSE 0 END) AS sealed_count,
                SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open_count,
                SUM(CASE WHEN status = 'depleted' THEN 1 ELSE 0 END) AS depleted_count,
                SUM(remaining_quantity_base) AS total_remaining_base,
                MAX(CASE WHEN status = 'open' THEN remaining_quantity_base ELSE NULL END) AS open_container_remaining
            FROM stock_containers
            WHERE product_id = :product_id AND status IN ('sealed','open')
        ");
        $stmt->execute([':product_id' => $productId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
    }

    public function saveAllocation(int $saleId, int $saleItemId, int $productId, ?int $containerId, ?int $presetId, float $quantityBase): void
    {
        $stmt = $this->db->connection()->prepare("
            INSERT INTO sale_item_allocations
                (sale_id, sale_item_id, product_id, stock_container_id, sale_preset_id, quantity_base)
            VALUES
                (:sale_id, :sale_item_id, :product_id, :container_id, :preset_id, :quantity_base)
        ");
        $stmt->execute([
            ':sale_id'      => $saleId,
            ':sale_item_id' => $saleItemId,
            ':product_id'   => $productId,
            ':container_id' => $containerId,
            ':preset_id'    => $presetId,
            ':quantity_base'=> $quantityBase,
        ]);
    }

    public function getAllocationsBySaleItem(int $saleItemId): array
    {
        $stmt = $this->db->connection()->prepare(
            "SELECT * FROM sale_item_allocations WHERE sale_item_id = :id"
        );
        $stmt->execute([':id' => $saleItemId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
