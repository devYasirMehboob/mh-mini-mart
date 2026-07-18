<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\NotificationRepository;
use App\Repositories\NotificationPreferenceRepository;
use App\Repositories\UserRepository;
use App\Http\HttpException;

final class NotificationService
{
    public function __construct(
        private readonly NotificationRepository $notifications,
        private readonly NotificationPreferenceRepository $preferences,
        private readonly UserRepository $users,
        private readonly SystemConfigurationService $configuration
    ) {
    }

    public function dispatch(array $data, array $targetPermissions = []): void
    {
        // Settings check for notifications enabled
        if (!(bool) $this->configuration->get('notifications', 'enabled', true)) {
            return;
        }

        $notificationId = $this->notifications->create($data);
        if ($notificationId === 0) return;

        $users = $this->users->all();
        $type = $data['notification_type'];

        foreach ($users as $user) {
            // Check if user has permission to see this notification type
            if (!empty($targetPermissions)) {
                $hasPerm = false;
                $userPerms = $this->users->permissions((int) $user['id']);
                foreach ($targetPermissions as $perm) {
                    if (in_array($perm, $userPerms, true)) {
                        $hasPerm = true;
                        break;
                    }
                }
                if (!$hasPerm) continue;
            }

            // Check preferences (critical alerts cannot be disabled)
            $prefs = $this->preferences->getForUser((int) $user['id']);
            $inAppEnabled = true;
            if (isset($prefs[$type]) && $data['severity'] !== 'critical') {
                $inAppEnabled = $prefs[$type]['in_app_enabled'];
            }

            if ($inAppEnabled) {
                $this->notifications->addRecipient($notificationId, (int) $user['id']);
            }
        }
    }

    public function resolveBySourceKey(string $sourceKey): void
    {
        $this->notifications->resolveBySourceKey($sourceKey);
    }
    
    public function resolve(int $id, int $userId): void
    {
        $this->notifications->resolve($id);
    }
    
    public function resolveExpired(): void
    {
        $this->notifications->resolveExpired();
    }

    public function getPaginatedForUser(int $userId, array $filters): array
    {
        return $this->notifications->getPaginatedForUser($userId, $filters);
    }

    public function getUnreadCount(int $userId): array
    {
        return $this->notifications->getUnreadCount($userId);
    }

    public function getRecentForUser(int $userId, int $limit = 5): array
    {
        return $this->notifications->getRecentForUser($userId, $limit);
    }

    public function markAsRead(int $id, int $userId): void
    {
        $this->notifications->markAsRead($id, $userId);
    }

    public function markAsUnread(int $id, int $userId): void
    {
        $this->notifications->markAsUnread($id, $userId);
    }

    public function dismiss(int $id, int $userId): void
    {
        $this->notifications->dismiss($id, $userId);
    }

    public function markAllAsRead(int $userId): void
    {
        $this->notifications->markAllAsRead($userId);
    }
    
    public function dismissAll(int $userId): void
    {
        $this->notifications->dismissAll($userId);
    }

    public function announce(array $input, int $userId): void
    {
        if (empty($input['title']) || empty($input['message'])) {
            throw new HttpException('Title and message are required for announcements.', 422);
        }

        $this->dispatch([
            'notification_type' => 'admin_announcement',
            'severity' => $input['severity'] ?? 'info',
            'title' => $input['title'],
            'message' => $input['message'],
            'module' => 'System',
            'is_system_generated' => 0,
            'created_by' => $userId,
            'action_url' => $input['action_url'] ?? null,
            'source_key' => 'announcement_' . bin2hex(random_bytes(8)),
            'expires_at' => $input['expires_at'] ?? null,
        ], $input['target_permissions'] ?? ['notifications.view']);
    }
}
