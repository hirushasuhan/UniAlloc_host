-- ============================================================
-- UniAlloc — University HR Allocation System
-- Database Schema (MySQL 8.x)
-- Run: mysql -u root uniAlloc_db < schema.sql
-- ============================================================

-- Select the database to use
USE `uniAlloc_db`;

SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------
-- 1. roles
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `roles` (
  `id`        TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_name` ENUM('system_admin','dean','department_head','lecturer','student','on_study_leave') NOT NULL UNIQUE,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 2. faculties  (dean_id added after users table)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `faculties` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `faculty_name` VARCHAR(150) NOT NULL UNIQUE,
  `dean_id`      INT UNSIGNED NULL DEFAULT NULL,
  `created_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 3. departments  (head_id added after users table)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `departments` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `dept_name`  VARCHAR(150) NOT NULL,
  `faculty_id` INT UNSIGNED NOT NULL,
  `head_id`    INT UNSIGNED NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_dept_faculty` (`dept_name`, `faculty_id`),
  CONSTRAINT `fk_dept_faculty` FOREIGN KEY (`faculty_id`) REFERENCES `faculties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 4. users
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `full_name`         VARCHAR(200) NOT NULL,
  `title`             VARCHAR(20)  NULL DEFAULT NULL COMMENT 'Honorific prefix shown before the name, e.g. Dr, Prof, Mr, Mrs, Ms, Miss, Rev, Thero',
  `position`          VARCHAR(50)  NULL DEFAULT NULL COMMENT 'Academic rank / job position (full allowed list in UserDao::POSITIONS), e.g. Senior/Associate Professor, Senior Lecturer (Grade I/II), Lecturer (Grade I/II), Probationary/Assistant/Temporary/Visiting Lecturer, Instructor, Demonstrator, Research Assistant. Independent of title (a person can be Dr. AND a Senior Lecturer).',
  `email`             VARCHAR(200) NOT NULL UNIQUE,
  `password_hash`     VARCHAR(255) NOT NULL,
  `role_id`           TINYINT UNSIGNED NOT NULL,
  `department_id`     INT UNSIGNED NULL DEFAULT NULL,
  `enrollment_number` VARCHAR(50)  NULL DEFAULT NULL COMMENT 'Students only',
  `contact`           VARCHAR(50)  NULL DEFAULT NULL,
  `capacity_hours`    DECIMAL(6,2) NOT NULL DEFAULT 40.00 COMMENT 'Weekly available hours',
  `operational_status` VARCHAR(30) NOT NULL DEFAULT 'Available' COMMENT 'Lecturer availability: Available, On Study Leave, Temporarily Not Available, On Vacation',
  `is_active`         TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_users_role`   (`role_id`),
  KEY `idx_users_dept`   (`department_id`),
  KEY `idx_users_email`  (`email`),
  CONSTRAINT `fk_users_role`   FOREIGN KEY (`role_id`)       REFERENCES `roles`       (`id`),
  CONSTRAINT `fk_users_dept`   FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- back-fill FK on faculties and departments
ALTER TABLE `faculties`
  ADD CONSTRAINT `fk_faculty_dean`
    FOREIGN KEY (`dean_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

ALTER TABLE `departments`
  ADD CONSTRAINT `fk_dept_head`
    FOREIGN KEY (`head_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

-- -----------------------------------------------------------
-- 5. assignments
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `assignments` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title`           VARCHAR(300) NOT NULL,
  `description`     TEXT         NULL,
  `assigned_to`     INT UNSIGNED NOT NULL,
  `assigned_by`     INT UNSIGNED NOT NULL,
  `department_id`   INT UNSIGNED NULL DEFAULT NULL,
  `priority`        ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  `status`          ENUM('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
  `estimated_hours` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  `actual_hours`    DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  `deadline`        DATE         NULL,
  `created_at`      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_assignments_to`     (`assigned_to`),
  KEY `idx_assignments_by`     (`assigned_by`),
  KEY `idx_assignments_dept`   (`department_id`),
  KEY `idx_assignments_status` (`status`),
  CONSTRAINT `fk_assign_to`   FOREIGN KEY (`assigned_to`)   REFERENCES `users`       (`id`),
  CONSTRAINT `fk_assign_by`   FOREIGN KEY (`assigned_by`)   REFERENCES `users`       (`id`),
  CONSTRAINT `fk_assign_dept` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 6. assignment_progress
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `assignment_progress` (
  `id`               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `assignment_id`    INT UNSIGNED NOT NULL,
  `updated_by`       INT UNSIGNED NOT NULL,
  `progress_percent` TINYINT UNSIGNED NOT NULL DEFAULT 0 CHECK (`progress_percent` BETWEEN 0 AND 100),
  `note`             TEXT NULL,
  `updated_at`       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_progress_assignment` (`assignment_id`),
  CONSTRAINT `fk_progress_assignment` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_progress_user`       FOREIGN KEY (`updated_by`)    REFERENCES `users`        (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 7. work_requests  (cross-dept / cross-faculty / upward)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `work_requests` (
  `id`               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `requester_id`     INT UNSIGNED NOT NULL,
  `target_user_id`   INT UNSIGNED NULL DEFAULT NULL,
  `target_dept_id`   INT UNSIGNED NULL DEFAULT NULL,
  `target_faculty_id`INT UNSIGNED NULL DEFAULT NULL,
  `request_type`     ENUM('cross_department','cross_faculty','upward') NOT NULL,
  `title`            VARCHAR(300) NOT NULL,
  `description`      TEXT NULL,
  `status`           ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `resolved_by`      INT UNSIGNED NULL DEFAULT NULL,
  `resolved_at`      TIMESTAMP NULL DEFAULT NULL,
  `created_at`       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wreq_requester` (`requester_id`),
  KEY `idx_wreq_status`    (`status`),
  CONSTRAINT `fk_wreq_requester`      FOREIGN KEY (`requester_id`)      REFERENCES `users`       (`id`),
  CONSTRAINT `fk_wreq_target_user`    FOREIGN KEY (`target_user_id`)    REFERENCES `users`       (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_wreq_target_dept`    FOREIGN KEY (`target_dept_id`)    REFERENCES `departments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_wreq_target_faculty` FOREIGN KEY (`target_faculty_id`) REFERENCES `faculties`   (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_wreq_resolved_by`    FOREIGN KEY (`resolved_by`)       REFERENCES `users`       (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 8. workload_appeals
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `workload_appeals` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `lecturer_id`   INT UNSIGNED NOT NULL,
  `assignment_id` INT UNSIGNED NULL DEFAULT NULL,
  `reason`        TEXT NOT NULL,
  `status`        ENUM('pending','reviewed','resolved') NOT NULL DEFAULT 'pending',
  `reviewed_by`   INT UNSIGNED NULL DEFAULT NULL,
  `review_note`   TEXT NULL,
  `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_appeal_lecturer` (`lecturer_id`),
  CONSTRAINT `fk_appeal_lecturer`   FOREIGN KEY (`lecturer_id`)   REFERENCES `users`       (`id`),
  CONSTRAINT `fk_appeal_assignment` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_appeal_reviewer`   FOREIGN KEY (`reviewed_by`)   REFERENCES `users`       (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 9. student_requests
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `student_requests` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id`  INT UNSIGNED NOT NULL,
  `faculty_id`  INT UNSIGNED NOT NULL,
  `title`       VARCHAR(300) NOT NULL,
  `description` TEXT NULL,
  `status`      ENUM('pending','assigned','rejected') NOT NULL DEFAULT 'pending',
  `assigned_to` INT UNSIGNED NULL DEFAULT NULL,
  `reviewed_by` INT UNSIGNED NULL DEFAULT NULL,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sreq_student`  (`student_id`),
  KEY `idx_sreq_faculty`  (`faculty_id`),
  KEY `idx_sreq_status`   (`status`),
  CONSTRAINT `fk_sreq_student`      FOREIGN KEY (`student_id`)  REFERENCES `users`     (`id`),
  CONSTRAINT `fk_sreq_faculty`      FOREIGN KEY (`faculty_id`)  REFERENCES `faculties` (`id`),
  CONSTRAINT `fk_sreq_assigned_to`  FOREIGN KEY (`assigned_to`) REFERENCES `users`     (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sreq_reviewed_by`  FOREIGN KEY (`reviewed_by`) REFERENCES `users`     (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 10. notifications
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT UNSIGNED NOT NULL,
  `message`    TEXT NOT NULL,
  `type`       ENUM('assignment','deadline','overload','request','appeal','promotion','system') NOT NULL DEFAULT 'system',
  `is_read`    TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notif_user`    (`user_id`),
  KEY `idx_notif_is_read` (`is_read`),
  CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 11. audit_logs
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id`        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`   INT UNSIGNED NULL DEFAULT NULL,
  `action`    VARCHAR(100) NOT NULL,
  `entity`    VARCHAR(100) NULL,
  `entity_id` INT UNSIGNED NULL,
  `detail`    JSON NULL,
  `timestamp` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_user`   (`user_id`),
  KEY `idx_audit_entity` (`entity`, `entity_id`),
  CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 12. settings
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `settings` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `setting_key` VARCHAR(100) NOT NULL UNIQUE,
  `setting_value` TEXT NULL,
  `updated_by`  INT UNSIGNED NULL DEFAULT NULL,
  `updated_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_settings_user` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 13. role_promotions
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `role_promotions` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     INT UNSIGNED NOT NULL,
  `old_role_id` TINYINT UNSIGNED NOT NULL,
  `new_role_id` TINYINT UNSIGNED NOT NULL,
  `promoted_by` INT UNSIGNED NULL DEFAULT NULL,
  `approved_by` INT UNSIGNED NULL DEFAULT NULL,
  `status`      ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `promoted_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_promo_user` (`user_id`),
  CONSTRAINT `fk_promo_user`        FOREIGN KEY (`user_id`)     REFERENCES `users` (`id`),
  CONSTRAINT `fk_promo_old_role`    FOREIGN KEY (`old_role_id`) REFERENCES `roles` (`id`),
  CONSTRAINT `fk_promo_new_role`    FOREIGN KEY (`new_role_id`) REFERENCES `roles` (`id`),
  CONSTRAINT `fk_promo_promoted_by` FOREIGN KEY (`promoted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_promo_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
