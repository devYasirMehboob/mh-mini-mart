<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Config\Database;
use PDO;

final class NotificationPreferenceRepository
{
    public function __construct(private readonly Database $database)
    {
    }

    public function getForUser(int $userId): array
    {
        $statement = $this->database->connection()->prepare(
            'SELECT notification_type, in_app_enabled, sound_enabled FROM notification_preferences WHERE user_id = :user_id'
        );
        $statement->execute(['user_id' => $userId]);
        
        $preferences = [];
        foreach ($statement->fetchAll() as $row) {
            $preferences[$row['notification_type']] = [
                'in_app_enabled' => (bool) $row['in_app_enabled'],
                'sound_enabled' => (bool) $row['sound_enabled'],
            ];
        }
        return $preferences;
    }

    public function setForUser(int $userId, string $type, bool $inAppEnabled, bool $soundEnabled): void
    {
        $statement = $this->database->connection()->prepare(
            'INSERT INTO notification_preferences (user_id, notification_type, in_app_enabled, sound_enabled) 
             VALUES (:user_id, :type, :in_app_enabled, :sound_enabled) 
             ON DUPLICATE KEY UPDATE in_app_enabled = VALUES(in_app_enabled), sound_enabled = VALUES(sound_enabled)'
        );
        $statement->execute([
            'user_id' => $userId,
            'type' => $type,
            'in_app_enabled' => (int) $inAppEnabled,
            'sound_enabled' => (int) $soundEnabled
        ]);
    }
}
