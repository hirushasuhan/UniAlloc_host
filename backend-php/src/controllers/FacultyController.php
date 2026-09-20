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

        $deanId = !empty($body['dean_id']) ? (int)$body['dean_id'] : null;
        if ($deanId) {
            $conflict = FacultyDao::deanConflict($deanId);
            if ($conflict) {
                Response::error("This person is already the Dean of {$conflict['faculty_name']}. Move them off that faculty first, or choose a different Dean.", 422);
            }
        }

        $id = FacultyDao::create($body['faculty_name'], $deanId);
        Response::success(['id' => $id], 'Faculty created', 201);
    }

    public function update(array $params = []): void
    {
        JwtMiddleware::handle(['system_admin']);
        $id   = (int)($params['id'] ?? 0);
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        if (array_key_exists('dean_id', $body) && !empty($body['dean_id'])) {
            $conflict = FacultyDao::deanConflict((int)$body['dean_id'], $id);
            if ($conflict) {
                Response::error("This person is already the Dean of {$conflict['faculty_name']}. Move them off that faculty first, or choose a different Dean.", 422);
            }
        }

        $ok   = FacultyDao::update($id, $body);
        Response::success(['updated' => $ok]);
    }
}
