<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\JsonResponse;
use App\Http\Request;
use App\Security\SessionManager;
use App\Services\NotificationService;
use App\Services\AlertEvaluationService;
use App\Services\AuthorizationService;

final class NotificationController
{
    public function __construct(
        private readonly Request $request,
        private readonly NotificationService $notifications,
        private readonly SessionManager $session,
        private readonly AlertEvaluationService $evaluationService,
        private readonly AuthorizationService $authorization
    ) {
    }

    public function index(array $user): void
    {
        $filters = $this->request->query();
        $filters['page'] = max(1, (int) ($filters['page'] ?? 1));
        $filters['limit'] = max(1, min(100, (int) ($filters['limit'] ?? 20)));

        $result = $this->notifications->getPaginatedForUser($user['id'], $filters);
        
        $summary = $this->notifications->getUnreadCount($user['id']);

        JsonResponse::success('Notifications retrieved.', [
            'notifications' => $result['data'],
            'summary' => $summary,
            'pagination' => [
                'page' => $filters['page'],
                'limit' => $filters['limit'],
                'total' => $result['total'],
                'total_pages' => $result['pages']
            ]
        ]);
    }

    public function recent(array $user): void
    {
        $limit = max(1, min(20, (int) $this->request->get('limit', 5)));
        $recent = $this->notifications->getRecentForUser($user['id'], $limit);
        JsonResponse::success('Recent notifications retrieved.', ['notifications' => $recent]);
    }

    public function unreadCount(array $user): void
    {
        $summary = $this->notifications->getUnreadCount($user['id']);
        JsonResponse::success('Unread count retrieved.', ['summary' => $summary]);
    }

    public function read(int $id, array $user): void
    {
        $this->notifications->markAsRead($id, $user['id']);
        JsonResponse::success('Notification marked as read.');
    }

    public function unread(int $id, array $user): void
    {
        $this->notifications->markAsUnread($id, $user['id']);
        JsonResponse::success('Notification marked as unread.');
    }

    public function dismiss(int $id, array $user): void
    {
        $this->notifications->dismiss($id, $user['id']);
        JsonResponse::success('Notification dismissed.');
    }

    public function resolve(int $id, array $user): void
    {
        $this->authorization->requirePermission($user, 'notifications.resolve');
        $this->notifications->resolve($id, $user['id']);
        JsonResponse::success('Notification resolved.');
    }

    public function markAllAsRead(array $user): void
    {
        $this->notifications->markAllAsRead($user['id']);
        JsonResponse::success('All notifications marked as read.');
    }
    
    public function dismissAll(array $user): void
    {
        $this->notifications->dismissAll($user['id']);
        JsonResponse::success('All notifications dismissed.');
    }

    public function announce(array $user): void
    {
        $this->authorization->requirePermission($user, 'notifications.announce');
        $this->notifications->announce($this->request->json(), $user['id']);
        JsonResponse::created('Announcement created successfully.');
    }

    public function evaluate(array $user): void
    {
        $this->authorization->requirePermission($user, 'notifications.evaluate');
        $this->evaluationService->evaluateAll();
        JsonResponse::success('Alert evaluation completed.');
    }
}
