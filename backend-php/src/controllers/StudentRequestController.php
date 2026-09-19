<?php
namespace App\Controllers;

use App\Dao\StudentRequestDao;
use App\Dao\AuditLogDao;
use App\Dao\NotificationDao;
use App\Dao\UserDao;
use App\Helpers\Db;
use App\Helpers\Response;
use App\Middleware\JwtMiddleware;

class StudentRequestController
{
    public function index(array $params = []): void
    {
        $auth    = JwtMiddleware::handle();
        $filters = [];

        if ($auth['role'] === 'student') {
            $filters['student_id'] = $auth['sub'];
        } elseif ($auth['role'] === 'dean') {
            $filters['faculty_id'] = $auth['faculty'];
        } elseif ($auth['role'] === 'department_head') {
            $filters['department_id'] = $auth['dept'];
        }

        Response::success(StudentRequestDao::list($filters));
    }

    public function show(array $params = []): void
    {
        JwtMiddleware::handle();
        $sr = StudentRequestDao::findById((int)($params['id'] ?? 0));
        if (!$sr) Response::error('Student request not found', 404);
        Response::success($sr);
    }

    public function store(array $params = []): void
    {
        $auth = JwtMiddleware::handle(['student']);
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        if (empty($body['title'])) Response::error('title is required', 422);

        $db = Db::connection();

        // Student chooses the target faculty & department.
        // Fall back to the student's own department's faculty if not provided.
        $facultyId    = !empty($body['faculty_id'])    ? (int)$body['faculty_id']    : null;
        $departmentId = !empty($body['department_id']) ? (int)$body['department_id'] : null;

        if (!$facultyId) {
            $stmt = $db->prepare(
                'SELECT d.faculty_id FROM users u JOIN departments d ON d.id = u.department_id WHERE u.id = :uid'
            );
            $stmt->execute([':uid' => $auth['sub']]);
            $row = $stmt->fetch();
            $facultyId = isset($row['faculty_id']) ? (int)$row['faculty_id'] : null;
        }

        if (!$facultyId) Response::error('Could not determine faculty. Set faculty_id in request body.', 422);

        // Validate the chosen department belongs to the chosen faculty
        if ($departmentId) {
            $chk = $db->prepare('SELECT faculty_id FROM departments WHERE id = :did');
            $chk->execute([':did' => $departmentId]);
            $dept = $chk->fetch();
            if (!$dept) {
                Response::error('Department not found.', 422);
            }
            if ((int)$dept['faculty_id'] !== $facultyId) {
                Response::error('The selected department does not belong to the selected faculty.', 422);
            }
        }

        // Update student profile details (name, enrollment_number, contact) in active users table if provided
        $updateFields = [];
        $updateParams = [];
        if (!empty($body['name'])) {
            $updateFields[] = 'full_name = :name';
            $updateParams[':name'] = $body['name'];
        }
        if (!empty($body['enrollment_number'])) {
            $updateFields[] = 'enrollment_number = :enrollment';
            $updateParams[':enrollment'] = $body['enrollment_number'];
        }
        if (!empty($body['contact'])) {
            $updateFields[] = 'contact = :contact';
            $updateParams[':contact'] = $body['contact'];
        }
        if (!empty($updateFields)) {
            $updateParams[':uid'] = $auth['sub'];
            $db->prepare('UPDATE users SET ' . implode(', ', $updateFields) . ' WHERE id = :uid')->execute($updateParams);
        }

        $id = StudentRequestDao::create($auth['sub'], $facultyId, $body['title'], $body['description'] ?? null, $departmentId);

        // STEP 1 of the chain: notify ONLY the student's OWN department head to
        // endorse first. The Dean / target department head are notified later,
        // once the home head has endorsed (see update()).
        $student  = UserDao::findById((int)$auth['sub']);
        $homeDept = $student['department_id'] ?? null;
        $homeHead = $homeDept ? UserDao::departmentHeadId((int)$homeDept) : null;

        if ($homeHead) {
            NotificationDao::create(
                $homeHead,
                "New student supervisor request awaiting your endorsement: \"{$body['title']}\"",
                'request'
            );
        } else {
            // No home department head on record — fall back to advancing the
            // request straight to final approval so it never gets stuck.
            StudentRequestDao::endorse($id, (int)$auth['sub'], null);
            self::notifyFinalApprover($db, StudentRequestDao::findById($id), $body['title']);
        }

        AuditLogDao::log($auth['sub'], 'submit_student_request', 'student_requests', $id);
        Response::success(['id' => $id], 'Request submitted', 201);
    }

