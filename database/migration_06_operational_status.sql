-- ============================================================
-- UniAlloc — Migration 06: Lecturer Operational Status
-- ------------------------------------------------------------
-- "Study leave" used to be a ROLE (roles.role_name = 'on_study_leave'),
-- which conflated a temporary availability state with a permanent role.
-- This introduces a dedicated `operational_status` column on users so a
-- lecturer keeps their real role while their availability is tracked
-- separately: Available, On Study Leave, Temporarily Not Available, On Vacation.
--
-- Run AFTER migration_05 if your DB already exists:
--   mysql -u root uniAlloc_db < database/migration_06_operational_status.sql
-- ============================================================

USE `uniAlloc_db`;

-- 1. New availability column (defaults to Available for everyone)
ALTER TABLE `users`
  ADD COLUMN `operational_status` VARCHAR(30) NOT NULL DEFAULT 'Available'
    COMMENT 'Lecturer availability: Available, On Study Leave, Temporarily Not Available, On Vacation'
    AFTER `capacity_hours`;

-- 2. Convert anyone currently sitting on the on_study_leave ROLE back to a
--    normal Lecturer, and record their availability as "On Study Leave".
UPDATE `users` u
  JOIN `roles` r ON r.id = u.role_id
   SET u.`operational_status` = 'On Study Leave',
       u.`role_id` = (SELECT id FROM `roles` WHERE role_name = 'lecturer')
 WHERE r.role_name = 'on_study_leave';

-- NOTE: the 'on_study_leave' row in `roles` is intentionally kept for
-- backward compatibility (old audit/promotion history may reference it),
-- but it is no longer offered as a selectable role in the UI.
