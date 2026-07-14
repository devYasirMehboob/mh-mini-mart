<?php

declare(strict_types=1);

namespace App\Security;

use App\Http\HttpException;

final class SessionManager
{
    public function start(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }

        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        session_name('mh_mini_mart_session');
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();
    }

    public function csrfToken(): string
    {
        if (!isset($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }

        return (string) $_SESSION['csrf_token'];
    }

    public function verifyCsrfToken(): void
    {
        $providedToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        $sessionToken = $_SESSION['csrf_token'] ?? '';

        if ($sessionToken === '' || !hash_equals((string) $sessionToken, $providedToken)) {
            throw new HttpException(
                'Your session could not be verified. Refresh the page and try again.',
                403
            );
        }
    }

    public function authenticate(array $user): string
    {
        session_regenerate_id(true);
        $_SESSION['user'] = $user;
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        $_SESSION['last_activity_at'] = time();

        return (string) $_SESSION['csrf_token'];
    }

    public function enforceInactivity(bool $enabled, int $timeoutMinutes): void
    {
        if (!$enabled || $this->user() === null) {
            return;
        }

        $lastActivity = (int) ($_SESSION['last_activity_at'] ?? time());
        if (time() - $lastActivity > $timeoutMinutes * 60) {
            $this->destroy();
            throw new HttpException('Your session was closed after a period of inactivity. Please log in again.', 401);
        }

        $_SESSION['last_activity_at'] = time();
    }

    public function user(): ?array
    {
        return isset($_SESSION['user']) && is_array($_SESSION['user'])
            ? $_SESSION['user']
            : null;
    }

    public function destroy(): void
    {
        $_SESSION = [];

        if (ini_get('session.use_cookies')) {
            $parameters = session_get_cookie_params();
            setcookie(session_name(), '', [
                'expires' => time() - 42000,
                'path' => $parameters['path'],
                'domain' => $parameters['domain'],
                'secure' => $parameters['secure'],
                'httponly' => $parameters['httponly'],
                'samesite' => $parameters['samesite'] ?? 'Lax',
            ]);
        }

        session_destroy();
    }
}
