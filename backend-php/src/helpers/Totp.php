<?php
// ============================================================
// UniAlloc — Hand-coded TOTP (RFC 6238 / RFC 4226) — no third-party library
// Used ONLY as a self-service password-recovery factor (not as a login MFA
// step). A user enrolls once; the code is later required to reset a
// forgotten password without involving the System Administrator.
// ============================================================

namespace App\Helpers;

class Totp
{
    private const PERIOD = 30;   // seconds per code
    private const DIGITS = 6;
    private const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; // RFC 4648 base32

    /** Generates a fresh random base32 secret for a new enrollment. */
    public static function generateSecret(int $bytes = 20): string
    {
        return self::base32Encode(random_bytes($bytes));
    }

    /**
     * otpauth:// URI that authenticator apps understand (used to build a QR
     * code, or entered as text if the user's app supports "paste a link").
     */
    public static function otpAuthUrl(string $secret, string $accountLabel, string $issuer = 'UniAlloc'): string
    {
        $label = rawurlencode("$issuer:$accountLabel");
        $query = http_build_query([
            'secret'    => $secret,
            'issuer'    => $issuer,
            'algorithm' => 'SHA1',
            'digits'    => self::DIGITS,
            'period'    => self::PERIOD,
        ]);
        return "otpauth://totp/$label?$query";
    }

    /**
     * Verifies a 6-digit code against the secret. Allows the current step
     * plus one step before/after (±30s) to tolerate clock drift between the
     * user's phone and this server.
     */
    public static function verify(string $secret, string $code, int $window = 1): bool
    {
        $code = preg_replace('/\s+/', '', (string)$code);
        if (!preg_match('/^\d{6}$/', $code)) {
            return false;
        }

        $counter = intdiv(time(), self::PERIOD);
        for ($i = -$window; $i <= $window; $i++) {
            if (hash_equals(self::hotp($secret, $counter + $i), $code)) {
                return true;
            }
        }
        return false;
    }

    private static function hotp(string $secret, int $counter): string
    {
        $key  = self::base32Decode($secret);
        $bin  = pack('N*', 0, $counter); // 8-byte big-endian counter
        $hash = hash_hmac('sha1', $bin, $key, true);

        $offset    = ord($hash[19]) & 0x0F;
        $truncated = ((ord($hash[$offset])     & 0x7F) << 24)
                   | ((ord($hash[$offset + 1]) & 0xFF) << 16)
                   | ((ord($hash[$offset + 2]) & 0xFF) << 8)
                   |  (ord($hash[$offset + 3]) & 0xFF);

        $code = $truncated % (10 ** self::DIGITS);
        return str_pad((string)$code, self::DIGITS, '0', STR_PAD_LEFT);
    }

    private static function base32Encode(string $data): string
    {
        $bits = '';
        foreach (str_split($data) as $char) {
            $bits .= str_pad(decbin(ord($char)), 8, '0', STR_PAD_LEFT);
        }
        $output = '';
        foreach (str_split($bits, 5) as $chunk) {
            if (strlen($chunk) < 5) $chunk = str_pad($chunk, 5, '0');
            $output .= self::ALPHABET[bindec($chunk)];
        }
        return $output;
    }

    private static function base32Decode(string $b32): string
    {
        $b32  = strtoupper(preg_replace('/[^A-Za-z2-7]/', '', $b32));
        $bits = '';
        foreach (str_split($b32) as $char) {
            $pos = strpos(self::ALPHABET, $char);
            if ($pos === false) continue;
            $bits .= str_pad(decbin($pos), 5, '0', STR_PAD_LEFT);
        }
        $bytes = '';
        foreach (str_split($bits, 8) as $byte) {
            if (strlen($byte) < 8) continue; // drop incomplete trailing bits
            $bytes .= chr(bindec($byte));
        }
        return $bytes;
    }
}
