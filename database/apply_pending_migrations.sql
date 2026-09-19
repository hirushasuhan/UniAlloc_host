-- ============================================================
-- UniAlloc — Apply pending schema changes (migrations 08 + 09)
-- ------------------------------------------------------------
-- SAFE TO RUN MORE THAN ONCE. Every change is guarded by a check
-- against information_schema, so anything already applied is skipped
-- instead of failing with "Duplicate column name".
--
-- Run it with the target database already selected:
--
--   mysql -u root unialloc_db < database/apply_pending_migrations.sql
--
-- ...or in phpMyAdmin: pick the database on the left, open the SQL tab,
-- paste this whole file, and press Go.
-- ============================================================

-- ---- migration 08: TOTP self-service password recovery ----

SET @ddl := IF((SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'totp_secret') > 0,
  'SELECT ''users.totp_secret already exists — skipped''',
  'ALTER TABLE `users` ADD COLUMN `totp_secret` VARCHAR(64) NULL DEFAULT NULL COMMENT ''Base32 TOTP secret (RFC 6238), used only for self-service password recovery, never for login''');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

SET @ddl := IF((SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'totp_enabled') > 0,
  'SELECT ''users.totp_enabled already exists — skipped''',
  'ALTER TABLE `users` ADD COLUMN `totp_enabled` TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''1 once the user has verified their authenticator app''');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

SET @ddl := IF((SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'totp_failed_attempts') > 0,
  'SELECT ''users.totp_failed_attempts already exists — skipped''',
  'ALTER TABLE `users` ADD COLUMN `totp_failed_attempts` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT ''Consecutive wrong codes on the public forgot-password endpoint''');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

SET @ddl := IF((SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'totp_locked_until') > 0,
  'SELECT ''users.totp_locked_until already exists — skipped''',
  'ALTER TABLE `users` ADD COLUMN `totp_locked_until` DATETIME NULL DEFAULT NULL COMMENT ''Self-service recovery is blocked until this time after too many wrong codes''');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

-- ---- migration 09: session revocation + login throttling ----

SET @ddl := IF((SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'token_version') > 0,
  'SELECT ''users.token_version already exists — skipped''',
  'ALTER TABLE `users` ADD COLUMN `token_version` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT ''Bumped to revoke all outstanding JWTs for this user''');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

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

-- ---- fix: widen totp_secret for encrypted values ----
-- The column was originally sized for the 32-character plaintext base32
-- secret. Encrypting it at rest (AES-256-GCM, base64, 'enc:v1:' prefix)
-- produces ~87 characters, so MySQL silently truncated it and the secret
-- could no longer be decrypted -- enrollment failed with "No authenticator
-- setup in progress". Widen the column, then clear any value that was
-- already truncated so those users simply enroll again.

SET @ddl := IF((SELECT CHARACTER_MAXIMUM_LENGTH FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'totp_secret') >= 255,
  'SELECT ''users.totp_secret already wide enough -- skipped''',
  'ALTER TABLE `users` MODIFY COLUMN `totp_secret` VARCHAR(255) NULL DEFAULT NULL COMMENT ''AES-256-GCM encrypted TOTP secret (RFC 6238), ~87 chars once encrypted; recovery only, never login''');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

-- Only targets truncated ciphertext: encrypted values are ~87 chars, so a
-- value that is exactly 64 is one MySQL cut off. Plaintext legacy secrets
-- (32 chars, no prefix) and valid encrypted ones are left untouched.
UPDATE `users`
   SET `totp_secret` = NULL, `totp_enabled` = 0
 WHERE `totp_secret` LIKE 'enc:v1:%'
   AND CHAR_LENGTH(`totp_secret`) = 64;

-- ---- confirm the result ----
SELECT
  (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
      AND COLUMN_NAME IN ('totp_secret','totp_enabled','totp_failed_attempts','totp_locked_until','token_version')) AS user_columns_added_of_5,
  (SELECT COUNT(*) FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'login_attempts') AS login_attempts_table,
  (SELECT CHARACTER_MAXIMUM_LENGTH FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'totp_secret') AS totp_secret_size;
