<?php

declare(strict_types=1);

namespace App\Config;

use PDO;
use App\Services\Logger;

final class Database
{
    private ?PDO $connection = null;

    public function __construct(private readonly array $config, private readonly ?Logger $logger = null)
    {
    }

    public function connection(): PDO
    {
        if ($this->connection instanceof PDO) {
            return $this->connection;
        }

        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
            $this->config['host'],
            $this->config['port'],
            $this->config['database']
        );

        $this->connection = new LoggingPDO(
            $dsn,
            $this->config['username'],
            $this->config['password'],
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
            ],
            $this->logger
        );

        return $this->connection;
    }

    public function ping(): void
    {
        $statement = $this->connection()->prepare('SELECT 1');
        $statement->execute();
    }
}

class LoggingPDO extends PDO {
    private ?Logger $logger;

    public function __construct(string $dsn, ?string $username, ?string $password, ?array $options, ?Logger $logger = null) {
        parent::__construct($dsn, $username, $password, $options);
        $this->logger = $logger;
        $this->setAttribute(PDO::ATTR_STATEMENT_CLASS, [LoggingPDOStatement::class, [$this->logger]]);
    }

    public function beginTransaction(): bool {
        $start = microtime(true);
        $result = parent::beginTransaction();
        $duration = round((microtime(true) - $start) * 1000, 2);
        if ($this->logger && DebugConfig::isEnabled()) {
            $this->logger->debug('DATABASE', 'Transaction started', ['duration_ms' => $duration]);
        }
        return $result;
    }

    public function commit(): bool {
        $start = microtime(true);
        $result = parent::commit();
        $duration = round((microtime(true) - $start) * 1000, 2);
        if ($this->logger && DebugConfig::isEnabled()) {
            $this->logger->debug('DATABASE', 'Transaction committed', ['duration_ms' => $duration]);
        }
        return $result;
    }

    public function rollBack(): bool {
        $start = microtime(true);
        $result = parent::rollBack();
        $duration = round((microtime(true) - $start) * 1000, 2);
        if ($this->logger) {
            $this->logger->warning('DATABASE', 'Transaction rolled back', ['duration_ms' => $duration]);
        }
        return $result;
    }
}

class LoggingPDOStatement extends \PDOStatement {
    private ?Logger $logger;

    protected function __construct(?Logger $logger = null) {
        $this->logger = $logger;
    }

    public function execute(?array $params = null): bool {
        $start = microtime(true);
        try {
            $result = parent::execute($params);
            $duration = round((microtime(true) - $start) * 1000, 2);
            
            if ($this->logger && DebugConfig::isEnabled()) {
                $trace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 4);
                $operation = 'Unknown';
                foreach ($trace as $frame) {
                    if (isset($frame['class']) && str_ends_with($frame['class'], 'Repository')) {
                        $operation = basename(str_replace('\\', '/', $frame['class'])) . '.' . $frame['function'];
                        break;
                    }
                }
                
                $this->logger->debug('DATABASE', 'Query executed', [
                    'operation' => $operation,
                    'duration_ms' => $duration,
                    'rows' => $this->rowCount(),
                ]);
            }
            return $result;
        } catch (\PDOException $e) {
            if ($this->logger) {
                $this->logger->error('DATABASE', 'Query failed', [
                    'exception' => $e->getMessage()
                ]);
            }
            throw $e;
        }
    }
}
