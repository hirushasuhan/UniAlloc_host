<?php
namespace App\Controllers;

use App\Dao\AssignmentDao;
use App\Dao\AuditLogDao;
use App\Dao\NotificationDao;
use App\Dao\UserDao;
use App\Helpers\Response;
use App\Middleware\JwtMiddleware;
use App\Services\WorkloadService;

class AssignmentController
{
    public function index(array $params = []): void
    {
        $auth    = JwtMiddleware::handle();
        $filters = [];

        // ?my=1 → any role can view only the assignments assigned to themselves
        // Used by the Dean/Dept-Head "My Work" pages
        if (!empty($_GET['my'])) {
            $filters['assigned_to'] = $auth['sub'];
        } else {
            switch ($auth['role']) {
                case 'system_admin':
                    break;
                case 'dean':
                    $filters['dean_scope_faculty_id'] = $auth['faculty'];
                    $filters['dean_scope_user_id']    = $auth['sub'];
                    break;
                case 'department_head':
                    $filters['department_id'] = $auth['dept'];
                    break;
                case 'lecturer':
                    $filters['assigned_to'] = $auth['sub'];
                    break;
                default:
                    Response::error('Forbidden', 403);
            }
        }

        // Optional filters from query string
        foreach (['status', 'priority'] as $f) {
            if (!empty($_GET[$f])) $filters[$f] = $_GET[$f];
        }

        Response::success(AssignmentDao::list($filters));
    }

    public function show(array $params = []): void
    {
        $auth = JwtMiddleware::handle();
        $id   = (int)($params['id'] ?? 0);
        $a    = AssignmentDao::findById($id);

        if (!$a) Response::error('Assignment not found', 404);

        if ($auth['role'] === 'lecturer' && (int)$a['assigned_to'] !== $auth['sub']) {
            Response::error('Forbidden', 403);
        }

        $a['progress_log'] = AssignmentDao::getProgress($id);
        Response::success($a);
    }

    public function store(array $params = []): void
    {
        $auth = JwtMiddleware::handle(['system_admin', 'dean', 'department_head']);
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        foreach (['title','assigned_to','estimated_hours'] as $req) {
            if (empty($body[$req])) Response::error("Field '$req' is required", 422);
        }

        // Deadline cannot be a past date
        if (!empty($body['deadline']) && $body['deadline'] < date('Y-m-d')) {
            Response::error('Deadline cannot be a past date.', 422);
        }

        $assigneeId = (int)$body['assigned_to'];
        $assignee = UserDao::findById($assigneeId);
        if (!$assignee) {
            Response::error('Assignee user not found', 404);
        }

        // Logic check: Deans can assign works to department heads, but department heads cannot assign work to deans (only can request)
        if ($auth['role'] === 'department_head' && $assignee['role_name'] === 'dean') {
            Response::error('Department heads cannot assign work to Deans. You must submit a request instead.', 403);
        }

        // Logic check: Other department heads cannot assign work to another department lecturer
        if ($auth['role'] === 'department_head') {
            if ((int)$assignee['department_id'] !== (int)$auth['dept']) {
                Response::error('You cannot assign work to a lecturer from another department. Please submit a request to their department head instead.', 403);
            }
        }

        // Logic check: Other faculty deans cannot assign different faculty lecturer (only can request)
        if ($auth['role'] === 'dean') {
            if ((int)$assignee['faculty_id'] !== (int)$auth['faculty']) {
                Response::error('You cannot assign work to a lecturer from another faculty. Please submit a request to their dean instead.', 403);
            }
        }

        $body['assigned_by']   = $auth['sub'];
        $body['department_id'] = $body['department_id'] ?? $assignee['department_id'] ?? $auth['dept'];

        $id = AssignmentDao::create($body);

        // Workload overload check
        WorkloadService::checkAndNotifyOverload((int)$body['assigned_to'], $id, $auth['sub']);

        // Notify assignee
        NotificationDao::create(
            (int)$body['assigned_to'],
            "You have been assigned a new task: \"{$body['title']}\"",
            'assignment'
        );

        AuditLogDao::log($auth['sub'], 'create_assignment', 'assignments', $id);
        Response::success(['id' => $id], 'Assignment created', 201);
    }

