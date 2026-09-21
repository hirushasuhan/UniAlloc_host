<?php
// ============================================================
// UniAlloc — Server-side Name validation rules
// ------------------------------------------------------------
// Names cannot contain numbers or disallowed special characters.
// Accepts letters (including Unicode), spaces, periods, hyphens,
// and apostrophes.
// ============================================================

declare(strict_types=1);

namespace App\Helpers;

class NamePolicy
{
    public const MIN_LENGTH = 2;
    public const MAX_LENGTH = 100;

    /**
     * Returns an error message if invalid, or null if valid.
     */
    public static function check(string $name, string $fieldName = 'Full name'): ?string
    {
        $trimmed = trim($name);

        if ($trimmed === '') {
            return "$fieldName is required.";
        }

        if (preg_match('/[0-9]/', $trimmed)) {
            return "$fieldName cannot contain numbers.";
        }

        if (mb_strlen($trimmed) < self::MIN_LENGTH) {
            return "$fieldName must be at least " . self::MIN_LENGTH . " characters.";
        }

        if (mb_strlen($trimmed) > self::MAX_LENGTH) {
            return "$fieldName cannot exceed " . self::MAX_LENGTH . " characters.";
        }

        // Must only contain letters (including unicode), spaces, periods, hyphens, and apostrophes
        if (!preg_match('/^[\p{L}\s.\'-]+$/u', $trimmed)) {
            return "$fieldName can only contain letters, spaces, dots, and hyphens.";
        }

        return null;
    }

    /**
     * Rejects request with 422 error if name fails validation.
     */
    public static function enforce(string $name, string $fieldName = 'Full name'): void
    {
        $error = self::check($name, $fieldName);
        if ($error !== null) {
            Response::error($error, 422);
        }
    }
}
