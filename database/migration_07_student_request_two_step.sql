-- ============================================================
-- UniAlloc — Migration 07: Two-step student supervisor request approval
-- ------------------------------------------------------------
-- Student supervisor requests no longer go straight to the Dean.
-- They now flow through a mandatory two-step chain:
--
--   Step 1 (pending_home_head) — the head of the STUDENT'S OWN department
--           endorses the request (and may suggest a supervisor).
--   Step 2 (pending_final)     — the final approver assigns the supervisor
--           and approves:
--             • Same faculty (own department / faculty-wide) → the Dean.
--             • Cross department  → the TARGET department's Head.
--             • Cross faculty (faculty-wide) → the TARGET faculty's Dean.
--
-- `status` keeps the final outcome (pending / assigned / rejected) so all
-- existing badges & queries keep working. `approval_step` tracks where the
-- request currently sits in the chain.
--
-- Run AFTER migration_06 if your DB already exists:
--   mysql -u root uniAlloc_db < database/migration_07_student_request_two_step.sql
-- ============================================================

USE `uniAlloc_db`;

ALTER TABLE `student_requests`
  -- Where the request currently sits in the two-step chain
  ADD COLUMN `approval_step` ENUM(
      'pending_home_head',  -- waiting for the student's own department head to endorse
      'pending_final',      -- waiting for the final approver (dean / target dept head)
      'approved',           -- fully approved & assignment created
      'rejected'            -- rejected at either step
  ) NOT NULL DEFAULT 'pending_home_head'
    AFTER `status`,

  -- Step-1 endorsement tracking (student's own department head)
  ADD COLUMN `home_head_approved_by` INT UNSIGNED NULL DEFAULT NULL AFTER `reviewed_by`,
  ADD COLUMN `home_head_approved_at` TIMESTAMP    NULL DEFAULT NULL AFTER `home_head_approved_by`,

  -- Optional supervisor suggested by the home department head at step 1
  ADD COLUMN `suggested_supervisor_id` INT UNSIGNED NULL DEFAULT NULL AFTER `home_head_approved_at`,

  ADD KEY `idx_sreq_approval_step` (`approval_step`),

  ADD CONSTRAINT `fk_sreq_home_head`
    FOREIGN KEY (`home_head_approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,

  ADD CONSTRAINT `fk_sreq_suggested`
    FOREIGN KEY (`suggested_supervisor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

-- Backfill existing rows so historic data stays consistent:
--   already assigned  → approved
--   already rejected  → rejected
--   still pending     → start at step 1 (pending_home_head, the column default)
UPDATE `student_requests` SET `approval_step` = 'approved' WHERE `status` = 'assigned';
UPDATE `student_requests` SET `approval_step` = 'rejected' WHERE `status` = 'rejected';