    public function update(array $params = []): void
    {
        $auth = JwtMiddleware::handle(['dean', 'department_head', 'system_admin']);
        $id   = (int)($params['id'] ?? 0);
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        // Accept either {status: assigned|rejected} or the legacy {action: approve|reject}
        $status = $body['status'] ?? '';
        if (!$status && !empty($body['action'])) {
            $status = $body['action'] === 'approve' ? 'assigned' : ($body['action'] === 'reject' ? 'rejected' : '');
        }
        if (!in_array($status, ['assigned', 'rejected'], true)) {
            Response::error("status must be 'assigned' or 'rejected'", 422);
        }

        $sr = StudentRequestDao::findById($id);
        if (!$sr) Response::error('Student request not found', 404);

        // Already fully resolved?
        if (in_array($sr['approval_step'], ['approved', 'rejected'], true)) {
            Response::error('This request has already been ' . $sr['status'] . '.', 409);
        }

        $db = Db::connection();

        $homeDeptId    = isset($sr['home_department_id']) ? (int)$sr['home_department_id'] : 0;
        $homeFacultyId = isset($sr['home_faculty_id'])    ? (int)$sr['home_faculty_id']    : 0;
        $targetFacId   = (int)$sr['faculty_id'];
        $targetDeptId  = isset($sr['department_id']) ? (int)$sr['department_id'] : 0;

        // Cross = the request targets a faculty or department the student does
        // not belong to.
        $isCross = ($targetFacId !== $homeFacultyId)
                || ($targetDeptId && $targetDeptId !== $homeDeptId);

        // ---------------------------------------------------------------
        // STEP 1 — the student's own department head endorses (or rejects)
        // ---------------------------------------------------------------
        if ($sr['approval_step'] === 'pending_home_head') {
            $isHomeHead = $auth['role'] === 'department_head' && (int)$auth['dept'] === $homeDeptId;
            if (!$isHomeHead && $auth['role'] !== 'system_admin') {
                Response::error('Only the student\'s own department head can endorse this request first.', 403);
            }

            if ($status === 'rejected') {
                StudentRequestDao::reject($id, (int)$auth['sub']);
                NotificationDao::create(
                    (int)$sr['student_id'],
                    "Your supervisor request \"{$sr['title']}\" was rejected by your department.",
                    'request'
                );
                AuditLogDao::log($auth['sub'], 'student_request_rejected', 'student_requests', $id);
                Response::success(['updated' => true]);
            }

            // Own-department request → the home head approves & assigns directly,
            // in a single step (no Dean involvement). The supervisor is a lecturer
            // from this same department.
            $isOwnDepartment = $targetDeptId && $targetDeptId === $homeDeptId;
            if ($isOwnDepartment) {
                $assignedTo = !empty($body['assigned_to']) ? (int)$body['assigned_to'] : null;
                if (!$assignedTo) {
                    Response::error('assigned_to (supervisor) is required when approving a request.', 422);
                }
                if (!empty($body['deadline']) && $body['deadline'] < date('Y-m-d')) {
                    Response::error('Deadline cannot be a past date.', 422);
                }
                StudentRequestDao::finalise($id, 'assigned', (int)$auth['sub'], $assignedTo);
                self::assignSupervisor($sr, $assignedTo, (int)$auth['sub'], $body);
                Response::success(['updated' => true]);
            }

            // Otherwise (faculty-wide / cross-department / cross-faculty) →
            // endorse & advance to final approval, optionally suggesting a supervisor.
            $suggested = !empty($body['suggested_supervisor_id']) ? (int)$body['suggested_supervisor_id'] : null;
            StudentRequestDao::endorse($id, (int)$auth['sub'], $suggested);

            $fresh = StudentRequestDao::findById($id);
            self::notifyFinalApprover($db, $fresh, $sr['title']);

            NotificationDao::create(
                (int)$sr['student_id'],
                "Your supervisor request \"{$sr['title']}\" was endorsed by your department and is awaiting final approval.",
                'request'
            );
            AuditLogDao::log($auth['sub'], 'student_request_endorsed', 'student_requests', $id);
            Response::success(['updated' => true, 'stage' => 'pending_final']);
        }

        // ---------------------------------------------------------------
        // STEP 2 — final approval (assign supervisor) or rejection
        // ---------------------------------------------------------------
        // Determine who is allowed to act as the final approver.
        $canFinalise = false;
        if ($auth['role'] === 'system_admin') {
            $canFinalise = true;
        } elseif (!$isCross) {
            // Same faculty → the Dean of the student's faculty.
            $canFinalise = $auth['role'] === 'dean' && (int)$auth['faculty'] === $homeFacultyId;
        } else {
            // Cross faculty / department → target dept head OR target faculty dean.
            $deanOk = $auth['role'] === 'dean' && (int)$auth['faculty'] === $targetFacId;
            $headOk = $targetDeptId && $auth['role'] === 'department_head' && (int)$auth['dept'] === $targetDeptId;
            $canFinalise = $deanOk || $headOk;
        }
        if (!$canFinalise) {
            Response::error('You are not the final approver for this request.', 403);
        }

        if ($status === 'rejected') {
            StudentRequestDao::finalise($id, 'rejected', (int)$auth['sub'], null);
            NotificationDao::create(
                (int)$sr['student_id'],
                "Your supervisor request \"{$sr['title']}\" was rejected.",
                'request'
            );
            AuditLogDao::log($auth['sub'], 'student_request_rejected', 'student_requests', $id);
            Response::success(['updated' => true]);
        }

        // Approving requires a supervisor.
        $assignedTo = !empty($body['assigned_to']) ? (int)$body['assigned_to'] : null;
        if (!$assignedTo) {
            Response::error('assigned_to (supervisor) is required when approving a request.', 422);
        }
        if (!empty($body['deadline']) && $body['deadline'] < date('Y-m-d')) {
            Response::error('Deadline cannot be a past date.', 422);
        }

        StudentRequestDao::finalise($id, 'assigned', (int)$auth['sub'], $assignedTo);
        self::assignSupervisor($sr, $assignedTo, (int)$auth['sub'], $body);
        Response::success(['updated' => true]);
    }

