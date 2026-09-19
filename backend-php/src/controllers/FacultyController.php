<?php
namespace App\Controllers;

use App\Dao\FacultyDao;
use App\Helpers\Response;
use App\Middleware\JwtMiddleware;

class FacultyController
{
    public function index(array $params = []): void
    {
        // Any authenticated user may list faculties (students need this to
        // pick a target faculty for supervisor requests; dept heads use it
        // for cross-faculty work requests).
        JwtMiddleware::handle();
        Response::success(FacultyDao::list());
    }

    public function show(array $params = []): void
    {
        JwtMiddleware::handle(['system_admin', 'dean', 'department_head']);
        $f = FacultyDao::findById((int)($params['id'] ?? 0));
        if (!$f) Response::error('Faculty not found', 404);
        Response::success($f);
    }

    public function store(array $params = []): void
    {
        JwtMiddleware::handle(['system_admin']);
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        if (empty($body['faculty_name'])) Response::error('faculty_name is required', 422);
        $id = FacultyDao::create($body['faculty_name'], $body['dean_id'] ?? null);
        Response::success(['id' => $id], 'Faculty created', 201);
    }

    public function update(array $params = []): void
    {
        JwtMiddleware::handle(['system_admin']);
        $id   = (int)($params['id'] ?? 0);
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $ok   = FacultyDao::update($id, $body);
        Response::success(['updated' => $ok]);
    }
}
