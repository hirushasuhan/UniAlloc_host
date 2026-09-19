<?php
namespace App\Controllers;

use App\Dao\WorkRequestDao;
use App\Dao\UserDao;
use App\Dao\AssignmentDao;
use App\Dao\AuditLogDao;
use App\Dao\NotificationDao;
use App\Helpers\Db;
use App\Helpers\Response;
use App\Middleware\JwtMiddleware;

class WorkRequestController
{
    // ------------------------------------------------------------------
    // GET /work-requests
    // Returns all requests relevant to the current user:
    //   dean        → inbox (pending dean approval in their faculty)
    //                + requests awaiting dean acceptance as target
    //                + requests they submitted
    //   dept_head   → inbox (pending dept-head approval in their dept)
    //                + requests awaiting their acceptance as target
    //                + requests they submitted
    //   lecturer    → requests awaiting their acceptance as target
    //                + requests they submitted
    //   admin       → everything (all requests)
    // ------------------------------------------------------------------
    public function index(array $params = []): void
    {
        $auth    = JwtMiddleware::handle();
        $filters = [];

        switch ($auth['role']) {
            case 'system_admin':
                // Admin sees all — special case, no filter → skip DAO and return all
                $stmt = Db::connection()->prepare(
                    'SELECT wr.*,
                            ' . UserDao::displayNameSql('ur') . ' AS requester_name,
                            ' . UserDao::displayNameSql('ut') . ' AS target_user_name,
                            d.dept_name    AS target_dept_name,
                            f.faculty_name AS target_faculty_name
                     FROM work_requests wr
                     JOIN users ur ON ur.id = wr.requester_id
                     LEFT JOIN users ut ON ut.id = wr.target_user_id
                     LEFT JOIN departments d ON d.id = wr.target_dept_id
                     LEFT JOIN faculties f ON f.id = wr.target_faculty_id
                     ORDER BY wr.created_at DESC'
                );
                $stmt->execute();
                Response::success($stmt->fetchAll());
                return;

            case 'dean':
                $filters['requester_id']         = $auth['sub'];
                $filters['pending_dean_faculty']  = $auth['faculty'];
                $filters['pending_assignee_user'] = $auth['sub'];
                break;

            case 'department_head':
                $filters['requester_id']           = $auth['sub'];
                $filters['pending_depthead_dept']  = $auth['dept'];
                $filters['pending_assignee_user']  = $auth['sub'];
                break;

            case 'lecturer':
                $filters['requester_id']          = $auth['sub'];
                $filters['pending_assignee_user'] = $auth['sub'];
                break;

            default:
                Response::error('Forbidden', 403);
        }

        Response::success(WorkRequestDao::list($filters));
    }

    // ------------------------------------------------------------------
    // GET /work-requests/{id}
    // ------------------------------------------------------------------
    public function show(array $params = []): void
    {
        JwtMiddleware::handle();
        $req = WorkRequestDao::findById((int)($params['id'] ?? 0));
        if (!$req) Response::error('Request not found', 404);
        Response::success($req);
    }

