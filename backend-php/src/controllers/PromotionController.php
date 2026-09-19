<?php
namespace App\Controllers;

use App\Dao\PromotionDao;
use App\Dao\UserDao;
use App\Dao\AuditLogDao;
use App\Dao\NotificationDao;
use App\Helpers\Response;
use App\Middleware\JwtMiddleware;

class PromotionController
{
    public function index(array $params = []): void
    {
        JwtMiddleware::handle(['system_admin', 'dean']);
        Response::success(PromotionDao::list());
    }

    public function store(array $params = []): void
    {
        $auth = JwtMiddleware::handle(['dean', 'system_admin']);
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        foreach (['user_id','new_role'] as $req) {
            if (empty($body[$req])) Response::error("Field '$req' is required", 422);
        }

        $userId       = (int)$body['user_id'];
        $newRole      = $body['new_role'];
        $facultyId    = !empty($body['faculty_id'])    ? (int)$body['faculty_id']    : null;
        $departmentId = !empty($body['department_id']) ? (int)$body['department_id'] : null;

        $user = UserDao::findById($userId);
        if (!$user) Response::error('User not found', 404);

        $oldRoleId = (int)$user['role_id'];
        $newRoleId = UserDao::roleIdByName($newRole);
        if (!$newRoleId) Response::error('Invalid role name', 422);

        $db = \App\Helpers\Db::connection();

        // A leadership seat only counts as "taken" when its current holder is
        // active AND not On Study Leave — otherwise the seat is free to reassign.

        // --- Dean: must pick a faculty; it may not already have an active Dean ---
        if ($newRole === 'dean') {
            if (!$facultyId) Response::error('Please select the faculty this Dean will lead.', 422);

            $fac = $db->prepare('SELECT id, dean_id FROM faculties WHERE id = :fid');
            $fac->execute([':fid' => $facultyId]);
            $facRow = $fac->fetch();
            if (!$facRow) Response::error('Selected faculty not found.', 404);

            if ($facRow['dean_id'] && (int)$facRow['dean_id'] !== $userId) {
                $cur = $db->prepare('SELECT is_active, operational_status FROM users WHERE id = :id');
                $cur->execute([':id' => (int)$facRow['dean_id']]);
                $curRow = $cur->fetch();
                if ($curRow && (int)$curRow['is_active'] === 1 && $curRow['operational_status'] !== 'On Study Leave') {
                    Response::error('This faculty already has an active Dean. Set them On Study Leave first, or choose another faculty.', 422);
                }
            }
        }

        // --- Department Head: must pick a department; it may not already have an active Head ---
        if ($newRole === 'department_head') {
            if (!$departmentId) Response::error('Please select the department this Head will lead.', 422);

            $dept = $db->prepare('SELECT id FROM departments WHERE id = :did');
            $dept->execute([':did' => $departmentId]);
            if (!$dept->fetch()) Response::error('Selected department not found.', 404);

            $chk = $db->prepare(
                "SELECT COUNT(*) AS c
                 FROM users u
                 JOIN roles r ON r.id = u.role_id
                 WHERE u.department_id = :did
                   AND r.role_name = 'department_head'
                   AND u.is_active = 1
                   AND u.operational_status != 'On Study Leave'
                   AND u.id != :uid"
            );
            $chk->execute([':did' => $departmentId, ':uid' => $userId]);
            if ((int)$chk->fetch()['c'] > 0) {
                Response::error('This department already has an active Head. Set them On Study Leave first, or choose another department.', 422);
            }

            // Place the user in the chosen department so the head_id sync (in approve) targets it
            $db->prepare('UPDATE users SET department_id = :did WHERE id = :uid')
               ->execute([':did' => $departmentId, ':uid' => $userId]);
        }

        $id = PromotionDao::create($userId, $oldRoleId, $newRoleId, $auth['sub']);

        // Dean can directly promote lecturer→dept_head; system admin applies any change immediately
        $directApprove = ($auth['role'] === 'dean' && $newRole === 'department_head') || ($auth['role'] === 'system_admin');

        if ($directApprove) {
            PromotionDao::approve($id, $auth['sub']);

            // Dean placement: link this user as the faculty's Dean and detach any old ties
            if ($newRole === 'dean') {
                $db->prepare('UPDATE faculties SET dean_id = NULL WHERE dean_id = :uid')->execute([':uid' => $userId]);
                $db->prepare('UPDATE departments SET head_id = NULL WHERE head_id = :uid')->execute([':uid' => $userId]);
                $db->prepare('UPDATE users SET department_id = NULL WHERE id = :uid')->execute([':uid' => $userId]);
                $db->prepare('UPDATE faculties SET dean_id = :uid WHERE id = :fid')->execute([':uid' => $userId, ':fid' => $facultyId]);
            } else {
                // Moving to a non-Dean role → release any faculty they were Dean of
                $db->prepare('UPDATE faculties SET dean_id = NULL WHERE dean_id = :uid')->execute([':uid' => $userId]);
            }

            NotificationDao::create($userId, 'Your user role has been changed to ' . ucwords(str_replace('_', ' ', $newRole)), 'promotion');
        }

        AuditLogDao::log($auth['sub'], 'initiate_promotion', 'role_promotions', $id);
        Response::success(['id' => $id], 'Promotion completed', 201);
    }

    public function update(array $params = []): void
    {
        $auth = JwtMiddleware::handle(['system_admin']);
        $id   = (int)($params['id'] ?? 0);
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $action = $body['action'] ?? '';

        if ($action === 'approve') {
            $ok = PromotionDao::approve($id, $auth['sub']);
            AuditLogDao::log($auth['sub'], 'approve_promotion', 'role_promotions', $id);
            Response::success(['approved' => $ok]);
        } elseif ($action === 'reject') {
            $ok = PromotionDao::reject($id, $auth['sub']);
            AuditLogDao::log($auth['sub'], 'reject_promotion', 'role_promotions', $id);
            Response::success(['rejected' => $ok]);
        } else {
            Response::error("action must be 'approve' or 'reject'", 422);
        }
    }
}
