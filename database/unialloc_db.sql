-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 07, 2026 at 07:57 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `unialloc_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `assignments`
--

CREATE TABLE `assignments` (
  `id` int(10) UNSIGNED NOT NULL,
  `title` varchar(300) NOT NULL,
  `description` text DEFAULT NULL,
  `assigned_to` int(10) UNSIGNED NOT NULL,
  `assigned_by` int(10) UNSIGNED NOT NULL,
  `department_id` int(10) UNSIGNED DEFAULT NULL,
  `priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  `status` enum('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
  `estimated_hours` decimal(6,2) NOT NULL DEFAULT 0.00,
  `actual_hours` decimal(6,2) NOT NULL DEFAULT 0.00,
  `deadline` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `assignments`
--

INSERT INTO `assignments` (`id`, `title`, `description`, `assigned_to`, `assigned_by`, `department_id`, `priority`, `status`, `estimated_hours`, `actual_hours`, `deadline`, `created_at`, `updated_at`) VALUES
(1, 'test', 'test', 4, 2, 1, 'medium', 'in_progress', 1.00, 0.00, '2026-05-27', '2026-05-24 18:01:14', '2026-07-07 05:21:57'),
(2, 'vsv', 'vsvddsv', 3, 2, NULL, 'medium', 'in_progress', 4.00, 0.00, NULL, '2026-05-25 15:25:01', '2026-05-25 15:25:14'),
(3, 'trest2', 'test2', 3, 2, NULL, 'medium', 'pending', 4.00, 0.00, NULL, '2026-05-25 15:25:02', '2026-05-25 15:25:02'),
(4, 'test2', 'test2', 3, 2, NULL, 'medium', 'pending', 4.00, 0.00, NULL, '2026-05-25 15:25:03', '2026-05-25 15:25:03'),
(5, 'test', 'test', 3, 2, NULL, 'medium', 'pending', 4.00, 0.00, NULL, '2026-05-25 15:25:03', '2026-05-25 15:25:03'),
(6, 'test ', 'test', 3, 2, NULL, 'medium', 'in_progress', 4.00, 0.00, NULL, '2026-05-25 15:25:04', '2026-05-25 15:25:22');

-- --------------------------------------------------------

--
-- Table structure for table `assignment_progress`
--

CREATE TABLE `assignment_progress` (
  `id` int(10) UNSIGNED NOT NULL,
  `assignment_id` int(10) UNSIGNED NOT NULL,
  `updated_by` int(10) UNSIGNED NOT NULL,
  `progress_percent` tinyint(3) UNSIGNED NOT NULL DEFAULT 0 CHECK (`progress_percent` between 0 and 100),
  `note` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `assignment_progress`
--

INSERT INTO `assignment_progress` (`id`, `assignment_id`, `updated_by`, `progress_percent`, `note`, `updated_at`) VALUES
(1, 2, 3, 35, '', '2026-05-25 15:25:14'),
(2, 6, 3, 80, '', '2026-05-25 15:25:22'),
(3, 1, 4, 5, '', '2026-07-07 05:21:57');

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity` varchar(100) DEFAULT NULL,
  `entity_id` int(10) UNSIGNED DEFAULT NULL,
  `detail` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`detail`)),
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `user_id`, `action`, `entity`, `entity_id`, `detail`, `timestamp`) VALUES
(1, 1, 'login', 'users', 1, NULL, '2026-05-24 17:20:46'),
(2, 1, 'login', 'users', 1, NULL, '2026-05-24 17:21:52'),
(3, 1, 'update_user', 'users', 7, NULL, '2026-05-24 17:41:37'),
(4, 1, 'create_user', 'users', 9, NULL, '2026-05-24 17:49:33'),
(5, 2, 'login', 'users', 2, NULL, '2026-05-24 17:56:24'),
(6, 2, 'login', 'users', 2, NULL, '2026-05-24 17:56:29'),
(7, 2, 'login', 'users', 2, NULL, '2026-05-24 17:56:33'),
(8, 2, 'login', 'users', 2, NULL, '2026-05-24 17:56:34'),
(9, 2, 'login', 'users', 2, NULL, '2026-05-24 17:56:36'),
(10, 2, 'login', 'users', 2, NULL, '2026-05-24 17:56:37'),
(11, 2, 'login', 'users', 2, NULL, '2026-05-24 17:56:40'),
(12, 2, 'login', 'users', 2, NULL, '2026-05-24 17:56:41'),
(13, 2, 'login', 'users', 2, NULL, '2026-05-24 17:56:44'),
(14, 2, 'create_assignment', 'assignments', 1, NULL, '2026-05-24 18:01:14'),
(15, 2, 'login', 'users', 2, NULL, '2026-05-24 18:08:17'),
(16, 4, 'login', 'users', 4, NULL, '2026-05-24 18:14:05'),
(17, 6, 'login', 'users', 6, NULL, '2026-05-24 18:15:25'),
(18, 1, 'login', 'users', 1, NULL, '2026-05-24 18:17:43'),
(19, 8, 'login', 'users', 8, NULL, '2026-05-24 19:01:01'),
(20, 1, 'login', 'users', 1, NULL, '2026-05-25 11:24:03'),
(21, 2, 'login', 'users', 2, NULL, '2026-05-25 11:25:39'),
(22, 2, 'login', 'users', 2, NULL, '2026-05-25 11:26:01'),
(23, 1, 'login', 'users', 1, NULL, '2026-05-25 12:04:09'),
(24, 1, 'create_user', 'users', 10, NULL, '2026-05-25 12:05:19'),
(25, 1, 'create_user', 'users', 11, NULL, '2026-05-25 12:10:16'),
(26, 2, 'login', 'users', 2, NULL, '2026-05-25 12:10:50'),
(27, 1, 'login', 'users', 1, NULL, '2026-05-25 12:11:58'),
(28, 1, 'create_user', 'users', 12, NULL, '2026-05-25 12:37:19'),
(29, 2, 'login', 'users', 2, NULL, '2026-05-25 12:38:15'),
(30, 1, 'login', 'users', 1, NULL, '2026-05-25 12:39:22'),
(31, 2, 'login', 'users', 2, NULL, '2026-05-25 12:39:51'),
(32, 2, 'create_work_request', 'work_requests', 1, NULL, '2026-05-25 12:42:59'),
(33, 2, 'create_work_request', 'work_requests', 2, NULL, '2026-05-25 12:46:18'),
(34, 2, 'create_work_request', 'work_requests', 3, NULL, '2026-05-25 12:46:34'),
(35, 2, 'create_work_request', 'work_requests', 4, NULL, '2026-05-25 12:49:29'),
(36, 2, 'create_work_request', 'work_requests', 5, NULL, '2026-05-25 13:17:22'),
(37, 6, 'login', 'users', 6, NULL, '2026-05-25 14:38:49'),
(38, 6, 'login', 'users', 6, NULL, '2026-05-25 14:40:35'),
(39, 12, 'login', 'users', 12, NULL, '2026-05-25 14:44:40'),
(40, 1, 'login', 'users', 1, NULL, '2026-05-25 15:01:46'),
(41, 3, 'login', 'users', 3, NULL, '2026-05-25 15:04:31'),
(42, 3, 'work_request_accept', 'work_requests', 5, NULL, '2026-05-25 15:25:01'),
(43, 3, 'work_request_accept', 'work_requests', 4, NULL, '2026-05-25 15:25:02'),
(44, 3, 'work_request_accept', 'work_requests', 3, NULL, '2026-05-25 15:25:03'),
(45, 3, 'work_request_accept', 'work_requests', 2, NULL, '2026-05-25 15:25:03'),
(46, 3, 'work_request_accept', 'work_requests', 1, NULL, '2026-05-25 15:25:04'),
(47, 3, 'update_progress', 'assignment_progress', 1, NULL, '2026-05-25 15:25:14'),
(48, 3, 'update_progress', 'assignment_progress', 2, NULL, '2026-05-25 15:25:22'),
(49, 3, 'login', 'users', 3, NULL, '2026-05-25 16:19:22'),
(50, 1, 'login', 'users', 1, NULL, '2026-05-25 16:19:27'),
(51, 1, 'login', 'users', 1, NULL, '2026-06-10 13:34:04'),
(52, 1, 'login', 'users', 1, NULL, '2026-06-13 13:49:51'),
(53, 1, 'login', 'users', 1, NULL, '2026-06-13 13:51:22'),
(54, 13, 'register', 'users', 13, NULL, '2026-06-13 13:53:09'),
(55, 1, 'login', 'users', 1, NULL, '2026-06-13 14:30:45'),
(56, 1, 'login', 'users', 1, NULL, '2026-06-13 14:48:23'),
(57, 1, 'login', 'users', 1, NULL, '2026-06-13 14:50:01'),
(58, 8, 'login', 'users', 8, NULL, '2026-06-13 14:50:12'),
(59, 8, 'login', 'users', 8, NULL, '2026-06-13 14:51:14'),
(60, 1, 'login', 'users', 1, NULL, '2026-06-13 14:51:20'),
(61, 1, 'login', 'users', 1, NULL, '2026-06-13 15:03:20'),
(62, 1, 'login', 'users', 1, NULL, '2026-06-13 15:03:37'),
(63, 1, 'login', 'users', 1, NULL, '2026-06-13 15:07:07'),
(64, 1, 'login', 'users', 1, NULL, '2026-06-13 15:08:37'),
(65, 1, 'login', 'users', 1, NULL, '2026-06-13 15:28:48'),
(66, 1, 'login', 'users', 1, NULL, '2026-06-13 15:31:24'),
(67, 8, 'login', 'users', 8, NULL, '2026-06-13 15:31:27'),
(68, 8, 'login', 'users', 8, NULL, '2026-06-13 15:31:43'),
(69, 1, 'login', 'users', 1, NULL, '2026-06-13 15:31:48'),
(70, 3, 'login', 'users', 3, NULL, '2026-06-13 15:32:15'),
(71, 3, 'login', 'users', 3, NULL, '2026-06-13 15:32:19'),
(72, 3, 'login', 'users', 3, NULL, '2026-06-13 15:35:26'),
(73, 3, 'login', 'users', 3, NULL, '2026-06-13 15:42:45'),
(74, 3, 'login', 'users', 3, NULL, '2026-06-13 15:43:46'),
(75, 1, 'login', 'users', 1, NULL, '2026-06-13 15:44:35'),
(76, 1, 'reset_password', 'users', 9, NULL, '2026-06-13 15:44:54'),
(77, 3, 'login', 'users', 3, NULL, '2026-06-13 16:17:05'),
(78, 4, 'login', 'users', 4, NULL, '2026-06-13 16:18:20'),
(79, 4, 'login', 'users', 4, NULL, '2026-06-13 16:18:29'),
(80, 1, 'login', 'users', 1, NULL, '2026-06-13 16:19:15'),
(81, 1, 'login', 'users', 1, NULL, '2026-06-13 16:19:22'),
(82, 1, 'login', 'users', 1, NULL, '2026-06-13 16:19:24'),
(83, 3, 'login', 'users', 3, NULL, '2026-06-13 16:20:11'),
(84, 3, 'login', 'users', 3, NULL, '2026-06-14 12:01:58'),
(85, 1, 'update_user', 'users', 3, NULL, '2026-06-14 12:48:27'),
(86, 3, 'login', 'users', 3, NULL, '2026-06-14 13:31:25'),
(87, 8, 'login', 'users', 8, NULL, '2026-06-14 13:31:42'),
(88, 8, 'login', 'users', 8, NULL, '2026-06-14 13:32:21'),
(89, 3, 'login', 'users', 3, NULL, '2026-06-14 13:32:24'),
(90, 3, 'login', 'users', 3, NULL, '2026-06-29 18:25:02'),
(91, 3, 'login', 'users', 3, NULL, '2026-06-29 18:25:24'),
(92, 3, 'login', 'users', 3, NULL, '2026-06-29 18:25:28'),
(93, 3, 'login', 'users', 3, NULL, '2026-06-29 18:25:37'),
(94, 1, 'login', 'users', 1, NULL, '2026-06-29 18:25:48'),
(95, 1, 'login', 'users', 1, NULL, '2026-06-29 18:26:09'),
(96, 8, 'login', 'users', 8, NULL, '2026-06-29 18:26:13'),
(97, 1, 'login', 'users', 1, NULL, '2026-06-29 18:26:28'),
(98, 1, 'login', 'users', 1, NULL, '2026-06-29 18:28:26'),
(99, 3, 'login', 'users', 3, NULL, '2026-06-29 18:29:06'),
(100, 4, 'login', 'users', 4, NULL, '2026-06-29 18:29:29'),
(101, 2, 'login', 'users', 2, NULL, '2026-06-29 18:30:22'),
(102, 8, 'login', 'users', 8, NULL, '2026-06-29 18:31:16'),
(103, 8, 'login', 'users', 8, NULL, '2026-06-29 18:32:10'),
(104, 4, 'login', 'users', 4, NULL, '2026-06-29 18:32:17'),
(105, 4, 'login', 'users', 4, NULL, '2026-07-07 05:19:07'),
(106, 4, 'update_progress', 'assignment_progress', 3, NULL, '2026-07-07 05:21:57'),
(107, 2, 'login', 'users', 2, NULL, '2026-07-07 05:22:50'),
(108, 1, 'login', 'users', 1, NULL, '2026-07-07 05:27:27'),
(109, 8, 'login', 'users', 8, NULL, '2026-07-07 05:30:11'),
(110, 1, 'login', 'users', 1, NULL, '2026-07-07 05:37:37');

-- --------------------------------------------------------

--
-- Table structure for table `departments`
--

CREATE TABLE `departments` (
  `id` int(10) UNSIGNED NOT NULL,
  `dept_name` varchar(150) NOT NULL,
  `faculty_id` int(10) UNSIGNED NOT NULL,
  `head_id` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `departments`
--

INSERT INTO `departments` (`id`, `dept_name`, `faculty_id`, `head_id`, `created_at`) VALUES
(1, 'Computer Science', 1, 4, '2026-05-24 16:27:29'),
(2, 'Software Engineering', 1, 5, '2026-05-24 16:27:29'),
(3, 'Civil Engineering', 2, NULL, '2026-05-24 16:27:29'),
(4, 'Electrical Engineering', 2, NULL, '2026-05-24 16:27:29');

-- --------------------------------------------------------

--
-- Table structure for table `faculties`
--

CREATE TABLE `faculties` (
  `id` int(10) UNSIGNED NOT NULL,
  `faculty_name` varchar(150) NOT NULL,
  `dean_id` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `faculties`
--

INSERT INTO `faculties` (`id`, `faculty_name`, `dean_id`, `created_at`) VALUES
(1, 'Faculty of Computing', 2, '2026-05-24 16:27:29'),
(2, 'Faculty of Engineering', 3, '2026-05-24 16:27:29');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `message` text NOT NULL,
  `type` enum('assignment','deadline','overload','request','appeal','promotion','system') NOT NULL DEFAULT 'system',
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `message`, `type`, `is_read`, `created_at`) VALUES
(1, 4, 'You have been assigned a new task: \"test\"', 'assignment', 1, '2026-05-24 18:01:14'),
(2, 3, 'New work request: \"test \"', 'request', 1, '2026-05-25 12:42:59'),
(3, 3, 'New work request: \"test\"', 'request', 1, '2026-05-25 12:46:18'),
(4, 3, 'New work request: \"test2\"', 'request', 1, '2026-05-25 12:46:34'),
(5, 3, 'New work request: \"trest2\"', 'request', 1, '2026-05-25 12:49:29'),
(6, 3, 'You have a new work request \"vsv\" awaiting your acceptance.', 'request', 1, '2026-05-25 13:17:22'),
(7, 2, 'Your work request \"vsv\" was accepted!', 'request', 1, '2026-05-25 15:25:01'),
(8, 2, 'Your work request \"trest2\" was accepted!', 'request', 1, '2026-05-25 15:25:02'),
(9, 2, 'Your work request \"test2\" was accepted!', 'request', 1, '2026-05-25 15:25:03'),
(10, 2, 'Your work request \"test\" was accepted!', 'request', 1, '2026-05-25 15:25:03'),
(11, 2, 'Your work request \"test \" was accepted!', 'request', 1, '2026-05-25 15:25:04'),
(12, 2, 'Task accepted & started: \"vsv\" (by Dr. Sunil Fernando)', 'assignment', 1, '2026-05-25 15:25:14'),
(13, 2, 'Task accepted & started: \"test \" (by Dr. Sunil Fernando)', 'assignment', 1, '2026-05-25 15:25:22'),
(14, 2, 'Task accepted & started: \"test\" (by Dr. Amal Silva)', 'assignment', 0, '2026-07-07 05:21:57');

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` tinyint(3) UNSIGNED NOT NULL,
  `role_name` enum('system_admin','dean','department_head','lecturer','student','on_study_leave') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `role_name`) VALUES
(1, 'system_admin'),
(2, 'dean'),
(3, 'department_head'),
(4, 'lecturer'),
(5, 'student'),
(6, 'on_study_leave');

-- --------------------------------------------------------

--
-- Table structure for table `role_promotions`
--

CREATE TABLE `role_promotions` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `old_role_id` tinyint(3) UNSIGNED NOT NULL,
  `new_role_id` tinyint(3) UNSIGNED NOT NULL,
  `promoted_by` int(10) UNSIGNED DEFAULT NULL,
  `approved_by` int(10) UNSIGNED DEFAULT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `promoted_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `id` int(10) UNSIGNED NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `updated_by` int(10) UNSIGNED DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `settings`
--

INSERT INTO `settings` (`id`, `setting_key`, `setting_value`, `updated_by`, `updated_at`) VALUES
(1, 'institution_name', 'Uva Wellassa University', NULL, '2026-05-24 16:27:29'),
(2, 'overload_threshold_pct', '90', NULL, '2026-05-24 16:27:29'),
(3, 'maintenance_mode', '0', NULL, '2026-05-24 16:27:29'),
(4, 'default_capacity_hours', '40', NULL, '2026-05-24 16:27:29');

-- --------------------------------------------------------

--
-- Table structure for table `student_requests`
--

CREATE TABLE `student_requests` (
  `id` int(10) UNSIGNED NOT NULL,
  `student_id` int(10) UNSIGNED NOT NULL,
  `faculty_id` int(10) UNSIGNED NOT NULL,
  `title` varchar(300) NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('pending','assigned','rejected') NOT NULL DEFAULT 'pending',
  `assigned_to` int(10) UNSIGNED DEFAULT NULL,
  `reviewed_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `full_name` varchar(200) NOT NULL,
  `position` varchar(50) DEFAULT NULL COMMENT 'Academic/professional title, e.g. Senior Prof, Prof, Senior Lecturer, Lecturer, Mr, Ms, Miss, Thero',
  `email` varchar(200) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role_id` tinyint(3) UNSIGNED NOT NULL,
  `department_id` int(10) UNSIGNED DEFAULT NULL,
  `enrollment_number` varchar(50) DEFAULT NULL COMMENT 'Students only',
  `contact` varchar(50) DEFAULT NULL,
  `capacity_hours` decimal(6,2) NOT NULL DEFAULT 40.00 COMMENT 'Weekly available hours',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `full_name`, `email`, `password_hash`, `role_id`, `department_id`, `enrollment_number`, `contact`, `capacity_hours`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'System Administrator', 'admin@university.edu', '$2b$10$nBIhCNJQfZSrEJeZjh6daeY3BWxQ1UCzUEbu8aUA.RvAkAe1FNCMG', 1, NULL, NULL, NULL, 40.00, 1, '2026-05-24 16:27:29', '2026-05-24 16:27:29'),
(2, 'Dr. Nimal Perera', 'dean.computing@university.edu', '$2b$10$kIGutDJpAL3/MHPiFycDlOqDyK3F.CeZLNBIV96pY7zQRe6bNag7u', 2, NULL, NULL, NULL, 40.00, 1, '2026-05-24 16:27:29', '2026-05-24 16:27:29'),
(3, 'Dr. Sunil Fernando', 'dean.engineering@university.edu', '$2b$10$21Ltb61IZ.4tcZVM2fWrHOPkw75RR9dFHm9fcwEbM8Q.9EGc/6LqC', 2, NULL, NULL, '+94763531483', 40.00, 1, '2026-05-24 16:27:29', '2026-06-14 12:48:27'),
(4, 'Dr. Amal Silva', 'head.cs@university.edu', '$2b$10$MoO.vad.FRC99Ou1ohQ18.0r4i9VLQXWB3vMB00JRjMzDdadQc0BW', 3, 1, NULL, NULL, 40.00, 1, '2026-05-24 16:27:29', '2026-05-24 16:27:29'),
(5, 'Dr. Kasun Bandara', 'head.se@university.edu', '$2b$10$X/jgOBsfjbO1FJCtP7G0YOhrtQXPIl4BBrrp3RDJmvf.ET12ETcRi', 3, 2, NULL, NULL, 40.00, 1, '2026-05-24 16:27:29', '2026-05-24 16:27:29'),
(6, 'Mr. Roshan Jayawardena', 'lecturer1@university.edu', '$2b$10$xAlRbVfrW9mkH84cQAN6q..I./BDYh0yNKuVeXSWJMLnjPGcm6qkq', 4, 1, NULL, NULL, 40.00, 1, '2026-05-24 16:27:29', '2026-05-24 16:27:29'),
(7, 'Ms. Dilini Rajapaksa', 'lecturer2@university.edu', '$2b$10$aIkvyRgiYMnJ.P6LdGbpvuk6KCgBG7kttExMpmGeF1sduVlytBdXC', 4, 2, NULL, NULL, 40.00, 0, '2026-05-24 16:27:29', '2026-05-24 17:41:37'),
(8, 'Saman Kumara', 'student@university.edu', '$2y$10$3FAbvfKRc1O2XYv4OOAD8OT.mlS4YjgHJ5eAFycuJxGbiU50EhkVe', 5, 1, 'UWU/IIT/23/099', NULL, 0.00, 1, '2026-05-24 16:27:29', '2026-05-24 18:21:50'),
(9, 'test admin', 'hirushas001021@gmail.com', '$2y$12$mbM9.BDQWXC.gf5LRJpjJeXMVYNuWFoeUSsSaviLmBSDd5SlmiEMS', 1, NULL, NULL, '', 0.00, 1, '2026-05-24 17:49:33', '2026-06-13 15:44:54'),
(10, 'eng lec', 'englec@university.edu', '$2y$12$uzjRUmtJT5esM5W.0i/vzeh1sPZQuWy/26pBLR.9WFPbwStFRl4ee', 4, 4, NULL, '', 40.00, 1, '2026-05-25 12:05:19', '2026-05-25 12:05:19'),
(11, 'englec2', 'englec2@university.edu', '$2y$12$neI5ZUei3dE5s3Vd2otI8e4GSLXDFL1mD9AJvHx5YASCpSjs0q1E.', 3, 3, NULL, '', 40.00, 1, '2026-05-25 12:10:16', '2026-05-25 12:10:16'),
(12, 'engelechead', 'engelechead@university.edu', '$2y$12$i3Y.I2BYexwTFemxmME4X.4P7EOKCqbDPATfPuQtxK76uNwzMst6i', 3, 4, NULL, '', 40.00, 1, '2026-05-25 12:37:19', '2026-05-25 12:37:19'),
(13, 'Test Student', 'teststudent@example.com', '$2y$12$qhaXC5P0sPC2cL/AcipOXO15pwTcuToba3OjPAe9iqMtn.lVoKJ/y', 5, 1, '123', NULL, 0.00, 1, '2026-06-13 13:53:09', '2026-06-13 13:53:09');

-- --------------------------------------------------------

--
-- Table structure for table `workload_appeals`
--

CREATE TABLE `workload_appeals` (
  `id` int(10) UNSIGNED NOT NULL,
  `lecturer_id` int(10) UNSIGNED NOT NULL,
  `assignment_id` int(10) UNSIGNED DEFAULT NULL,
  `reason` text NOT NULL,
  `status` enum('pending','reviewed','resolved') NOT NULL DEFAULT 'pending',
  `reviewed_by` int(10) UNSIGNED DEFAULT NULL,
  `review_note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_requests`
--

CREATE TABLE `work_requests` (
  `id` int(10) UNSIGNED NOT NULL,
  `requester_id` int(10) UNSIGNED NOT NULL,
  `target_user_id` int(10) UNSIGNED DEFAULT NULL,
  `target_dept_id` int(10) UNSIGNED DEFAULT NULL,
  `target_faculty_id` int(10) UNSIGNED DEFAULT NULL,
  `request_type` enum('cross_department','cross_faculty','upward') NOT NULL,
  `target_role` varchar(30) DEFAULT NULL,
  `title` varchar(300) NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `approval_step` enum('pending_dean','pending_dept_head','pending_assignee','approved','rejected') NOT NULL DEFAULT 'pending_assignee',
  `resolved_by` int(10) UNSIGNED DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `dean_approved_by` int(10) UNSIGNED DEFAULT NULL,
  `dean_approved_at` timestamp NULL DEFAULT NULL,
  `dept_head_approved_by` int(10) UNSIGNED DEFAULT NULL,
  `dept_head_approved_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `work_requests`
--

INSERT INTO `work_requests` (`id`, `requester_id`, `target_user_id`, `target_dept_id`, `target_faculty_id`, `request_type`, `target_role`, `title`, `description`, `status`, `approval_step`, `resolved_by`, `resolved_at`, `created_at`, `dean_approved_by`, `dean_approved_at`, `dept_head_approved_by`, `dept_head_approved_at`) VALUES
(1, 2, 3, NULL, 2, 'cross_faculty', NULL, 'test ', 'test', 'approved', 'approved', 3, '2026-05-25 15:25:04', '2026-05-25 12:42:59', NULL, NULL, NULL, NULL),
(2, 2, 3, NULL, 2, 'cross_faculty', NULL, 'test', 'test', 'approved', 'approved', 3, '2026-05-25 15:25:03', '2026-05-25 12:46:18', NULL, NULL, NULL, NULL),
(3, 2, 3, NULL, 2, 'cross_faculty', NULL, 'test2', 'test2', 'approved', 'approved', 3, '2026-05-25 15:25:03', '2026-05-25 12:46:34', NULL, NULL, NULL, NULL),
(4, 2, 3, NULL, 2, 'cross_faculty', NULL, 'trest2', 'test2', 'approved', 'approved', 3, '2026-05-25 15:25:02', '2026-05-25 12:49:29', NULL, NULL, NULL, NULL),
(5, 2, 3, NULL, 2, 'cross_faculty', 'dean', 'vsv', 'vsvddsv', 'approved', 'approved', 3, '2026-05-25 15:25:01', '2026-05-25 13:17:22', NULL, NULL, NULL, NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `assignments`
--
ALTER TABLE `assignments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_assignments_to` (`assigned_to`),
  ADD KEY `idx_assignments_by` (`assigned_by`),
  ADD KEY `idx_assignments_dept` (`department_id`),
  ADD KEY `idx_assignments_status` (`status`);

--
-- Indexes for table `assignment_progress`
--
ALTER TABLE `assignment_progress`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_progress_assignment` (`assignment_id`),
  ADD KEY `fk_progress_user` (`updated_by`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_audit_user` (`user_id`),
  ADD KEY `idx_audit_entity` (`entity`,`entity_id`);

--
-- Indexes for table `departments`
--
ALTER TABLE `departments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_dept_faculty` (`dept_name`,`faculty_id`),
  ADD KEY `fk_dept_faculty` (`faculty_id`),
  ADD KEY `fk_dept_head` (`head_id`);

--
-- Indexes for table `faculties`
--
ALTER TABLE `faculties`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `faculty_name` (`faculty_name`),
  ADD KEY `fk_faculty_dean` (`dean_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notif_user` (`user_id`),
  ADD KEY `idx_notif_is_read` (`is_read`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `role_name` (`role_name`),
  ADD UNIQUE KEY `role_name_2` (`role_name`);

--
-- Indexes for table `role_promotions`
--
ALTER TABLE `role_promotions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_promo_user` (`user_id`),
  ADD KEY `fk_promo_old_role` (`old_role_id`),
  ADD KEY `fk_promo_new_role` (`new_role_id`),
  ADD KEY `fk_promo_promoted_by` (`promoted_by`),
  ADD KEY `fk_promo_approved_by` (`approved_by`);

--
-- Indexes for table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `setting_key` (`setting_key`),
  ADD KEY `fk_settings_user` (`updated_by`);

--
-- Indexes for table `student_requests`
--
ALTER TABLE `student_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sreq_student` (`student_id`),
  ADD KEY `idx_sreq_faculty` (`faculty_id`),
  ADD KEY `idx_sreq_status` (`status`),
  ADD KEY `fk_sreq_assigned_to` (`assigned_to`),
  ADD KEY `fk_sreq_reviewed_by` (`reviewed_by`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_users_role` (`role_id`),
  ADD KEY `idx_users_dept` (`department_id`),
  ADD KEY `idx_users_email` (`email`);

--
-- Indexes for table `workload_appeals`
--
ALTER TABLE `workload_appeals`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_appeal_lecturer` (`lecturer_id`),
  ADD KEY `fk_appeal_assignment` (`assignment_id`),
  ADD KEY `fk_appeal_reviewer` (`reviewed_by`);

--
-- Indexes for table `work_requests`
--
ALTER TABLE `work_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_wreq_requester` (`requester_id`),
  ADD KEY `idx_wreq_status` (`status`),
  ADD KEY `fk_wreq_target_user` (`target_user_id`),
  ADD KEY `fk_wreq_target_dept` (`target_dept_id`),
  ADD KEY `fk_wreq_target_faculty` (`target_faculty_id`),
  ADD KEY `fk_wreq_resolved_by` (`resolved_by`),
  ADD KEY `fk_wreq_dean_app` (`dean_approved_by`),
  ADD KEY `fk_wreq_dh_app` (`dept_head_approved_by`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `assignments`
--
ALTER TABLE `assignments`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `assignment_progress`
--
ALTER TABLE `assignment_progress`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=111;

--
-- AUTO_INCREMENT for table `departments`
--
ALTER TABLE `departments`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `faculties`
--
ALTER TABLE `faculties`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` tinyint(3) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `role_promotions`
--
ALTER TABLE `role_promotions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `settings`
--
ALTER TABLE `settings`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `student_requests`
--
ALTER TABLE `student_requests`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `workload_appeals`
--
ALTER TABLE `workload_appeals`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `work_requests`
--
ALTER TABLE `work_requests`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `assignments`
--
ALTER TABLE `assignments`
  ADD CONSTRAINT `fk_assign_by` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_assign_dept` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_assign_to` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`);

--
-- Constraints for table `assignment_progress`
--
ALTER TABLE `assignment_progress`
  ADD CONSTRAINT `fk_progress_assignment` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_progress_user` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `departments`
--
ALTER TABLE `departments`
  ADD CONSTRAINT `fk_dept_faculty` FOREIGN KEY (`faculty_id`) REFERENCES `faculties` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_dept_head` FOREIGN KEY (`head_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `faculties`
--
ALTER TABLE `faculties`
  ADD CONSTRAINT `fk_faculty_dean` FOREIGN KEY (`dean_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `role_promotions`
--
ALTER TABLE `role_promotions`
  ADD CONSTRAINT `fk_promo_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_promo_new_role` FOREIGN KEY (`new_role_id`) REFERENCES `roles` (`id`),
  ADD CONSTRAINT `fk_promo_old_role` FOREIGN KEY (`old_role_id`) REFERENCES `roles` (`id`),
  ADD CONSTRAINT `fk_promo_promoted_by` FOREIGN KEY (`promoted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_promo_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `settings`
--
ALTER TABLE `settings`
  ADD CONSTRAINT `fk_settings_user` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `student_requests`
--
ALTER TABLE `student_requests`
  ADD CONSTRAINT `fk_sreq_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_sreq_faculty` FOREIGN KEY (`faculty_id`) REFERENCES `faculties` (`id`),
  ADD CONSTRAINT `fk_sreq_reviewed_by` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_sreq_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_dept` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`);

--
-- Constraints for table `workload_appeals`
--
ALTER TABLE `workload_appeals`
  ADD CONSTRAINT `fk_appeal_assignment` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_appeal_lecturer` FOREIGN KEY (`lecturer_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_appeal_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `work_requests`
--
ALTER TABLE `work_requests`
  ADD CONSTRAINT `fk_wreq_dean_app` FOREIGN KEY (`dean_approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_wreq_dh_app` FOREIGN KEY (`dept_head_approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_wreq_requester` FOREIGN KEY (`requester_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_wreq_resolved_by` FOREIGN KEY (`resolved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_wreq_target_dept` FOREIGN KEY (`target_dept_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_wreq_target_faculty` FOREIGN KEY (`target_faculty_id`) REFERENCES `faculties` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_wreq_target_user` FOREIGN KEY (`target_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
