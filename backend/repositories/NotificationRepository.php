<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Config\Database;
use PDO;

final class NotificationRepository
{
    public function __construct(private readonly Database $database)
    {
    }

    public function create(array $data): int
    {
        $statement = $this->database->connection()->prepare(
            'INSERT INTO notifications 
            (notification_type, severity, title, message, module, related_type, related_id, action_url, source_key, status, is_system_generated, created_by, expires_at, metadata_json)
            VALUES 
            (:type, :severity, :title, :message, :module, :related_type, :related_id, :action_url, :source_key, :status, :is_system_generated, :created_by, :expires_at, :metadata_json)
            ON DUPLICATE KEY UPDATE 
            severity = VALUES(severity), title = VALUES(title), message = VALUES(message), status = VALUES(status), updated_at = CURRENT_TIMESTAMP'
        );
        $statement->execute([
            'type' => $data['notification_type'],
            'severity' => $data['severity'] ?? 'info',
            'title' => $data['title'],
            'message' => $data['message'],
            'module' => $data['module'] ?? null,
            'related_type' => $data['related_type'] ?? null,
            'related_id' => $data['related_id'] ?? null,
            'action_url' => $data['action_url'] ?? null,
            'source_key' => $data['source_key'] ?? null,
            'status' => $data['status'] ?? 'unread',
            'is_system_generated' => (int) ($data['is_system_generated'] ?? 1),
            'created_by' => $data['created_by'] ?? null,
            'expires_at' => $data['expires_at'] ?? null,
            'metadata_json' => isset($data['metadata']) ? json_encode($data['metadata']) : null
        ]);

        if ($statement->rowCount() > 0 && $this->database->connection()->lastInsertId() !== '0') {
            return (int) $this->database->connection()->lastInsertId();
        }

        // If it was an update, we need to fetch the ID
        if (isset($data['source_key'])) {
            $stmt = $this->database->connection()->prepare('SELECT id FROM notifications WHERE source_key = :source_key');
            $stmt->execute(['source_key' => $data['source_key']]);
            return (int) $stmt->fetchColumn();
        }

        return 0; // Should not happen if well-formed
    }

    public function addRecipient(int $notificationId, int $userId): void
    {
        $statement = $this->database->connection()->prepare(
            'INSERT IGNORE INTO notification_recipients (notification_id, user_id) VALUES (:notification_id, :user_id)'
        );
        $statement->execute(['notification_id' => $notificationId, 'user_id' => $userId]);
    }

    public function resolveBySourceKey(string $sourceKey): void
    {
        $statement = $this->database->connection()->prepare(
            'UPDATE notifications SET status = \'resolved\', resolved_at = CURRENT_TIMESTAMP WHERE source_key = :source_key AND status != \'resolved\''
        );
        $statement->execute(['source_key' => $sourceKey]);
    }

