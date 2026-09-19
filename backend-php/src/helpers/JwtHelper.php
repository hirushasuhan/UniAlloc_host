<?php
// ============================================================
// UniAlloc — Hand-coded JWT (HS256) — no third-party library
// ============================================================

namespace App\Helpers;

class JwtHelper
{
    /**
     * A missing or trivially short signing key would let anyone forge tokens,
     * so refuse to run at all rather than degrade silently.
     */
    private static function secret(array $cfg): string
    {
        $secret = (string)($cfg['jwt_secret'] ?? '');
        if (strlen($secret) < 32) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => 'Server misconfigured: JWT_SECRET is missing or too short. Set it in backend-php/.env (see .env.example).',
            ]);
            exit;
        }
        return $secret;
    }

    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string
    {
        return base64_decode(strtr($data, '-_', '+/'));
    }

    public static function generate(array $payload): string
    {
        $cfg    = require __DIR__ . '/../../config/app.php';
        $secret = self::secret($cfg);
        $ttl    = (int)$cfg['jwt_ttl'] * 60; // convert minutes to seconds

        $header  = self::base64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $payload['iat'] = time();
        $payload['exp'] = time() + $ttl;
        $payloadEnc = self::base64UrlEncode(json_encode($payload));

        $signature = self::base64UrlEncode(
            hash_hmac('sha256', "$header.$payloadEnc", $secret, true)
        );

        return "$header.$payloadEnc.$signature";
    }

    /**
     * Validates a token. Returns decoded payload array or null on failure.
     */
    public static function validate(string $token): ?array
    {
        $cfg    = require __DIR__ . '/../../config/app.php';
        $secret = self::secret($cfg);

        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        [$header, $payloadEnc, $sig] = $parts;
        $expected = self::base64UrlEncode(
            hash_hmac('sha256', "$header.$payloadEnc", $secret, true)
        );

        if (!hash_equals($expected, $sig)) {
            return null;
        }

        $payload = json_decode(self::base64UrlDecode($payloadEnc), true);
        if (!$payload || (isset($payload['exp']) && $payload['exp'] < time())) {
            return null;
        }

        return $payload;
    }
}
