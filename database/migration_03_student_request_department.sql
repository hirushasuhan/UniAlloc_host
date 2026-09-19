-- ============================================================
-- Migration 03 — Student supervisor requests: target department
-- Students now pick a Faculty AND a Department when submitting
-- a supervisor request. The request is visible to that faculty's
-- Dean and that department's Department Head.
-- Run this against the existing database once.
-- ============================================================

ALTER TABLE `student_requests`
  ADD COLUMN `department_id` INT UNSIGNED NULL DEFAULT NULL AFTER `faculty_id`;

ALTER TABLE `student_requests`
  ADD KEY `idx_sreq_department` (`department_id`);

ALTER TABLE `student_requests`
  ADD CONSTRAINT `fk_sreq_department`
    FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`)
    ON DELETE SET NULL;
