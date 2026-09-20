<?php
namespace App\Controllers;

use App\Dao\DepartmentDao;
use App\Helpers\Response;
use App\Middleware\JwtMiddleware;

class DepartmentController
{
    public function index(array $params = []): void
    {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        $auth = null;
        if (str_starts_with($authHeader, 'Bearer ')) {
            $auth = \App\Helpers\JwtHelper::validate(substr($authHeader, 7));
        }

        $facultyId = null;

        if ($auth && $auth['role'] === 'dean' && empty($_GET['all_faculties'])) {
            $facultyId = $auth['faculty'];
        } elseif (!empty($_GET['faculty_id'])) {
            $facultyId = (int)$_GET['faculty_id'];
        }

        Response::success(DepartmentDao::list($facultyId));
    }

    public function show(array $params = []): void
    {
        JwtMiddleware::handle();
        $d = DepartmentDao::findById((int)($params['id'] ?? 0));
        if (!$d) Response::error('Department not found', 404);
        Response::success($d);
    }

    public function store(array $params = []): void
    {
        $auth = JwtMiddleware::handle(['system_admin', 'dean']);
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        if (empty($body['dept_name']) || empty($body['faculty_id'])) {
            Response::error('dept_name and faculty_id are required', 422);
        }

        $headId = !empty($body['head_id']) ? (int)$body['head_id'] : null;
        if ($headId) {
            $conflict = DepartmentDao::headConflict($headId);
            if ($conflict) {
                Response::error("This person is already the Head of {$conflict['dept_name']}. Move them off that department first, or choose a different Head.", 422);
            }
        }

        $id = DepartmentDao::create($body['dept_name'], (int)$body['faculty_id'], $headId);
        Response::success(['id' => $id], 'Department created', 201);
    }

    public function update(array $params = []): void
    {
        JwtMiddleware::handle(['system_admin', 'dean']);
        $id   = (int)($params['id'] ?? 0);
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        if (array_key_exists('head_id', $body) && !empty($body['head_id'])) {
            $conflict = DepartmentDao::headConflict((int)$body['head_id'], $id);
            if ($conflict) {
                Response::error("This person is already the Head of {$conflict['dept_name']}. Move them off that department first, or choose a different Head.", 422);
            }
        }

        $ok   = DepartmentDao::update($id, $body);
        Response::success(['updated' => $ok]);
    }
}
