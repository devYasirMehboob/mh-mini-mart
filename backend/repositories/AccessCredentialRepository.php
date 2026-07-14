<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Config\Database;

final class AccessCredentialRepository
{
    public function __construct(private readonly Database $database)
    {
    }

    public function findActive(): ?array
    {
        $statement = $this->database->connection()->prepare(
            'SELECT id, password_hash, role
             FROM access_credentials
             WHERE is_active = :is_active
             ORDER BY id
             LIMIT 1'
        );
        $statement->execute(['is_active' => 1]);
        $credential = $statement->fetch();

        return $credential === false ? null : $credential;
    }

    public function savePasswordHash(string $passwordHash, string $role = 'admin'): void
    {
        $statement = $this->database->connection()->prepare(
            'INSERT INTO access_credentials (id, password_hash, role, is_active)
             VALUES (:id, :password_hash, :role, :is_active)
             ON DUPLICATE KEY UPDATE
                 password_hash = :updated_password_hash,
                 role = :updated_role,
                 is_active = :updated_is_active,
                 session_version = session_version + 1'
        );
        $statement->execute([
            'id' => 1,
            'password_hash' => $passwordHash,
            'role' => $role,
            'is_active' => 1,
            'updated_password_hash' => $passwordHash,
            'updated_role' => $role,
            'updated_is_active' => 1,
        ]);
    }
}
