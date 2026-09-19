<?php
// ============================================================
// UniAlloc — Authentication throttling
// ------------------------------------------------------------
// Records every login/registration attempt so repeated failures can be
// blocked. Without this, /auth/login accepts unlimited password guesses
// against predictable institutional addresses.
// ============================================================

namespace App\Dao;

use App\Helpers\Db;

class LoginAttemptDao
{
    public const MAX_PER_IDENTIFIER = 5;   // failures per account
    public const MAX_PER_IP         = 20;  // failures per source address
    public const WINDOW_MINUTES     = 15;

    public static function record(string $identifier, string $ip, bool $successful): void
    {
        Db::connection()->prepare(
            'INSERT INTO login_attempts (identifier, ip_address, successful) VALUES (:id, :ip, :ok)'
        )->execute([
            ':id' => mb_substr(strtolower($identifier), 0, 200),
            ':ip' => mb_substr($ip, 0, 45),
            ':ok' => $successful ? 1 : 0,
        ]);

        // Occasional opportunistic cleanup so the table can't grow forever.
        if (random_int(1, 100) === 1) {
            Db::connection()->exec(
                'DELETE FROM login_attempts WHERE attempted_at < DATE_SUB(NOW(), INTERVAL 7 DAY)'
            );
        }
    }

    /**
     * True when either the account or the source IP has failed too often
     * inside the window. Counting both blocks focused guessing at one
     * account and spraying across many accounts from one host.
     */
    public static function isThrottled(string $identifier, string $ip): bool
    {
        $window = (int)self::WINDOW_MINUTES; // trusted constant, safe to inline
        $db     = Db::connection();

        $stmt = $db->prepare(
            "SELECT COUNT(*) AS c FROM login_attempts
             WHERE identifier = :id AND successful = 0
               AND attempted_at > DATE_SUB(NOW(), INTERVAL $window MINUTE)"
        );
        $stmt->execute([':id' => mb_substr(strtolower($identifier), 0, 200)]);
        if ((int)($stmt->fetch()['c'] ?? 0) >= self::MAX_PER_IDENTIFIER) {
            return true;
        }

        $stmt = $db->prepare(
            "SELECT COUNT(*) AS c FROM login_attempts
             WHERE ip_address = :ip AND successful = 0
               AND attempted_at > DATE_SUB(NOW(), INTERVAL $window MINUTE)"
        );
        $stmt->execute([':ip' => mb_substr($ip, 0, 45)]);
        return (int)($stmt->fetch()['c'] ?? 0) >= self::MAX_PER_IP;
    }

    /** Clears the failure streak for an account after a successful sign-in. */
    public static function clearFailures(string $identifier): void
    {
        Db::connection()
          ->prepare('DELETE FROM login_attempts WHERE identifier = :id AND successful = 0')
          ->execute([':id' => mb_substr(strtolower($identifier), 0, 200)]);
    }

    /**
     * Source address of the current request. Deliberately ignores
     * X-Forwarded-For: that header is attacker-controlled unless a trusted
     * proxy is known to rewrite it, and trusting it would make the IP limit
     * trivially bypassable.
     */
    public static function clientIp(): string
    {
        return (string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    }
}
