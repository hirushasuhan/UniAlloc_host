-- ============================================================
-- UniAlloc — Seed Data
-- Run AFTER schema.sql:
--   mysql -u root uniAlloc_db < seed.sql
-- ============================================================
-- Passwords are bcrypt hashes of the plain-text values below:
--   Admin@123   → admin
--   Dean@123    → deans
--   Head@123    → dept heads
--   Lecturer@123→ lecturers
--   Student@123 → student
-- ============================================================

-- Select the database to use
USE `uniAlloc_db`;

SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------
-- Roles
-- -----------------------------------------------------------
INSERT IGNORE INTO `roles` (`id`, `role_name`) VALUES
  (1, 'system_admin'),
  (2, 'dean'),
  (3, 'department_head'),
  (4, 'lecturer'),
  (5, 'student'),
  (6, 'on_study_leave');

-- -----------------------------------------------------------
-- Faculties (dean_id will be updated after users are inserted)
-- -----------------------------------------------------------
INSERT IGNORE INTO `faculties` (`id`, `faculty_name`) VALUES
  (1, 'Faculty of Computing'),
  (2, 'Faculty of Engineering');

-- -----------------------------------------------------------
-- Departments (head_id will be updated after users are inserted)
-- -----------------------------------------------------------
INSERT IGNORE INTO `departments` (`id`, `dept_name`, `faculty_id`) VALUES
  (1, 'Computer Science',       1),
  (2, 'Software Engineering',   1),
  (3, 'Civil Engineering',      2),
  (4, 'Electrical Engineering', 2);

-- -----------------------------------------------------------
-- Users
-- Password hashes generated with password_hash($pw, PASSWORD_BCRYPT, ['cost'=>12])
-- -----------------------------------------------------------

-- System Admin  (no department)
INSERT IGNORE INTO `users`
  (`id`,`full_name`,`email`,`password_hash`,`role_id`,`department_id`,`capacity_hours`) VALUES
  (1, 'System Administrator',
   'admin@university.edu',
   '$2b$10$nBIhCNJQfZSrEJeZjh6daeY3BWxQ1UCzUEbu8aUA.RvAkAe1FNCMG', -- Admin@123
   1, NULL, 40.00);

-- Dean — Faculty of Computing  (Dr. AND a Professor)
INSERT IGNORE INTO `users`
  (`id`,`full_name`,`title`,`position`,`email`,`password_hash`,`role_id`,`department_id`,`capacity_hours`) VALUES
  (2, 'Nimal Perera', 'Dr', 'Professor',
   'dean.computing@university.edu',
   '$2b$10$kIGutDJpAL3/MHPiFycDlOqDyK3F.CeZLNBIV96pY7zQRe6bNag7u', -- Dean@123
   2, NULL, 40.00);

-- Dean — Faculty of Engineering  (Dr. AND a Professor)
INSERT IGNORE INTO `users`
  (`id`,`full_name`,`title`,`position`,`email`,`password_hash`,`role_id`,`department_id`,`capacity_hours`) VALUES
  (3, 'Sunil Fernando', 'Dr', 'Professor',
   'dean.engineering@university.edu',
   '$2b$10$21Ltb61IZ.4tcZVM2fWrHOPkw75RR9dFHm9fcwEbM8Q.9EGc/6LqC', -- Dean@123
   2, NULL, 40.00);

-- Department Head — Computer Science  (Dr. AND a Senior Lecturer — the exact case)
INSERT IGNORE INTO `users`
  (`id`,`full_name`,`title`,`position`,`email`,`password_hash`,`role_id`,`department_id`,`capacity_hours`) VALUES
  (4, 'Amal Silva', 'Dr', 'Senior Lecturer',
   'head.cs@university.edu',
   '$2b$10$MoO.vad.FRC99Ou1ohQ18.0r4i9VLQXWB3vMB00JRjMzDdadQc0BW', -- Head@123
   3, 1, 40.00);

-- Department Head — Software Engineering  (Dr. AND a Senior Lecturer)
INSERT IGNORE INTO `users`
  (`id`,`full_name`,`title`,`position`,`email`,`password_hash`,`role_id`,`department_id`,`capacity_hours`) VALUES
  (5, 'Kasun Bandara', 'Dr', 'Senior Lecturer',
   'head.se@university.edu',
   '$2b$10$X/jgOBsfjbO1FJCtP7G0YOhrtQXPIl4BBrrp3RDJmvf.ET12ETcRi', -- Head@123
   3, 2, 40.00);

-- Lecturer 1 — Computer Science
INSERT IGNORE INTO `users`
  (`id`,`full_name`,`title`,`position`,`email`,`password_hash`,`role_id`,`department_id`,`capacity_hours`) VALUES
  (6, 'Roshan Jayawardena', 'Mr', 'Lecturer',
   'lecturer1@university.edu',
   '$2b$10$xAlRbVfrW9mkH84cQAN6q..I./BDYh0yNKuVeXSWJMLnjPGcm6qkq', -- Lecturer@123
   4, 1, 40.00);

-- Lecturer 2 — Software Engineering
INSERT IGNORE INTO `users`
  (`id`,`full_name`,`title`,`position`,`email`,`password_hash`,`role_id`,`department_id`,`capacity_hours`) VALUES
  (7, 'Dilini Rajapaksa', 'Ms', 'Lecturer',
   'lecturer2@university.edu',
   '$2b$10$aIkvyRgiYMnJ.P6LdGbpvuk6KCgBG7kttExMpmGeF1sduVlytBdXC', -- Lecturer@123
   4, 2, 40.00);

-- Student
INSERT IGNORE INTO `users`
  (`id`,`full_name`,`email`,`password_hash`,`role_id`,`department_id`,`enrollment_number`,`capacity_hours`) VALUES
  (8, 'Saman Kumara',
   'student@university.edu',
   '$2y$10$3FAbvfKRc1O2XYv4OOAD8OT.mlS4YjgHJ5eAFycuJxGbiU50EhkVe', -- Student@123
   5, 1, 'UWU/IIT/23/099', 0.00);

-- -----------------------------------------------------------
-- Link Deans and Dept Heads back to faculties / departments
-- -----------------------------------------------------------
UPDATE `faculties` SET `dean_id` = 2 WHERE `id` = 1;  -- Computing → Dr. Nimal
UPDATE `faculties` SET `dean_id` = 3 WHERE `id` = 2;  -- Engineering → Dr. Sunil

UPDATE `departments` SET `head_id` = 4 WHERE `id` = 1; -- CS → Dr. Amal
UPDATE `departments` SET `head_id` = 5 WHERE `id` = 2; -- SE → Dr. Kasun

-- -----------------------------------------------------------
-- Default Settings
-- -----------------------------------------------------------
INSERT IGNORE INTO `settings` (`setting_key`, `setting_value`) VALUES
  ('institution_name',         'Uva Wellassa University'),
  ('overload_threshold_pct',   '90'),
  ('maintenance_mode',         '0'),
  ('default_capacity_hours',   '40');

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- Quick-verify: SELECT id, full_name, email, role_id FROM users;
-- ============================================================