    // ------------------------------------------------------------------
    // POST /work-requests
    // Body: { request_type, target_user_id, title, description? }
    //   target_user_id  → the actual person being requested
    //
    // The controller looks up the target user's role/dept/faculty and
    // automatically sets target_role, target_dept_id, target_faculty_id,
    // and the correct initial approval_step.
    //
    // Approval-step rules:
    //   cross_faculty + target=lecturer    → pending_dept_head → pending_dean → pending_assignee
    //   cross_faculty + target=dept_head   → pending_dept_head → pending_dean → (assigned)
    //   cross_faculty + target=dean        → pending_assignee (direct to that dean)
    //   cross_department + target=lecturer → pending_dept_head → pending_assignee
    //   cross_department + target=dept_head→ pending_assignee
    //   upward (to dean)                   → pending_assignee
    // ------------------------------------------------------------------
    public function store(array $params = []): void
    {
        $auth = JwtMiddleware::handle();
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        foreach (['request_type', 'title'] as $req) {
            if (empty($body[$req])) Response::error("Field '$req' is required", 422);
        }

        $requestType  = $body['request_type'];
        $targetUserId = isset($body['target_user_id']) ? (int)$body['target_user_id'] : null;

        // For upward requests, auto-resolve target to requester's faculty dean
        if ($requestType === 'upward') {
            $targetUserId = $this->resolveUpwardTarget($auth);
            if (!$targetUserId) Response::error('Could not find your faculty dean', 422);
        }

        if (!$targetUserId) {
            Response::error('target_user_id is required for cross_department and cross_faculty requests', 422);
        }

        // Look up target user
        $targetUser = UserDao::findById($targetUserId);
        if (!$targetUser) Response::error('Target user not found', 404);

        $targetRoleName = $targetUser['role_name'] ?? $targetUser['role'] ?? '';

        // Determine target faculty via departments join
        $targetFacultyId = null;
        $targetDeptId    = null;

        if (!empty($targetUser['department_id'])) {
            $targetDeptId = (int)$targetUser['department_id'];
            $stmt = Db::connection()->prepare(
                'SELECT faculty_id FROM departments WHERE id = :did'
            );
            $stmt->execute([':did' => $targetDeptId]);
            $row = $stmt->fetch();
            if ($row) $targetFacultyId = (int)$row['faculty_id'];
        } else {
            // dean has no department — look up faculty by dean_id
            $stmt = Db::connection()->prepare(
                'SELECT id FROM faculties WHERE dean_id = :uid LIMIT 1'
            );
            $stmt->execute([':uid' => $targetUserId]);
            $row = $stmt->fetch();
            if ($row) $targetFacultyId = (int)$row['id'];
        }

        // ---- Validation: no self / own-scope targeting ------------------
        if ($targetUserId === (int)$auth['sub']) {
            Response::error('You cannot send a work request to yourself.', 422);
        }
        if ($requestType === 'cross_faculty' && $targetFacultyId
            && (int)($auth['faculty'] ?? 0) === $targetFacultyId) {
            Response::error('Cross-faculty requests cannot target your own faculty. Use a cross-department request or assign the work directly.', 422);
        }
        if ($requestType === 'cross_department' && $targetDeptId
            && (int)($auth['dept'] ?? 0) === $targetDeptId) {
            Response::error('Cross-department requests cannot target your own department. Assign the work directly instead.', 422);
        }

        // Determine initial approval step
        $approvalStep = $this->determineInitialStep($requestType, $targetRoleName);

        $data = [
            'requester_id'      => $auth['sub'],
            'target_user_id'    => $targetUserId,
            'target_dept_id'    => $targetDeptId,
            'target_faculty_id' => $targetFacultyId,
            'request_type'      => $requestType,
            'target_role'       => $targetRoleName,
            'approval_step'     => $approvalStep,
            'title'             => $body['title'],
            'description'       => $body['description'] ?? null,
        ];

        $id = WorkRequestDao::create($data);
        AuditLogDao::log($auth['sub'], 'create_work_request', 'work_requests', $id);

        // Send first notification based on initial step
        $this->notifyFirstStep($approvalStep, $data, $targetFacultyId);

        Response::success(['id' => $id], 'Request submitted', 201);
    }

