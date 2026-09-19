<?php
// ============================================================
// UniAlloc — Authenticated encryption for secrets at rest (AES-256-GCM)
// ------------------------------------------------------------
// Used for users.totp_secret. A TOTP secret is a password-equivalent: with
// it, anyone can mint valid codes and drive the self-service reset flow. So
// it must not sit in the database in plaintext where a backup copy or a
// stray SELECT would expose it.
//
// The key lives in APP_KEY (backend-php/.env), outside the database, so a
// database-only compromise doesn't yield usable secrets.
// ============================================================

namespace App\Helpers;

class Crypto
{
    private const CIPHER    = 'aes-256-gcm';
    private const PREFIX    = 'enc:v1:';
    private const IV_BYTES  = 12;
    private const TAG_BYTES = 16;

    public static function encrypt(string $plaintext): string
    {
        $key = self::key();
        $iv  = random_bytes(self::IV_BYTES);
        $tag = '';

        $ciphertext = openssl_encrypt($plaintext, self::CIPHER, $key, OPENSSL_RAW_DATA, $iv, $tag, '', self::TAG_BYTES);
        if ($ciphertext === false) {
            throw new \RuntimeException('Encryption failed');
        }

        return self::PREFIX . base64_encode($iv . $tag . $ciphertext);
    }

    /**
     * Returns the plaintext, or null if the value can't be decrypted
     * (wrong/rotated APP_KEY, or tampered ciphertext).
     *
     * Values without our prefix are returned unchanged: rows written before
     * encryption was introduced stay readable, so no data migration is needed.
     */
    public static function decrypt(?string $value): ?string
    {
        if ($value === null || $value === '') return null;

        if (!str_starts_with($value, self::PREFIX)) {
            return $value; // legacy plaintext
        }

        $raw = base64_decode(substr($value, strlen(self::PREFIX)), true);
        if ($raw === false || strlen($raw) <= self::IV_BYTES + self::TAG_BYTES) {
            // Most likely the stored value was truncated by a column that is
            // too narrow (encrypted values run ~87 chars), or APP_KEY changed.
            error_log('[UniAlloc] Crypto::decrypt — stored value is malformed or truncated (length ' . strlen($value) . ')');
            return null;
        }

        $iv         = substr($raw, 0, self::IV_BYTES);
        $tag        = substr($raw, self::IV_BYTES, self::TAG_BYTES);
        $ciphertext = substr($raw, self::IV_BYTES + self::TAG_BYTES);

        $plaintext = openssl_decrypt($ciphertext, self::CIPHER, self::key(), OPENSSL_RAW_DATA, $iv, $tag);
        if ($plaintext === false) {
            error_log('[UniAlloc] Crypto::decrypt — authentication failed; APP_KEY may have changed since this value was written');
            return null;
        }
        return $plaintext;
    }

    private static function key(): string
    {
        $cfg = require __DIR__ . '/../../config/app.php';
        $hex = (string)($cfg['app_key'] ?? '');

        if (strlen($hex) !== 64 || !ctype_xdigit($hex)) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => 'Server misconfigured: APP_KEY must be 64 hex characters. Generate one with: php -r "echo bin2hex(random_bytes(32));"',
            ]);
            exit;
        }

        return hex2bin($hex);
    }
}
