-- ============================================================
-- UniAlloc — Migration 05: Split honorific `title` from `position`
-- ------------------------------------------------------------
-- The single `position` column mixed two different things:
--   * honorifics    (Dr, Prof, Mr, Mrs, Ms, Miss, Rev, Thero)
--   * academic ranks (Senior Professor, Professor, Senior Lecturer, Lecturer)
-- A person can be BOTH "Dr." AND a "Senior Lecturer", which a single
-- column cannot represent. This adds a separate `title` column and moves
-- the honorific values across.
-- Run AFTER migration_02 if your DB already exists:
--   mysql -u root uniAlloc_db < database/migration_05_split_title_position.sql
-- ============================================================

USE `uniAlloc_db`;

-- 1. New honorific / name-prefix column
ALTER TABLE `users`
  ADD COLUMN `title` VARCHAR(20) NULL DEFAULT NULL
    COMMENT 'Honorific prefix shown before the name, e.g. Dr, Prof, Mr, Mrs, Ms, Miss, Rev, Thero'
    AFTER `full_name`;

-- 2. Move pure-honorific values out of `position` into `title`
UPDATE `users`
   SET `title`    = `position`,
       `position` = NULL
 WHERE `position` IN ('Dr','Mr','Mrs','Ms','Miss','Rev','Thero');

-- 3. Normalise rank names to the new canonical values
UPDATE `users` SET `position` = 'Senior Professor' WHERE `position` = 'Senior Prof';

-- 'Prof' was ambiguous (used as an honorific AND a rank):
-- keep the honorific in `title` and record the rank in `position`.
UPDATE `users`
   SET `title`    = 'Prof',
       `position` = 'Professor'
 WHERE `position` = 'Prof';

-- 4. Refresh the `position` column comment to reflect its new meaning (ranks only)
ALTER TABLE `users`
  MODIFY COLUMN `position` VARCHAR(50) NULL DEFAULT NULL
    COMMENT 'Academic rank / job position (full allowed list in UserDao::POSITIONS): Senior/Associate Professor, Senior Lecturer (Grade I/II), Lecturer (Grade I/II), Probationary/Assistant/Temporary/Visiting Lecturer, Instructor, Demonstrator, Research Assistant';