    // ------------------------------------------------------------------
    // PATCH /work-requests/{id}
    // Body: { action: 'approve' | 'accept' | 'reject' }
    //
    // The controller enforces who can act at each step:
    //   pending_dean      → only the target faculty's dean may approve/reject
    //   pending_dept_head → only the target lecturer's dept head may approve/reject
    //   pending_assignee  → only the target user themselves may accept/reject
    // ------------------------------------------------------------------
    public function resolve(array $params = []): void
    {
        $auth   = JwtMiddleware::handle();
        $id     = (int)($params['id'] ?? 0);
        $body   = json_decode(file_get_contents('php://input'), true) ?? [];
        $action = strtolower($body['action'] ?? $body['status'] ?? '');

        if (!in_array($action, ['approve', 'accept', 'reject'], true)) {
            Response::error("action must be 'approve', 'accept', or 'reject'", 422);
        }

        $req = WorkRequestDao::findById($id);
        if (!$req) Response::error('Request not found', 404);

        $step = $req['approval_step'];

        // ---- REJECT at any step ----------------------------------------
        if ($action === 'reject') {
            $this->guardCanActAtStep($auth, $req, $step);
            $ok = WorkRequestDao::reject($id, $auth['sub']);
            NotificationDao::create(
                (int)$req['requester_id'],
                "Your work request \"{$req['title']}\" was rejected.",
                'request'
            );
            AuditLogDao::log($auth['sub'], 'work_request_rejected', 'work_requests', $id);
            Response::success(['updated' => $ok]);
        }

        // ---- APPROVE / ACCEPT -------------------------------------------
        $ok = false;

        switch ($step) {
            case 'pending_dept_head':
                // The target's Department Head acts first. For a department-head
                // target this is the target themselves accepting.
                if ($auth['role'] !== 'department_head') {
                    Response::error('Only the department head can approve here', 403);
                }
                if ((int)($auth['dept'] ?? 0) !== (int)($req['target_dept_id'] ?? -1)) {
                    Response::error('You are not the head of the target department', 403);
                }

                if ($req['request_type'] === 'cross_faculty') {
                    // HOD approved → now the target faculty's Dean must approve
                    $ok = WorkRequestDao::advanceToDean($id, $auth['sub']);
                    $deanId = $this->getDeanForFaculty((int)($req['target_faculty_id'] ?? 0));
                    if ($deanId) {
                        NotificationDao::create(
                            $deanId,
                            "Work request \"{$req['title']}\" has your department head's approval and now needs your (Dean) approval.",
                            'request'
                        );
                    }
                } else {
                    // cross_department → straight to the assignee
                    $ok = WorkRequestDao::advanceToAssignee($id, $auth['sub'], 'dept_head');
                    NotificationDao::create(
                        (int)$req['target_user_id'],
                        "Work request \"{$req['title']}\" has been fully approved and is awaiting your acceptance.",
                        'request'
                    );
                }
                break;

            case 'pending_dean':
                // The target faculty's Dean approves (after the dept head).
                if ($auth['role'] !== 'dean') Response::error('Only the target faculty dean can approve here', 403);
                if ((int)($auth['faculty'] ?? 0) !== (int)($req['target_faculty_id'] ?? -1)) {
                    Response::error('You are not the dean of the target faculty', 403);
                }

                if ($req['target_role'] === 'department_head') {
                    // The target head already accepted at the dept-head step →
                    // dean approval is final; assign the work now.
                    $ok = WorkRequestDao::deanFinalApprove($id, $auth['sub']);
                    if ($ok) {
                        $this->createAssignmentFromRequest($req);
                        NotificationDao::create(
                            (int)$req['target_user_id'],
                            "Work request \"{$req['title']}\" was approved by the Dean and has been assigned to you.",
                            'request'
                        );
                        NotificationDao::create(
                            (int)$req['requester_id'],
                            "Your work request \"{$req['title']}\" was fully approved.",
                            'request'
                        );
                    }
                } else {
                    // lecturer target → the lecturer must still accept
                    $ok = WorkRequestDao::advanceToAssignee($id, $auth['sub'], 'dean');
                    NotificationDao::create(
                        (int)$req['target_user_id'],
                        "Work request \"{$req['title']}\" has been fully approved and is awaiting your acceptance.",
                        'request'
                    );
                }
                break;

            case 'pending_assignee':
                // Only the target user themselves
                if ((int)$auth['sub'] !== (int)$req['target_user_id']) {
                    Response::error('Only the target person can accept this request', 403);
                }
                $ok = WorkRequestDao::finalApprove($id, $auth['sub']);

                // Create assignment for the accepted request
                if ($ok) {
                    $this->createAssignmentFromRequest($req);
                }

                NotificationDao::create(
                    (int)$req['requester_id'],
                    "Your work request \"{$req['title']}\" was accepted!",
                    'request'
                );
                break;

            default:
                Response::error('This request is already resolved', 422);
        }

        AuditLogDao::log($auth['sub'], "work_request_{$action}", 'work_requests', $id);
        Response::success(['updated' => $ok]);
    }

    // ------------------------------------------------------------------
    // Private helpers
    // ------------------------------------------------------------------

    private function determineInitialStep(string $requestType, string $targetRole): string
    {
        if ($requestType === 'cross_faculty') {
            // A dean is requested directly (no chain).
            if ($targetRole === 'dean') return 'pending_assignee';
            // lecturer or department_head → the target's Dept Head approves
            // FIRST, then their Dean, then (for a lecturer) the lecturer accepts.
            return 'pending_dept_head';
        }

        if ($requestType === 'cross_department') {
            if ($targetRole === 'lecturer') return 'pending_dept_head';
            // department_head target → no intermediate approver
            return 'pending_assignee';
        }

        // upward → dean receives directly
        return 'pending_assignee';
    }

