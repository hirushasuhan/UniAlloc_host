-- ============================================================
-- Migration 10: Link work_requests to assignments
-- ============================================================

ALTER TABLE `work_requests`
  ADD COLUMN `assignment_id` INT UNSIGNED NULL DEFAULT NULL AFTER `target_role`,
  ADD CONSTRAINT `fk_wreq_assignment` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`) ON DELETE SET NULL;

-- Backfill existing approved work requests
UPDATE `work_requests` wr
JOIN `assignments` a ON a.title = wr.title AND a.assigned_to = wr.target_user_id AND a.assigned_by = wr.requester_id
SET wr.assignment_id = a.id
WHERE wr.assignment_id IS NULL;
