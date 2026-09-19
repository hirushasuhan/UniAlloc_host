-- ============================================================
-- UniAlloc — Migration 02: Add academic/professional position to users
-- Run AFTER the original schema.sql (and migration_01) if your DB already exists:
--   mysql -u root uniAlloc_db < database/migration_02_user_position.sql
-- ============================================================

USE `uniAlloc_db`;

ALTER TABLE `users`
  ADD COLUMN `position` VARCHAR(50) NULL DEFAULT NULL
    COMMENT 'Academic/professional title, e.g. Senior Prof, Prof, Senior Lecturer, Lecturer, Dr, Mr, Mrs, Ms, Miss, Rev, Thero'
    AFTER `full_name`;
