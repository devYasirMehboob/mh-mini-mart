<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
http_response_code(200);

echo json_encode([
    'success' => true,
    'message' => 'MH Mini Mart API',
    'data' => ['api' => '/api'],
], JSON_UNESCAPED_SLASHES);
