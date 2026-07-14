<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\JsonResponse;
use App\Services\DashboardService;

final class DashboardController
{
    public function __construct(private readonly DashboardService $service) {}

    public function index(array $user): never
    {
        JsonResponse::success('Dashboard loaded successfully.', $this->service->overview($user));
    }
}
