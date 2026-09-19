-- ============================================================
-- UniAlloc — Migration 01: Multi-step cross-faculty approval chain
-- Run AFTER the original schema.sql if your DB already exists:
--   mysql -u root uniAlloc_db < database/migration_01_approval_chain.sql
-- ============================================================

USE `uniAlloc_db`;

ALTER TABLE `work_requests`
  -- Role of the target person (dean / department_head / lecturer)
  ADD COLUMN `target_role`            VARCHAR(30)  NULL DEFAULT NULL
    AFTER `request_type`,

  -- Current approval step
  ADD COLUMN `approval_step` ENUM(
      'pending_dean',       -- waiting for target faculty's dean
      'pending_dept_head',  -- waiting for target lecturer's dept head
      'pending_assignee',   -- waiting for the target person to accept
      'approved',           -- fully approved & assignment created
      'rejected'            -- rejected at any step
  ) NOT NULL DEFAULT 'pending_assignee'
    AFTER `status`,

  -- Dean approval tracking
  ADD COLUMN `dean_approved_by`       INT UNSIGNED NULL DEFAULT NULL,
  ADD COLUMN `dean_approved_at`       TIMESTAMP    NULL DEFAULT NULL,

  -- Dept-head approval tracking
  ADD COLUMN `dept_head_approved_by`  INT UNSIGNED NULL DEFAULT NULL,
  ADD COLUMN `dept_head_approved_at`  TIMESTAMP    NULL DEFAULT NULL,

  ADD CONSTRAINT `fk_wreq_dean_app`
    FOREIGN KEY (`dean_approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,

  ADD CONSTRAINT `fk_wreq_dh_app`
    FOREIGN KEY (`dept_head_approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;
