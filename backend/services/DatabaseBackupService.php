<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\Database;
use App\Http\HttpException;
use App\Repositories\ActivityLogRepository;
use PDO;
use Throwable;

final class DatabaseBackupService
{
    private const FORMAT = 'mh-mini-mart-backup-v1';
    private const MAX_BACKUP_BYTES = 268435456;

    public function __construct(
        private readonly Database $database,
        private readonly ActivityLogRepository $activity,
        private readonly SystemConfigurationService $configuration,
        private readonly string $storageRoot
    ) {
    }

    public function listing(): array
    {
        $directory = $this->directory();
        $files = [];

        foreach (glob($directory . DIRECTORY_SEPARATOR . 'mh-mini-mart-*.json') ?: [] as $path) {
            if (is_file($path)) {
                $files[] = [
                    'filename' => basename($path),
                    'size_bytes' => filesize($path) ?: 0,
                    'created_at' => date(DATE_ATOM, filemtime($path) ?: time()),
                ];
            }
        }

        usort($files, static fn (array $left, array $right): int => strcmp($right['filename'], $left['filename']));

        return [
            'backups' => $files,
            'configuration' => [
                'retention_days' => (int) $this->configuration->get('backups', 'retention_days', 30),
                'automatic_backup' => (bool) $this->configuration->get('backups', 'automatic_backup', false),
                'automatic_backup_time' => (string) $this->configuration->get('backups', 'automatic_backup_time', '02:00'),
            ],
        ];
    }

    public function create(int $userId, bool $safety = false): array
    {
        $pdo = $this->database->connection();
        $schema = $this->schema($pdo);
        $tables = [];

        foreach (array_keys($schema) as $table) {
            $statement = $pdo->prepare('SELECT * FROM ' . $this->identifier($table));
            $statement->execute();
            $tables[$table] = $statement->fetchAll();
        }

        $payload = [
            'format' => self::FORMAT,
            'created_at' => date(DATE_ATOM),
            'database' => (string) $pdo->query('SELECT DATABASE()')->fetchColumn(),
            'schema_hash' => $this->schemaHash($schema),
            'tables' => $tables,
        ];
        $archive = $this->encode([
            'payload' => $payload,
            'checksum' => hash('sha256', $this->encode($payload)),
        ], JSON_PRETTY_PRINT);

        $filename = $this->nextFilename($safety);
        $directory = $this->directory();
        $path = $directory . DIRECTORY_SEPARATOR . $filename;
        $temporary = $path . '.tmp-' . bin2hex(random_bytes(4));

        try {
            if (file_put_contents($temporary, $archive, LOCK_EX) === false || !rename($temporary, $path)) {
                throw new HttpException('The backup file could not be saved.', 500);
            }
        } finally {
            if (is_file($temporary)) {
                @unlink($temporary);
            }
        }

        $this->purgeExpired($directory);
        $this->activity->log(
            $userId,
            $safety ? 'backup.safety_created' : 'backup.created',
            $safety ? 'A pre-restore safety backup was created.' : 'A manual database backup was created.',
            null,
            ['filename' => $filename]
        );

        return [
            'filename' => $filename,
            'size_bytes' => filesize($path) ?: strlen($archive),
            'created_at' => $payload['created_at'],
        ];
    }

    public function restore(string $filename, string $confirmation, int $userId): array
    {
        if ($confirmation !== 'RESTORE') {
            throw new HttpException('Type RESTORE to confirm this operation.', 422, [
                'confirmation' => ['Type RESTORE exactly to continue.'],
            ]);
        }

        $archive = $this->readArchive($filename);
        $pdo = $this->database->connection();
        $schema = $this->schema($pdo);

        if (!hash_equals($this->schemaHash($schema), (string) $archive['payload']['schema_hash'])) {
            throw new HttpException('This backup does not match the current database schema.', 409);
        }

        $tables = $archive['payload']['tables'] ?? null;
        if (!is_array($tables) || array_keys($tables) !== array_keys($schema)) {
            throw new HttpException('This backup has an invalid table manifest.', 409);
        }

        $safety = $this->create($userId, true);
        $pdo->beginTransaction();

        try {
            $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');

            foreach (array_keys($schema) as $table) {
                $pdo->exec('DELETE FROM ' . $this->identifier($table));
            }

            foreach ($tables as $table => $rows) {
                if (!is_array($rows)) {
                    throw new HttpException('This backup contains invalid table data.', 409);
                }

                $allowedColumns = array_column($schema[$table], 'field');
                foreach ($rows as $row) {
                    if (!is_array($row) || array_keys($row) !== $allowedColumns) {
                        throw new HttpException('This backup contains incompatible columns.', 409);
                    }

                    $columns = implode(',', array_map($this->identifier(...), $allowedColumns));
                    $placeholders = implode(',', array_fill(0, count($allowedColumns), '?'));
                    $statement = $pdo->prepare(
                        'INSERT INTO ' . $this->identifier($table) . ' (' . $columns . ') VALUES (' . $placeholders . ')'
                    );
                    $statement->execute(array_values($row));
                }
            }

            $this->activity->log(
                null,
                'backup.restored',
                'Database restored from a verified application backup.',
                null,
                ['filename' => $filename, 'requested_by' => $userId, 'safety_backup' => $safety['filename']]
            );
            $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
            $pdo->commit();
        } catch (Throwable $exception) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            try {
                $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
            } catch (Throwable) {
            }
            throw $exception;
        }

