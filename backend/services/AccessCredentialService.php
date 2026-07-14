<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\AccessCredentialRepository;
use InvalidArgumentException;
use RuntimeException;

final class AccessCredentialService
{
    public function __construct(private readonly AccessCredentialRepository $credentials)
    {
    }

    public function setPassword(string $password): void
    {
        if (strlen($password) < 8) {
            throw new InvalidArgumentException('The access password must contain at least 8 characters.');
        }

        $passwordHash = password_hash($password, PASSWORD_DEFAULT);

        if ($passwordHash === false) {
            throw new RuntimeException('Unable to hash the access password.');
        }

        $this->credentials->savePasswordHash($passwordHash);
    }
}