    public function getPaginatedForUser(int $userId, array $filters): array
    {
        $where = ['nr.user_id = :user_id', '(nr.dismissed_at IS NULL OR :include_dismissed = 1)', '(n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)'];
        $params = ['user_id' => $userId, 'include_dismissed' => $filters['include_dismissed'] ?? 0];

        if (!empty($filters['search'])) {
            $where[] = '(n.title LIKE :search OR n.message LIKE :search)';
            $params['search'] = '%' . $filters['search'] . '%';
        }
        if (!empty($filters['type'])) {
            $where[] = 'n.notification_type = :type';
            $params['type'] = $filters['type'];
        }
        if (!empty($filters['severity'])) {
            $where[] = 'n.severity = :severity';
            $params['severity'] = $filters['severity'];
        }
        if (!empty($filters['status'])) {
            if ($filters['status'] === 'unread') {
                $where[] = 'nr.read_at IS NULL';
                $where[] = 'n.status != \'resolved\'';
            } elseif ($filters['status'] === 'read') {
                $where[] = 'nr.read_at IS NOT NULL';
                $where[] = 'n.status != \'resolved\'';
            } else {
                $where[] = 'n.status = :status';
                $params['status'] = $filters['status'];
            }
        }
        if (!empty($filters['module'])) {
            $where[] = 'n.module = :module';
            $params['module'] = $filters['module'];
        }
        if (!empty($filters['date_from'])) {
            $where[] = 'DATE(n.created_at) >= :date_from';
            $params['date_from'] = $filters['date_from'];
        }
        if (!empty($filters['date_to'])) {
            $where[] = 'DATE(n.created_at) <= :date_to';
            $params['date_to'] = $filters['date_to'];
        }

        $whereClause = implode(' AND ', $where);

        $countStatement = $this->database->connection()->prepare(
            "SELECT COUNT(*) FROM notifications n JOIN notification_recipients nr ON n.id = nr.notification_id WHERE $whereClause"
        );
        $countStatement->execute($params);
        $total = (int) $countStatement->fetchColumn();

        $allowedSorts = ['created_at' => 'n.created_at', 'severity' => 'n.severity', 'status' => 'n.status'];
        $sortField = $allowedSorts[$filters['sort_by'] ?? 'created_at'] ?? 'n.created_at';
        $sortDir = strtoupper($filters['sort_direction'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';

        $offset = ($filters['page'] - 1) * $filters['limit'];

        $statement = $this->database->connection()->prepare(
            "SELECT n.*, nr.read_at, nr.dismissed_at 
             FROM notifications n 
             JOIN notification_recipients nr ON n.id = nr.notification_id 
             WHERE $whereClause 
             ORDER BY $sortField $sortDir 
             LIMIT :limit OFFSET :offset"
        );

        foreach ($params as $key => $val) {
            $statement->bindValue($key, $val);
        }
        $statement->bindValue('limit', (int) $filters['limit'], PDO::PARAM_INT);
        $statement->bindValue('offset', (int) $offset, PDO::PARAM_INT);
        $statement->execute();

        return [
            'data' => $statement->fetchAll(),
            'total' => $total,
            'pages' => $total === 0 ? 0 : (int) ceil($total / $filters['limit'])
        ];
    }

    public function getUnreadCount(int $userId): array
    {
        $statement = $this->database->connection()->prepare(
            'SELECT n.severity, COUNT(*) as count 
             FROM notifications n 
             JOIN notification_recipients nr ON n.id = nr.notification_id 
             WHERE nr.user_id = :user_id 
             AND nr.read_at IS NULL 
             AND nr.dismissed_at IS NULL 
             AND n.status != \'resolved\' 
             AND (n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)
             GROUP BY n.severity'
        );
        $statement->execute(['user_id' => $userId]);
        $rows = $statement->fetchAll();
        
        $result = ['total' => 0, 'critical' => 0, 'warning' => 0, 'info' => 0, 'success' => 0];
        foreach ($rows as $row) {
            $count = (int) $row['count'];
            $result[$row['severity']] = $count;
            $result['total'] += $count;
        }
        return $result;
    }

    public function getRecentForUser(int $userId, int $limit = 5): array
    {
        $statement = $this->database->connection()->prepare(
            'SELECT n.id, n.notification_type, n.severity, n.title, n.message, n.action_url, n.module, n.created_at, nr.read_at 
             FROM notifications n 
             JOIN notification_recipients nr ON n.id = nr.notification_id 
             WHERE nr.user_id = :user_id 
             AND nr.dismissed_at IS NULL 
             AND n.status != \'resolved\'
             AND (n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)
             ORDER BY n.created_at DESC 
             LIMIT :limit'
        );
        $statement->bindValue('user_id', $userId, PDO::PARAM_INT);
        $statement->bindValue('limit', $limit, PDO::PARAM_INT);
        $statement->execute();
        return $statement->fetchAll();
    }

    public function findByIdAndUser(int $id, int $userId): ?array
    {
        $statement = $this->database->connection()->prepare(
            'SELECT n.*, nr.read_at, nr.dismissed_at 
             FROM notifications n 
             JOIN notification_recipients nr ON n.id = nr.notification_id 
             WHERE n.id = :id AND nr.user_id = :user_id'
        );
        $statement->execute(['id' => $id, 'user_id' => $userId]);
        $row = $statement->fetch();
        return $row !== false ? $row : null;
    }

    public function markAsRead(int $id, int $userId): void
    {
        $statement = $this->database->connection()->prepare(
            'UPDATE notification_recipients SET read_at = CURRENT_TIMESTAMP WHERE notification_id = :id AND user_id = :user_id'
        );
        $statement->execute(['id' => $id, 'user_id' => $userId]);
    }

    public function markAsUnread(int $id, int $userId): void
    {
        $statement = $this->database->connection()->prepare(
            'UPDATE notification_recipients SET read_at = NULL WHERE notification_id = :id AND user_id = :user_id'
        );
        $statement->execute(['id' => $id, 'user_id' => $userId]);
    }

    public function dismiss(int $id, int $userId): void
    {
        $statement = $this->database->connection()->prepare(
            'UPDATE notification_recipients SET dismissed_at = CURRENT_TIMESTAMP WHERE notification_id = :id AND user_id = :user_id'
        );
        $statement->execute(['id' => $id, 'user_id' => $userId]);
    }

    public function markAllAsRead(int $userId): void
    {
        $statement = $this->database->connection()->prepare(
            'UPDATE notification_recipients SET read_at = CURRENT_TIMESTAMP WHERE user_id = :user_id AND read_at IS NULL'
        );
        $statement->execute(['user_id' => $userId]);
    }
    
    public function dismissAll(int $userId): void
    {
        $statement = $this->database->connection()->prepare(
            'UPDATE notification_recipients SET dismissed_at = CURRENT_TIMESTAMP WHERE user_id = :user_id AND dismissed_at IS NULL'
        );
        $statement->execute(['user_id' => $userId]);
    }

    public function resolve(int $id): void
    {
        $statement = $this->database->connection()->prepare(
            'UPDATE notifications SET status = \'resolved\', resolved_at = CURRENT_TIMESTAMP WHERE id = :id AND status != \'resolved\''
        );
        $statement->execute(['id' => $id]);
    }
    
    public function resolveExpired(): void
    {
        $this->database->connection()->exec(
            'UPDATE notifications SET status = \'resolved\', resolved_at = CURRENT_TIMESTAMP WHERE expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP AND status != \'resolved\''
        );
    }
}
