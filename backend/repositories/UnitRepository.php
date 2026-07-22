<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Config\Database;
use PDO;

class UnitRepository
{
    private Database $db;

    public function __construct(Database $db)
    {
        $this->db = $db;
    }

    public function getAllUnits(): array
    {
        $stmt = $this->db->connection()->query("SELECT * FROM units ORDER BY name ASC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getActiveUnits(): array
    {
        $stmt = $this->db->connection()->query("SELECT * FROM units WHERE status = 'active' ORDER BY name ASC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getUnitById(int $id): ?array
    {
        $stmt = $this->db->connection()->prepare("SELECT * FROM units WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    public function deleteUnit(int $id): bool
    {
        $stmt = $this->db->connection()->prepare("DELETE FROM units WHERE id = ?");
        $stmt->execute([$id]);
        return (bool)$stmt->rowCount();
    }

    public function createUnit(array $data): array
    {
        $stmt = $this->db->connection()->prepare("
            INSERT INTO units (name, symbol, unit_type, `precision`, status)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $data['name'],
            $data['symbol'],
            $data['unit_type'],
            $data['precision'] ?? 0,
            $data['status'] ?? 'active'
        ]);
        
        return $this->getUnitById((int)$this->db->connection()->lastInsertId());
    }

    public function updateUnit(int $id, array $data): bool
    {
        $stmt = $this->db->connection()->prepare("
            UPDATE units 
            SET name = ?, symbol = ?, unit_type = ?, `precision` = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ");
        return $stmt->execute([
            $data['name'],
            $data['symbol'],
            $data['unit_type'],
            $data['precision'] ?? 0,
            $data['status'] ?? 'active',
            $id
        ]);
    }
}