    private function notifyFirstStep(string $step, array $data, ?int $targetFacultyId): void
    {
        if ($step === 'pending_dean' && $targetFacultyId) {
            // Notify the dean of the target faculty
            $stmt = Db::connection()->prepare(
                'SELECT dean_id FROM faculties WHERE id = :fid'
            );
            $stmt->execute([':fid' => $targetFacultyId]);
            $row = $stmt->fetch();
            if ($row && $row['dean_id']) {
                NotificationDao::create(
                    (int)$row['dean_id'],
                    "New cross-faculty work request \"{$data['title']}\" requires your approval.",
                    'request'
                );
            }
        } elseif ($step === 'pending_dept_head' && !empty($data['target_dept_id'])) {
            $headId = UserDao::departmentHeadId((int)$data['target_dept_id']);
            if ($headId) {
                NotificationDao::create(
                    $headId,
                    "New work request \"{$data['title']}\" requires your department's approval.",
                    'request'
                );
            }
        } elseif ($step === 'pending_assignee' && !empty($data['target_user_id'])) {
            NotificationDao::create(
                (int)$data['target_user_id'],
                "You have a new work request \"{$data['title']}\" awaiting your acceptance.",
                'request'
            );
        }
    }

    private function getDeanForFaculty(int $facultyId): ?int
    {
        if (!$facultyId) return null;
        $stmt = Db::connection()->prepare('SELECT dean_id FROM faculties WHERE id = :fid');
        $stmt->execute([':fid' => $facultyId]);
        $row = $stmt->fetch();
        return $row && $row['dean_id'] ? (int)$row['dean_id'] : null;
    }

    private function getDeptHeadForUser(int $userId): ?int
    {
        $stmt = Db::connection()->prepare(
            'SELECT department_id FROM users WHERE id = :uid'
        );
        $stmt->execute([':uid' => $userId]);
        $row = $stmt->fetch();
        if (!$row || !$row['department_id']) return null;
        return UserDao::departmentHeadId((int)$row['department_id']);
    }

    private function resolveUpwardTarget(array $auth): ?int
    {
        // Dept head sending upward → find their faculty's dean
        $deptId = $auth['dept'] ?? null;
        if (!$deptId) return null;
        $stmt = Db::connection()->prepare(
            'SELECT f.dean_id FROM departments d
             JOIN faculties f ON f.id = d.faculty_id
             WHERE d.id = :did'
        );
        $stmt->execute([':did' => $deptId]);
        $row = $stmt->fetch();
        return $row && $row['dean_id'] ? (int)$row['dean_id'] : null;
    }

    private function guardCanActAtStep(array $auth, array $req, string $step): void
    {
        switch ($step) {
            case 'pending_dean':
                if ($auth['role'] !== 'dean' ||
                    (int)($auth['faculty'] ?? 0) !== (int)($req['target_faculty_id'] ?? -1)) {
                    Response::error('Not authorised to act on this request', 403);
                }
                break;
            case 'pending_dept_head':
                if ($auth['role'] !== 'department_head' ||
                    (int)($auth['dept'] ?? 0) !== (int)($req['target_dept_id'] ?? -1)) {
                    Response::error('Not authorised to act on this request', 403);
                }
                break;
            case 'pending_assignee':
                if ((int)$auth['sub'] !== (int)$req['target_user_id']) {
                    Response::error('Not authorised to act on this request', 403);
                }
                break;
            default:
                Response::error('This request is already resolved', 422);
        }
    }

    private function createAssignmentFromRequest(array $req): void
    {
        $deptId = $req['target_dept_id'] ?? null;
        if (!$deptId && !empty($req['target_user_id'])) {
            $u = UserDao::findById((int)$req['target_user_id']);
            if ($u) $deptId = $u['department_id'] ?? null;
        }

        AssignmentDao::create([
            'title'           => $req['title'],
            'description'     => $req['description'] ?? null,
            'assigned_to'     => (int)$req['target_user_id'],
            'assigned_by'     => (int)$req['requester_id'],
            'department_id'   => $deptId ? (int)$deptId : null,
            'priority'        => 'medium',
            'estimated_hours' => 4.00,
            'deadline'        => null,
        ]);
    }
}
