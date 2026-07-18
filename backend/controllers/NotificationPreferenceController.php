<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\JsonResponse;
use App\Http\Request;
use App\Security\SessionManager;
use App\Repositories\NotificationPreferenceRepository;

final class NotificationPreferenceController
{
    public function __construct(
        private readonly Request $request,
        private readonly NotificationPreferenceRepository $preferences,
        private readonly SessionManager $session
    ) {
    }

    public function index(): void
    {
        $userId = $this->session->userId();
        $prefs = $this->preferences->getForUser($userId);
        JsonResponse::success('Preferences retrieved.', ['preferences' => $prefs]);
    }

    public function update(array $user): void
    {
        $input = $this->request->json();
        
        foreach ($input as $type => $prefs) {
            $this->preferences->setForUser(
                $user['id'],
                (string) $type,
                (bool) ($prefs['in_app_enabled'] ?? true),
                (bool) ($prefs['sound_enabled'] ?? true)
            );
        }
        
        JsonResponse::success('Notification preferences updated.', ['preferences' => $this->preferences->getForUser($user['id'])]);
    }
}
