-- ============================================================
-- Migration 04 — Backfill departments.head_id
-- Department-head notifications (student requests, appeals,
-- overload alerts, work requests) rely on departments.head_id,
-- but it was never set when a head account was created directly
-- via "Add Staff". This syncs head_id from the users table.
-- Run this against the existing database once.
-- ============================================================

UPDATE departments d
JOIN users u ON u.department_id = d.id AND u.is_active = 1
JOIN roles r ON r.id = u.role_id AND r.role_name = 'department_head'
SET d.head_id = u.id
WHERE d.head_id IS NULL;
