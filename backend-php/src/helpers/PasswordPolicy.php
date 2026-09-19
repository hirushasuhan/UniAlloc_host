<?php
// ============================================================
// UniAlloc — Server-side password rules
// ------------------------------------------------------------
// The frontend's minLength attribute is a hint, not a control: anything
// that accepts a password must call enforce() before storing it.
// ============================================================

namespace App\Helpers;

class PasswordPolicy
{
    public const MIN_LENGTH = 8;

    /** Returns an error message, or null when the password is acceptable. */
    public static function check(string $password): ?string
    {
        if (strlen($password) < self::MIN_LENGTH) {
            return 'Password must be at least ' . self::MIN_LENGTH . ' characters long.';
        }
        if (!preg_match('/[A-Za-z]/', $password)) {
            return 'Password must contain at least one letter.';
        }
        if (!preg_match('/\d/', $password)) {
            return 'Password must contain at least one number.';
        }
        return null;
    }

    /** Rejects the request with 422 when the password is too weak. */
    public static function enforce(string $password): void
    {
        $error = self::check($password);
        if ($error !== null) {
            Response::error($error, 422);
        }
    }

    /**
     * Cryptographically secure temporary password.
     *
     * The previous implementation used substr(str_shuffle($alphabet), 0, 8),
     * which draws from PHP's Mt19937 generator (not a CSPRNG) and could never
     * repeat a character — both of which shrink the search space badly.
     * Ambiguous glyphs (0/O/1/l/I) are left out so the password can be read
     * aloud or copied off a screen without mistakes.
     */
    public static function generateTemporary(int $length = 12): string
    {
        $alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $max      = strlen($alphabet) - 1;

        do {
            $password = '';
            for ($i = 0; $i < $length; $i++) {
                $password .= $alphabet[random_int(0, $max)];
            }
        } while (self::check($password) !== null); // guarantee it satisfies our own policy

        return $password;
    }
}
