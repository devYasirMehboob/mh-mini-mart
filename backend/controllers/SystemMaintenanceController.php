<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\JsonResponse;
use App\Http\Request;
use App\Services\SystemMaintenanceService;
use App\Security\SessionManager;

final class SystemMaintenanceController
{
    public function __construct(
        private readonly Request $request,
        private readonly SystemMaintenanceService $maintenanceService,
        private readonly SessionManager $session
    ) {}

    public function resetDatabase(array $user): never
    {
        $this->session->verifyCsrfToken();
        
        $input = $this->request->json();
        $password = $input['password'] ?? '';

        if (empty($password)) {
            \App\Http\HttpException::throw('Password is required to perform this action.', 422, [
                'password' => ['Admin password is required.']
            ]);
        }

        $this->maintenanceService->resetDatabase((int) $user['id'], $password);

        JsonResponse::success('Database has been completely reset.');
    }
}
