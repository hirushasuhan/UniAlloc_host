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
        $auth = JwtMiddleware::handle();
        $a    = AppealDao::findById((int)($params['id'] ?? 0));
        if (!$a) Response::error('Appeal not found', 404);

        self::guardCanAccess($auth, $a);

        Response::success($a);
    }

    /**
     * A valid token is not enough to read one appeal. The scoping index()
     * applies to the list has to apply to a single record too: otherwise any
     * signed-in account can walk the IDs and read every lecturer's appeal
     * text and the department head's private review notes.
     *
     * Roles not named here (e.g. student) never have a legitimate reason to
     * open an appeal, so they fall through to 403.
     */
    private static function guardCanAccess(array $auth, array $appeal): void
    {
        switch ($auth['role']) {
            case 'system_admin':
                return;

            case 'lecturer':
                if ((int)$appeal['lecturer_id'] === (int)$auth['sub']) return;
                break;

            case 'department_head':
                $dept = $appeal['lecturer_department_id'] ?? null;
                if ($dept !== null && isset($auth['dept']) && $auth['dept'] !== null
                    && (int)$dept === (int)$auth['dept']) {
                    return;
                }
                break;

            case 'dean':
                $faculty = $appeal['lecturer_faculty_id'] ?? null;
                if ($faculty !== null && isset($auth['faculty']) && $auth['faculty'] !== null
                    && (int)$faculty === (int)$auth['faculty']) {
                    return;
                }
                break;
        }

        Response::error('Forbidden', 403);
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

        // Role alone used to be enough to resolve ANY appeal, so a head of
        // one department could review another department's. Same scope rule
        // as show().
        $existing = AppealDao::findById($id);
        if (!$existing) Response::error('Appeal not found', 404);
        self::guardCanAccess($auth, $existing);

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
