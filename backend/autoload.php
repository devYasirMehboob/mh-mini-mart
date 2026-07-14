<?php

declare(strict_types=1);

spl_autoload_register(static function (string $class): void {
    $prefixes = [
        'App\\Config\\' => __DIR__ . '/config/',
        'App\\Controllers\\' => __DIR__ . '/controllers/',
        'App\\Http\\' => __DIR__ . '/helpers/',
        'App\\Middleware\\' => __DIR__ . '/middleware/',
        'App\\Repositories\\' => __DIR__ . '/repositories/',
        'App\\Security\\' => __DIR__ . '/helpers/',
        'App\\Services\\' => __DIR__ . '/services/',
        'App\\Validators\\' => __DIR__ . '/validators/',
    ];

    foreach ($prefixes as $prefix => $directory) {
        if (!str_starts_with($class, $prefix)) {
            continue;
        }

        $relativeClass = substr($class, strlen($prefix));
        $file = $directory . str_replace('\\', '/', $relativeClass) . '.php';

        if (is_file($file)) {
            require_once $file;
        }

        return;
    }
});

