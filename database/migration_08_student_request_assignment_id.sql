-- ============================================================
-- Migration 08: Link student_requests to assignments
-- ============================================================

ALTER TABLE `student_requests`
  ADD COLUMN `assignment_id` INT UNSIGNED NULL DEFAULT NULL AFTER `suggested_supervisor_id`,
  ADD CONSTRAINT `fk_sreq_assignment` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`) ON DELETE SET NULL;

UPDATE `student_requests` sr
JOIN `assignments` a ON a.assigned_to = sr.assigned_to AND a.title = CONCAT('Student Supervision: ', sr.title)
SET sr.assignment_id = a.id
WHERE sr.assignment_id IS NULL;
