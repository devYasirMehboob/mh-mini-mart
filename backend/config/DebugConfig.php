<?php

declare(strict_types=1);

namespace App\Config;

final class DebugConfig
{
    private static ?bool $enabled = null;

    public static function isEnabled(string $baseDir = __DIR__ . '/../..'): bool
    {
        if (self::$enabled !== null) {
            return self::$enabled;
        }

        self::$enabled = false;
        
        $envFile = $baseDir . DIRECTORY_SEPARATOR . '.env';
        if (is_file($envFile)) {
            $contents = file_get_contents($envFile);
            if ($contents !== false) {
                $lines = explode("\n", $contents);
                foreach ($lines as $line) {
                    $line = trim($line);
                    if (str_starts_with($line, 'APP_DEBUG=')) {
                        $val = strtolower(trim(substr($line, 10), " \t\n\r\0\x0B\"'"));
                        self::$enabled = ($val === 'true' || $val === '1' || $val === 'on');
                        break;
                    }
                }
            }
        }

        return self::$enabled;
    }
}