    /**
     * Create the real supervision assignment for an approved request and fire
     * the assignee + student notifications. Shared by the Dean/target-head
     * final approval (Step 2) and the home head's direct own-department
     * approval (Step 1 shortcut).
     */
    private static function assignSupervisor(array $sr, int $assignedTo, int $reviewedBy, array $body): void
    {
        // Approving creates a REAL assignment so the supervision shows up in the
        // lecturer's My Work / assignments, with priority, hours & deadline.
        $assignee = UserDao::findById($assignedTo);

        $assignmentId = \App\Dao\AssignmentDao::create([
            'title'           => 'Student Supervision: ' . $sr['title'],
            'description'     => trim(
                "Supervisor allocation for student {$sr['student_name']}"
                . (!empty($sr['student_enrollment']) ? " ({$sr['student_enrollment']})" : '')
                . (!empty($sr['description']) ? "\n\n{$sr['description']}" : '')
            ),
            'assigned_to'     => $assignedTo,
            'assigned_by'     => $reviewedBy,
            'department_id'   => $sr['department_id'] ?? ($assignee['department_id'] ?? null),
            'priority'        => in_array($body['priority'] ?? '', ['low', 'medium', 'high', 'urgent'], true)
                                    ? $body['priority'] : 'medium',
            'estimated_hours' => !empty($body['estimated_hours']) ? (float)$body['estimated_hours'] : 4,
            'deadline'        => $body['deadline'] ?? null,
        ]);

        \App\Services\WorkloadService::checkAndNotifyOverload($assignedTo, $assignmentId, $reviewedBy);
        NotificationDao::create(
            $assignedTo,
            "You have been assigned a new task: \"Student Supervision: {$sr['title']}\"",
            'assignment'
        );
        AuditLogDao::log($reviewedBy, 'create_assignment', 'assignments', $assignmentId);

        NotificationDao::create(
            (int)$sr['student_id'],
            "Your supervisor request \"{$sr['title']}\" was approved.",
            'request'
        );
        AuditLogDao::log($reviewedBy, 'student_request_assigned', 'student_requests', (int)$sr['id']);
    }

    /**
     * Notify the Step-2 final approver once a request has been endorsed:
     *   • Same faculty (own dept / faculty-wide) → the Dean.
     *   • Cross department → the TARGET department's head.
     *   • Cross faculty (faculty-wide) → the TARGET faculty's Dean.
     */
    private static function notifyFinalApprover(\PDO $db, ?array $sr, string $title): void
    {
        if (!$sr) return;

        $homeFacultyId = isset($sr['home_faculty_id'])    ? (int)$sr['home_faculty_id']    : 0;
        $homeDeptId    = isset($sr['home_department_id']) ? (int)$sr['home_department_id'] : 0;
        $targetFacId   = (int)$sr['faculty_id'];
        $targetDeptId  = isset($sr['department_id']) ? (int)$sr['department_id'] : 0;

        $isCross = ($targetFacId !== $homeFacultyId)
                || ($targetDeptId && $targetDeptId !== $homeDeptId);

        $msg = "Student supervisor request awaiting final approval: \"{$title}\"";

        if ($isCross && $targetDeptId) {
            // Cross-department → notify the target department's head.
            $headId = UserDao::departmentHeadId($targetDeptId);
            if ($headId) NotificationDao::create($headId, $msg, 'request');
            return;
        }

        // Same faculty, or cross-faculty faculty-wide → notify the relevant Dean.
        $deanFacultyId = $isCross ? $targetFacId : $homeFacultyId;
        if ($deanFacultyId) {
            $f = $db->prepare('SELECT dean_id FROM faculties WHERE id = :fid');
            $f->execute([':fid' => $deanFacultyId]);
            $frow = $f->fetch();
            if ($frow && $frow['dean_id']) {
                NotificationDao::create((int)$frow['dean_id'], $msg, 'request');
            }
        }
    }
}
