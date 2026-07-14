<?php

declare(strict_types=1);

namespace App\Http;

final class JsonResponse
{
    public static function success(string $message, mixed $data = null, int $status = 200): never
    {
        self::send(true, $message, $data, $status);
    }

    public static function error(
        string $message,
        int $status = 400,
        array $errors = []
    ): never {
        self::send(false, $message, null, $status, $errors);
    }

    private static function send(
        bool $success,
        string $message,
        mixed $data,
        int $status,
        array $errors = []
    ): never {
        http_response_code($status);

        $payload = [
            'success' => $success,
            'message' => $message,
        ];

        if ($data !== null) {
            $payload['data'] = $data;
        }

        if ($errors !== []) {
            $payload['errors'] = $errors;
        }

        echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }
}