    public function update(array $params = []): void
    {
        $auth = JwtMiddleware::handle(['system_admin', 'dean', 'department_head']);
        $id   = (int)($params['id'] ?? 0);
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        
        $a = AssignmentDao::findById($id);
        if (!$a) Response::error('Assignment not found', 404);

        // Deadline cannot be moved to a past date
        if (!empty($body['deadline']) && $body['deadline'] < date('Y-m-d')) {
            Response::error('Deadline cannot be a past date.', 422);
        }

        $ok = AssignmentDao::update($id, $body);

        // Notify the lecturer about remedial changes (e.g. after an appeal review)
        if ($ok) {
            $changes = [];
            if (isset($body['priority']) && $body['priority'] !== $a['priority']) {
                $changes[] = "priority changed to '{$body['priority']}'";
            }
            if (array_key_exists('deadline', $body) && $body['deadline'] !== $a['deadline']) {
                $changes[] = 'deadline ' . ($body['deadline'] ? "extended to {$body['deadline']}" : 'removed');
            }
            if (isset($body['estimated_hours']) && (float)$body['estimated_hours'] !== (float)$a['estimated_hours']) {
                $changes[] = "estimated hours changed to {$body['estimated_hours']}h";
            }
            if ($changes) {
                NotificationDao::create(
                    (int)$a['assigned_to'],
                    "Your task \"{$a['title']}\" was updated: " . implode(', ', $changes) . '.',
                    'assignment'
                );
            }
            if (isset($body['status']) && $body['status'] === 'cancelled' && $a['status'] !== 'cancelled') {
                NotificationDao::create(
                    (int)$a['assigned_to'],
                    "Your task \"{$a['title']}\" has been removed from your workload.",
                    'assignment'
                );
            }
        }

        // Notify if approved
        if (isset($body['status']) && $body['status'] === 'completed' && $a['status'] === 'review_pending') {
            NotificationDao::create(
                (int)$a['assigned_to'],
                "Your task \"{$a['title']}\" was approved and marked as completed.",
                'assignment'
            );
        }

        // Optional custom warning from the dean / department head to the assignee
        // (e.g. sent alongside a deadline extension for an overdue task)
        if (!empty($body['notify_message'])) {
            NotificationDao::create(
                (int)$a['assigned_to'],
                trim($body['notify_message']),
                'warning'
            );
        }

        AuditLogDao::log($auth['sub'], 'update_assignment', 'assignments', $id);
        Response::success(['updated' => $ok]);
    }

    public function destroy(array $params = []): void
    {
        $auth = JwtMiddleware::handle(['system_admin', 'dean', 'department_head']);
        $id   = (int)($params['id'] ?? 0);
        $ok   = AssignmentDao::delete($id);
        AuditLogDao::log($auth['sub'], 'cancel_assignment', 'assignments', $id);
        Response::success(['cancelled' => $ok]);
    }

    public function updateProgress(array $params = []): void
    {
        // Lecturers, dept heads, and deans can all update progress on their own assignments
        $auth = JwtMiddleware::handle(['lecturer', 'department_head', 'dean']);
        $id   = (int)($params['id'] ?? 0);
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $a = AssignmentDao::findById($id);
        if (!$a) Response::error('Assignment not found', 404);
        // Only the person the assignment is assigned TO may update progress
        if ((int)$a['assigned_to'] !== (int)$auth['sub']) Response::error('Forbidden', 403);

        $pct  = (int)($body['progress_percent'] ?? 0);
        $note = $body['note'] ?? null;

        $pid = AssignmentDao::addProgress($id, $auth['sub'], $pct, $note);

        // Fetch user for notification
        $user = \App\Dao\UserDao::findById($auth['sub']);
        $userName = $user['full_name'] ?? 'User';

        if ($pct >= 100) {
            AssignmentDao::update($id, ['status' => 'review_pending']);
            NotificationDao::create(
                (int)$a['assigned_by'],
                "Task ready for review: \"{$a['title']}\" (completed by {$userName})",
                'assignment'
            );
        } elseif ($pct > 0 && $a['status'] === 'pending') {
            AssignmentDao::update($id, ['status' => 'in_progress']);
            NotificationDao::create(
                (int)$a['assigned_by'],
                "Task accepted & started: \"{$a['title']}\" (by {$userName})",
                'assignment'
            );
        }

        AuditLogDao::log($auth['sub'], 'update_progress', 'assignment_progress', $pid);
        Response::success(['progress_id' => $pid], 'Progress updated');
    }
}
