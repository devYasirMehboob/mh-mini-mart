<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Config\Database;

final class CategoryRepository
{
    public function __construct(private readonly Database $database)
    {
    }

    public function all(string $search = ''): array
    {
        $statement = $this->database->connection()->prepare(
            'SELECT id, name, description, status, created_at, updated_at
             FROM categories
             WHERE (:search = "" OR name LIKE :search_pattern)
             ORDER BY name ASC'
        );
        $statement->execute([
            'search' => $search,
            'search_pattern' => '%' . $search . '%',
        ]);

        return $statement->fetchAll();
    }

    public function find(int $id): ?array
    {
        $statement = $this->database->connection()->prepare(
            'SELECT id, name, description, status, created_at, updated_at
             FROM categories
             WHERE id = :id
             LIMIT 1'
        );
        $statement->execute(['id' => $id]);
        $category = $statement->fetch();

        return $category === false ? null : $category;
    }

    public function nameExists(string $name, ?int $ignoreId = null): bool
    {
        $statement = $this->database->connection()->prepare(
            'SELECT COUNT(*)
             FROM categories
             WHERE name = :name
               AND (:ignore_id IS NULL OR id <> :ignore_id_value)'
        );
        $statement->execute([
            'name' => $name,
            'ignore_id' => $ignoreId,
            'ignore_id_value' => $ignoreId ?? 0,
        ]);

        return (int) $statement->fetchColumn() > 0;
    }

    public function create(array $data): array
    {
        $statement = $this->database->connection()->prepare(
            'INSERT INTO categories (name, description, status)
             VALUES (:name, :description, :status)'
        );
        $statement->execute([
            'name' => $data['name'],
            'description' => $data['description'],
            'status' => 'active',
        ]);

        return $this->find((int) $this->database->connection()->lastInsertId());
    }

    public function update(int $id, array $data): array
    {
        $statement = $this->database->connection()->prepare(
            'UPDATE categories
             SET name = :name, description = :description
             WHERE id = :id'
        );
        $statement->execute([
            'id' => $id,
            'name' => $data['name'],
            'description' => $data['description'],
        ]);

        return $this->find($id);
    }

    public function updateStatus(int $id, string $status): array
    {
        $statement = $this->database->connection()->prepare(
            'UPDATE categories
             SET status = :status
             WHERE id = :id'
        );
        $statement->execute([
            'id' => $id,
            'status' => $status,
        ]);

        return $this->find($id);
    }

    public function isLinkedToProducts(int $id): bool
    {
        $tableStatement = $this->database->connection()->prepare(
            'SELECT COUNT(*)
             FROM information_schema.tables
             WHERE table_schema = DATABASE()
               AND table_name = :table_name'
        );
        $tableStatement->execute(['table_name' => 'products']);

        if ((int) $tableStatement->fetchColumn() === 0) {
            return false;
        }

        $statement = $this->database->connection()->prepare(
            'SELECT COUNT(*)
             FROM products
             WHERE category_id = :category_id'
        );
        $statement->execute(['category_id' => $id]);

        return (int) $statement->fetchColumn() > 0;
    }

    public function delete(int $id): void
    {
        $statement = $this->database->connection()->prepare(
            'DELETE FROM categories WHERE id = :id'
        );
        $statement->execute(['id' => $id]);
    }
}
