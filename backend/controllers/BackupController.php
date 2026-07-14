<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\JsonResponse;
use App\Http\Request;
use App\Security\SessionManager;
use App\Services\DatabaseBackupService;

final class BackupController
{
    public function __construct(
        private readonly Request $request,
        private readonly DatabaseBackupService $backups,
        private readonly SessionManager $session
    ) {
    }

    public function index(): never
    {
        JsonResponse::success('Backups retrieved successfully.', $this->backups->listing());
    }

    public function store(array $user): never
    {
        $this->session->verifyCsrfToken();
        JsonResponse::success('Backup created successfully.', [
            'backup' => $this->backups->create((int) $user['id']),
        ], 201);
    }

    public function restore(string $filename, array $user): never
    {
        $this->session->verifyCsrfToken();
        $input = $this->request->json();
        JsonResponse::success(
            'Backup restored successfully. Sign in again if your session data changed.',
            $this->backups->restore($filename, (string) ($input['confirmation'] ?? ''), (int) $user['id'])
        );
    }

    public function download(string $filename): never
    {
        $file = $this->backups->download($filename);
        header('Content-Type: application/json; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $file['filename'] . '"');
        header('Content-Length: ' . (string) filesize($file['path']));
        readfile($file['path']);
        exit;
    }
}