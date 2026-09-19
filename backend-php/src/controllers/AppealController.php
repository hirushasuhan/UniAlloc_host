<?php
namespace App\Controllers;

use App\Dao\AppealDao;
use App\Dao\AuditLogDao;
use App\Dao\NotificationDao;
use App\Helpers\Response;
use App\Middleware\JwtMiddleware;

class AppealController
{
    public function index(array $params = []): void
    {
        $auth    = JwtMiddleware::handle();
        $filters = [];

        switch ($auth['role']) {
            case 'lecturer':
                $filters['lecturer_id'] = $auth['sub'];
                break;
            case 'department_head':
                $filters['department_id'] = $auth['dept'];
                break;
            case 'dean':
                $filters['faculty_id'] = $auth['faculty'];
                break;
        }

        Response::success(AppealDao::list($filters));
    }

    public function show(array $params = []): void
    {
        JwtMiddleware::handle();
        $a = AppealDao::findById((int)($params['id'] ?? 0));
        if (!$a) Response::error('Appeal not found', 404);
        Response::success($a);
    }

    public function store(array $params = []): void
    {
        $auth = JwtMiddleware::handle(['lecturer']);
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        if (empty($body['reason'])) Response::error('reason is required', 422);

        $id = AppealDao::create($auth['sub'], $body['assignment_id'] ?? null, $body['reason']);
        AuditLogDao::log($auth['sub'], 'submit_appeal', 'workload_appeals', $id);

        // Notify dept head
        $db   = \App\Helpers\Db::connection();
        $stmt = $db->prepare('SELECT department_id FROM users WHERE id = :uid');
        $stmt->execute([':uid' => $auth['sub']]);
        $row  = $stmt->fetch();
        $headId = ($row && $row['department_id'])
            ? \App\Dao\UserDao::departmentHeadId((int)$row['department_id'])
            : null;
        if ($headId) {
            NotificationDao::create($headId, 'A lecturer has submitted a workload appeal.', 'appeal');
        }

        Response::success(['id' => $id], 'Appeal submitted', 201);
    }

    public function update(array $params = []): void
    {
        $auth = JwtMiddleware::handle(['department_head', 'dean', 'system_admin']);
        $id   = (int)($params['id'] ?? 0);
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $status = $body['status'] ?? '';

        if (!in_array($status, ['reviewed','resolved'], true)) {
            Response::error("status must be 'reviewed' or 'resolved'", 422);
        }

        $ok     = AppealDao::update($id, $status, $auth['sub'], $body['review_note'] ?? null);
        $appeal = AppealDao::findById($id);

        if ($appeal) {
            NotificationDao::create(
                (int)$appeal['lecturer_id'],
                "Your workload appeal has been $status.",
                'appeal'
            );
        }

        AuditLogDao::log($auth['sub'], "appeal_$status", 'workload_appeals', $id);
        Response::success(['updated' => $ok]);
    }
}
