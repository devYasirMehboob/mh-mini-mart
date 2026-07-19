<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\Database;
use App\Http\HttpException;
use App\Repositories\UserRepository;
use App\Repositories\ActivityLogRepository;
use PDO;

final class SystemMaintenanceService
{
    public function __construct(
        private readonly Database $database,
        private readonly UserRepository $users,
        private readonly ActivityLogRepository $activity
    ) {}

    public function resetDatabase(int $adminId, string $password): void
    {
        $admin = $this->users->find($adminId);
        if (!$admin || $admin['role'] !== 'admin') {
            throw new HttpException('Only administrators can perform this action.', 403);
        }

        $pdo = $this->database->connection();
        $stmt = $pdo->prepare('SELECT password_hash FROM access_credentials WHERE id = :id');
        $stmt->execute(['id' => $adminId]);
        $hash = $stmt->fetchColumn();

        if (!$hash || !password_verify($password, $hash)) {
            throw new HttpException('Incorrect admin password.', 401, ['password' => ['Incorrect password.']]);
        }

        $pdo = $this->database->connection();
        
        $tables = [
            'activity_logs',
            'categories',
            'expenses',
            'held_sale_items',
            'held_sales',
            'invoice_sequences',
            'notification_preferences',
            'notification_recipients',
            'notifications',
            'payments',
            'products',
            'purchase_items',
            'purchase_payments',
            'purchase_return_items',
            'purchase_return_sequences',
            'purchase_returns',
            'purchase_sequences',
            'purchases',
            'refunds',
            'sale_items',
            'sales',
            'stock_transactions',
            'suppliers',
        ];

        try {
            $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
            
            foreach ($tables as $table) {
                $pdo->exec("TRUNCATE TABLE `$table`");
            }

            $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');

            $this->activity->log(
                null,
                'system.reset',
                'System database was reset by administrator.',
                null,
                ['admin_id' => $adminId]
            );

        } catch (\Throwable $exception) {
            $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
            throw new HttpException('Failed to reset database: ' . $exception->getMessage(), 500);
        }
    }
}