        return ['restored_from' => $filename, 'safety_backup' => $safety];
    }

    public function download(string $filename): array
    {
        $path = $this->path($filename);

        return ['path' => $path, 'filename' => basename($path)];
    }

    private function readArchive(string $filename): array
    {
        $path = $this->path($filename);
        $size = filesize($path);
        if ($size === false || $size < 1 || $size > self::MAX_BACKUP_BYTES) {
            throw new HttpException('The backup file size is invalid.', 409);
        }

        $raw = file_get_contents($path);
        $archive = $raw === false ? null : json_decode($raw, true);
        if (!is_array($archive) || !is_array($archive['payload'] ?? null) || !is_string($archive['checksum'] ?? null)) {
            throw new HttpException('The backup file is invalid or damaged.', 409);
        }

        $payload = $archive['payload'];
        if (($payload['format'] ?? '') !== self::FORMAT) {
            throw new HttpException('This file is not an MH Mini Mart backup.', 409);
        }

        if (!hash_equals(hash('sha256', $this->encode($payload)), $archive['checksum'])) {
            throw new HttpException('The backup checksum does not match. The file may be damaged.', 409);
        }

        return $archive;
    }

    private function directory(): string
    {
        $folder = str_replace('\\', '/', trim((string) $this->configuration->get('backups', 'backup_folder', 'backups')));
        if (!preg_match('#^(?!/)(?![A-Za-z]:)(?:[A-Za-z0-9 _.-]+/)*[A-Za-z0-9 _.-]+$#', $folder) || str_contains($folder, '..')) {
            throw new HttpException('The configured backup folder is not safe.', 500);
        }

        $directory = rtrim($this->storageRoot, '/\\') . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $folder);
        if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
            throw new HttpException('The backup folder could not be created.', 500);
        }

        $protection = $directory . DIRECTORY_SEPARATOR . '.htaccess';
        if (!is_file($protection)) {
            @file_put_contents($protection, "Options -Indexes\nRequire all denied\n", LOCK_EX);
        }

        return $directory;
    }

    private function path(string $filename): string
    {
        if (!preg_match('/^mh-mini-mart-(?:safety-)?\d{8}-\d{6}(?:-\d+)?\.json$/', $filename)) {
            throw new HttpException('Select a valid backup file.', 422);
        }

        $path = $this->directory() . DIRECTORY_SEPARATOR . $filename;
        if (!is_file($path)) {
            throw new HttpException('Backup file not found.', 404);
        }

        return $path;
    }

    private function schema(PDO $pdo): array
    {
        $statement = $pdo->prepare(
            "SELECT table_name FROM information_schema.tables
             WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'
             ORDER BY table_name"
        );
        $statement->execute();
        $schema = [];

        foreach ($statement->fetchAll(PDO::FETCH_COLUMN) as $table) {
            $columns = $pdo->prepare(
                'SELECT column_name AS field,column_type AS type,is_nullable AS nullable,
                        column_key AS key_type,column_default AS default_value,extra AS extra
                 FROM information_schema.columns
                 WHERE table_schema = DATABASE() AND table_name = :table
                 ORDER BY ordinal_position'
            );
            $columns->execute(['table' => $table]);
            $schema[(string) $table] = $columns->fetchAll();
        }

        return $schema;
    }

    private function schemaHash(array $schema): string
    {
        return hash('sha256', $this->encode($schema));
    }

    private function nextFilename(bool $safety): string
    {
        $prefix = 'mh-mini-mart-' . ($safety ? 'safety-' : '') . date('Ymd-His');
        $filename = $prefix . '.json';
        $counter = 2;

        while (is_file($this->directory() . DIRECTORY_SEPARATOR . $filename)) {
            $filename = $prefix . '-' . $counter . '.json';
            $counter++;
        }

        return $filename;
    }

    private function purgeExpired(string $directory): void
    {
        $retentionDays = max(1, (int) $this->configuration->get('backups', 'retention_days', 30));
        $cutoff = time() - $retentionDays * 86400;

        foreach (glob($directory . DIRECTORY_SEPARATOR . 'mh-mini-mart-*.json') ?: [] as $path) {
            if (is_file($path) && (filemtime($path) ?: time()) < $cutoff) {
                @unlink($path);
            }
        }
    }

    private function identifier(string $identifier): string
    {
        if (!preg_match('/^[A-Za-z0-9_]+$/', $identifier)) {
            throw new HttpException('The database contains an unsupported identifier.', 500);
        }

        return chr(96) . $identifier . chr(96);
    }

    private function encode(mixed $value, int $flags = 0): string
    {
        $json = json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | $flags);
        if ($json === false) {
            throw new HttpException('The backup data could not be encoded safely.', 500);
        }

        return $json;
    }
}