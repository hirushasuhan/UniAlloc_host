<?php
namespace App\Controllers;

use App\Helpers\Db;
use App\Helpers\Response;
use App\Middleware\JwtMiddleware;

/**
 * Leadership vacancies — surfaced as dashboard alerts.
 *
 * A seat is "vacant" when it has no holder who is BOTH active AND not
 * On Study Leave. So a faculty whose Dean went on study leave, or a
 * department whose Head is inactive, both count as vacant and need
 * someone reassigned.
 */
class VacancyController
{
    public function index(array $params = []): void
    {
        $auth = JwtMiddleware::handle(['system_admin', 'dean']);
        $db   = Db::connection();

        // --- Faculties with no active Dean (admin-wide only) ---
        $facultiesWithoutDean = [];
        if ($auth['role'] === 'system_admin') {
            $stmt = $db->query(
                "SELECT f.id, f.faculty_name
                 FROM faculties f
                 WHERE NOT EXISTS (
                     SELECT 1 FROM users u
                     WHERE u.id = f.dean_id
                       AND u.is_active = 1
                       AND u.operational_status <> 'On Study Leave'
                 )
                 ORDER BY f.faculty_name"
            );
            $facultiesWithoutDean = $stmt->fetchAll();
        }

        // --- Departments with no active Head (admin: all; dean: own faculty) ---
        $sql = "SELECT d.id, d.dept_name, d.faculty_id, f.faculty_name
                FROM departments d
                JOIN faculties f ON f.id = d.faculty_id
                WHERE NOT EXISTS (
                    SELECT 1 FROM users u
                    JOIN roles r ON r.id = u.role_id
                    WHERE u.department_id = d.id
                      AND r.role_name = 'department_head'
                      AND u.is_active = 1
                      AND u.operational_status <> 'On Study Leave'
                )";
        $bind = [];
        if ($auth['role'] === 'dean') {
            $sql .= ' AND d.faculty_id = :fid';
            $bind[':fid'] = $auth['faculty'];
        }
        $sql .= ' ORDER BY f.faculty_name, d.dept_name';

        $stmt = $db->prepare($sql);
        $stmt->execute($bind);
        $departmentsWithoutHead = $stmt->fetchAll();

        Response::success([
            'faculties_without_dean'   => $facultiesWithoutDean,
            'departments_without_head' => $departmentsWithoutHead,
        ]);
    }
}
