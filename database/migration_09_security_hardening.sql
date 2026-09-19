-- ============================================================
-- UniAlloc — Migration 09: Security Hardening
-- ------------------------------------------------------------
-- 1. users.token_version — lets the server revoke already-issued JWTs.
--    Every token carries the version it was minted with; bumping the
--    column instantly invalidates all of that user's existing sessions.
--    Bumped on password change, admin password reset, self-service
--    recovery, deactivation, and role changes.
--
-- 2. login_attempts — records authentication attempts so the login
--    endpoint can throttle brute-force guessing per account AND per IP.
--    (Previously there was no rate limiting on /auth/login at all.)
--
-- Run AFTER migration_08 if your DB already exists:
--   mysql -u root uniAlloc_db < database/migration_09_security_hardening.sql
-- ============================================================

USE `uniAlloc_db`;

ALTER TABLE `users`
  ADD COLUMN `token_version` INT UNSIGNED NOT NULL DEFAULT 0
    COMMENT 'Bumped to revoke all outstanding JWTs for this user'
    AFTER `totp_locked_until`;

CREATE TABLE IF NOT EXISTS `login_attempts` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `identifier`   VARCHAR(200) NOT NULL COMMENT 'Lower-cased email that was attempted',
  `ip_address`   VARCHAR(45)  NOT NULL COMMENT 'IPv4 or IPv6 address of the client',
  `successful`   TINYINT(1)   NOT NULL DEFAULT 0,
  `attempted_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_login_attempts_identifier` (`identifier`, `attempted_at`),
  KEY `idx_login_attempts_ip`         (`ip_address`, `attempted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Existing sessions are invalidated on deploy: tokens minted before this
-- migration carry no version claim and will be rejected, forcing a re-login
-- against the freshly rotated JWT_SECRET.
