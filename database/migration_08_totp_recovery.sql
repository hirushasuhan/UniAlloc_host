-- ============================================================
-- UniAlloc — Migration 08: TOTP Self-Service Password Recovery
-- ------------------------------------------------------------
-- Adds an authenticator-app (TOTP, RFC 6238) recovery factor so any
-- user can reset their own forgotten password without SMTP/SMS and
-- without going through the System Administrator.
--
--   totp_secret          base32 secret, set whenever a user (re-)enrolls
--   totp_enabled          1 once that secret has been verified once
--   totp_failed_attempts  brute-force counter on the public reset endpoint
--   totp_locked_until     temporary lockout after too many wrong codes
--
-- Existing accounts default to totp_enabled = 0, which the frontend
-- (DashboardLayout) uses to force every user through a one-time
-- enrollment wizard on their next login. An admin's "Reset Password"
-- action also wipes these columns (see UserController::resetPassword),
-- so a user who loses their phone can be bootstrapped back in by the
-- admin as before, then simply re-enrolls afterwards.
--
-- Run AFTER migration_07 if your DB already exists:
--   mysql -u root uniAlloc_db < database/migration_08_totp_recovery.sql
-- ============================================================

USE `uniAlloc_db`;

ALTER TABLE `users`
  ADD COLUMN `totp_secret` VARCHAR(255) NULL DEFAULT NULL
    COMMENT 'AES-256-GCM encrypted TOTP secret (RFC 6238), ~87 chars once encrypted; recovery only, never login'
    AFTER `password_hash`,
  ADD COLUMN `totp_enabled` TINYINT(1) NOT NULL DEFAULT 0
    COMMENT '1 once the user has verified their authenticator app; gates the forced setup wizard'
    AFTER `totp_secret`,
  ADD COLUMN `totp_failed_attempts` TINYINT UNSIGNED NOT NULL DEFAULT 0
    COMMENT 'Consecutive wrong codes on the public forgot-password endpoint'
    AFTER `totp_enabled`,
  ADD COLUMN `totp_locked_until` DATETIME NULL DEFAULT NULL
    COMMENT 'Self-service recovery is blocked until this time after too many wrong codes'
    AFTER `totp_failed_attempts`;
