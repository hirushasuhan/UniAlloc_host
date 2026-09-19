<?php
namespace App\Controllers;

use App\Helpers\Db;
use App\Helpers\Response;
use App\Middleware\JwtMiddleware;
use App\Services\WorkloadService;

class WorkloadController
{
    public function show(array $params = []): void
    {
        $auth   = JwtMiddleware::handle(['system_admin', 'dean', 'department_head', 'lecturer']);
        $userId = (int)($params['userId'] ?? $auth['sub']);

        // Lecturers can only see their own
        if ($auth['role'] === 'lecturer' && $userId !== $auth['sub']) {
            Response::error('Forbidden', 403);
        }

        $cap          = WorkloadService::getCapacity($userId);
        $alternatives = [];
        if ($cap['is_overloaded']) {
            $alternatives = WorkloadService::suggestAlternatives($userId);
        }

        Response::success([
            'capacity'     => $cap,
            'alternatives' => $alternatives,
        ]);
    }

    public function index(array $params = []): void
    {
        $auth = JwtMiddleware::handle(['system_admin', 'dean', 'department_head']);

        $db    = Db::connection();
        $bind  = [];

        // Base: lecturers & department heads, scoped to the requester's faculty/department.
        // Deans additionally see their own workload (deans can be assigned tasks by system_admin).
        if ($auth['role'] === 'dean') {
            $scope = "(r.role_name IN ('lecturer','department_head') AND d.faculty_id = :fid)
                       OR (r.role_name = 'dean' AND u.id = :selfId)";
            $bind[':fid']    = $auth['faculty'];
            $bind[':selfId'] = $auth['sub'];
        } elseif ($auth['role'] === 'department_head') {
            $scope = "r.role_name IN ('lecturer','department_head') AND u.department_id = :did";
            $bind[':did'] = $auth['dept'];
        } else {
            $scope = "r.role_name IN ('lecturer','department_head')";
        }

        $stmt = $db->prepare(
            "SELECT u.id FROM users u
             LEFT JOIN departments d ON d.id = u.department_id
             JOIN roles r ON r.id = u.role_id
             WHERE u.is_active = 1 AND ($scope)"
        );
        $stmt->execute($bind);
        $ids = $stmt->fetchAll(\PDO::FETCH_COLUMN);

        $results = [];
        foreach ($ids as $uid) {
            $results[] = WorkloadService::getCapacity((int)$uid);
        }

        Response::success($results);
    }
}
