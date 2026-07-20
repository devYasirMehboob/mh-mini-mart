<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\DebugConfig;
use Throwable;

final class Logger
{
    private string $logDir;
    private string $appLogFile;
    private string $errorLogFile;
    private array $sensitiveKeys = [
        'password', 'password_confirmation', 'current_access_password',
        'password_hash', 'token', 'access_token', 'session_id', 'cookie',
        'authorization', 'api_key', 'database_password', 'card_number', 'cvv',
        'secret', 'shell_command'
    ];

    public function __construct(string $baseDir = __DIR__ . '/../..')
    {
        $this->logDir = $baseDir . DIRECTORY_SEPARATOR . 'backend' . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'logs';
        $this->appLogFile = $this->logDir . DIRECTORY_SEPARATOR . 'app.log';
        $this->errorLogFile = $this->logDir . DIRECTORY_SEPARATOR . 'error.log';

        if (!is_dir($this->logDir)) {
            @mkdir($this->logDir, 0755, true);
        }
        
        $htaccess = $this->logDir . DIRECTORY_SEPARATOR . '.htaccess';
        if (!is_file($htaccess)) {
            @file_put_contents($htaccess, "Order deny,allow\nDeny from all\n");
        }
    }

    public function debug(string $layer, string $message, array $context = []): void
    {
        if (DebugConfig::isEnabled()) {
            $this->log('DEBUG', $layer, $message, $context, $this->appLogFile);
        }
    }

    public function info(string $layer, string $message, array $context = []): void
    {
        if (DebugConfig::isEnabled()) {
            $this->log('INFO', $layer, $message, $context, $this->appLogFile);
        }
    }

    public function warning(string $layer, string $message, array $context = []): void
    {
        $this->log('WARNING', $layer, $message, $context, $this->appLogFile);
    }

    public function error(string $layer, string $message, array $context = []): void
    {
        $this->log('ERROR', $layer, $message, $context, $this->errorLogFile);
    }

    public function critical(string $layer, string $message, array $context = []): void
    {
        $this->log('CRITICAL', $layer, $message, $context, $this->errorLogFile);
    }

    private function log(string $level, string $layer, string $message, array $context, string $file): void
    {
        $this->rotateLogIfNeeded($file);

        $timestamp = date('Y-m-d H:i:s');
        
        // Include Request ID if available
        $requestId = $GLOBALS['MH_REQUEST_ID'] ?? 'sys';

        $sanitizedContext = $this->redact($context);
        $contextStr = $sanitizedContext !== [] ? ' ' . json_encode($sanitizedContext, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : '';

        $formatted = "[$timestamp] [$requestId] [$layer] $level: $message$contextStr" . PHP_EOL;

        @file_put_contents($file, $formatted, FILE_APPEND | LOCK_EX);
    }

    private function rotateLogIfNeeded(string $file): void
    {
        if (!is_file($file)) {
            return;
        }

        clearstatcache(true, $file);
        if (filesize($file) > 10 * 1024 * 1024) { // 10 MB
            for ($i = 13; $i >= 1; $i--) {
                $old = $file . '.' . $i;
                $new = $file . '.' . ($i + 1);
                if (is_file($old)) {
                    @rename($old, $new);
                }
            }
            @rename($file, $file . '.1');
        }
    }

    private function redact(mixed $data): mixed
    {
        if (is_array($data)) {
            $redacted = [];
            foreach ($data as $key => $value) {
                if (is_string($key) && in_array(strtolower($key), $this->sensitiveKeys, true)) {
                    $redacted[$key] = '[REDACTED]';
                } else {
                    $redacted[$key] = $this->redact($value);
                }
            }
            return $redacted;
        }

        if ($data instanceof Throwable) {
            return [
                'exception' => get_class($data),
                'message' => $data->getMessage(),
                'file' => $data->getFile(),
                'line' => $data->getLine(),
                'trace' => DebugConfig::isEnabled() ? $data->getTraceAsString() : '[REDACTED IN SAFE MODE]'
            ];
        }

        return $data;
    }
}
