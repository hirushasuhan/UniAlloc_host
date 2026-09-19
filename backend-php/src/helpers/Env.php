<?php
// ============================================================
// UniAlloc — Minimal .env loader (no third-party library)
// ------------------------------------------------------------
// Secrets (JWT signing key, DB credentials, encryption key) live in
// backend-php/.env, which is gitignored. Never commit that file.
// Copy .env.example to .env and fill it in on each machine.
// ============================================================

namespace App\Helpers;

class Env
{
    private static array $vars = [];
    private static bool  $loaded = false;

    public static function load(string $path): void
    {
        if (self::$loaded) return;
        self::$loaded = true;

        if (!is_file($path) || !is_readable($path)) return;

        foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#') continue;

            $pos = strpos($line, '=');
            if ($pos === false) continue;

            $key = trim(substr($line, 0, $pos));
            $val = trim(substr($line, $pos + 1));

            // strip one layer of surrounding quotes, if present
            $len = strlen($val);
            if ($len >= 2 &&
                (($val[0] === '"' && $val[$len - 1] === '"') ||
                 ($val[0] === "'" && $val[$len - 1] === "'"))) {
                $val = substr($val, 1, -1);
            }

            if ($key !== '') self::$vars[$key] = $val;
        }
    }

    public static function get(string $key, ?string $default = null): ?string
    {
        $value = self::$vars[$key] ?? getenv($key);
        if ($value === false || $value === null || $value === '') return $default;
        return (string)$value;
    }

    public static function int(string $key, int $default = 0): int
    {
        $value = self::get($key);
        return $value === null ? $default : (int)$value;
    }

    public static function bool(string $key, bool $default = false): bool
    {
        $value = self::get($key);
        if ($value === null) return $default;
        return in_array(strtolower($value), ['1', 'true', 'yes', 'on'], true);
    }

    /** Comma-separated list → trimmed array (e.g. CORS_ORIGINS). */
    public static function list(string $key, array $default = []): array
    {
        $value = self::get($key);
        if ($value === null) return $default;
        return array_values(array_filter(array_map('trim', explode(',', $value)), fn($v) => $v !== ''));
    }
}
