<?php
// ============================================================
// UniAlloc — Server-side contact-number rules
// ------------------------------------------------------------
// The form's `required` attribute and input type are hints, not controls:
// anything that accepts a contact number must call enforce() before storing
// it, or "123" reaches the database and the supervisor has no way to contact
// the student.
//
// Accepts E.164-style international numbers so overseas students and staff
// are not locked out:
//     +94771234567     0094771234567     0771234567     771234567
// Separators (spaces, dashes, brackets, dots) are stripped first, and the
// cleaned form is what gets stored — so one person's "077 123 4567" and
// another's "077-123-4567" end up identical in the database.
// ============================================================

namespace App\Helpers;

class ContactPolicy
{
    // E.164 allows at most 15 digits; the shortest national numbers run to 8.
    private const MIN_INTL_DIGITS  = 8;
    private const MAX_INTL_DIGITS  = 15;
    // Without a country code, anything under 9 digits is a typo, and 12 is
    // generous enough for national formats that carry a trunk prefix.
    private const MIN_LOCAL_DIGITS = 9;
    private const MAX_LOCAL_DIGITS = 12;

    /**
     * Strips separators and rewrites a 00 international prefix as '+'.
     * This is the value that should be written to the database.
     */
    public static function normalise(string $contact): string
    {
        $clean = preg_replace('/[\s\-().]/', '', trim($contact)) ?? '';

        if (str_starts_with($clean, '00')) {
            $clean = '+' . substr($clean, 2);
        }

        return $clean;
    }

    /** Returns an error message, or null when the number is acceptable. */
    public static function check(string $contact): ?string
    {
        $clean = self::normalise($contact);

        if ($clean === '') {
            return 'Contact number is required.';
        }

        if (!preg_match('/^\+?[0-9]+$/', $clean)) {
            return 'Contact number may only contain digits, and may start with +.';
        }

        $digits = ltrim($clean, '+');
        $length = strlen($digits);

        if (str_starts_with($clean, '+')) {
            if ($length < self::MIN_INTL_DIGITS || $length > self::MAX_INTL_DIGITS) {
                return 'Enter a valid international number, e.g. +94771234567.';
            }
        } elseif ($length < self::MIN_LOCAL_DIGITS || $length > self::MAX_LOCAL_DIGITS) {
            return 'Enter a valid contact number, e.g. 0771234567 or +94771234567.';
        }

        // 0000000000 / 1111111111 and friends are what gets typed to get past
        // a "required" field, never a real number.
        if (preg_match('/^(\d)\1+$/', $digits)) {
            return 'That does not look like a real contact number.';
        }

        return null;
    }

    /** Rejects the request with 422 when the number is unusable. */
    public static function enforce(string $contact): void
    {
        $error = self::check($contact);
        if ($error !== null) {
            Response::error($error, 422);
        }
    }
}
