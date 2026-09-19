<?php
namespace App\Dao;

use App\Helpers\Db;

class WorkRequestDao
{
    // ------------------------------------------------------------------
    // Base SELECT fragment (used by every read query)
    // ------------------------------------------------------------------
    private static function baseSelect(): string
    {
        return '
            SELECT wr.*,
                   ' . UserDao::displayNameSql('ur') . '  AS requester_name,
                   ' . UserDao::displayNameSql('ut') . '  AS target_user_name,
                   ut.role_id      AS target_user_role_id,
                   d.dept_name     AS target_dept_name,
                   f.faculty_name  AS target_faculty_name,
                   ' . UserDao::displayNameSql('da') . '  AS dean_approver_name,
                   ' . UserDao::displayNameSql('dha') . ' AS dept_head_approver_name
            FROM work_requests wr
            JOIN  users ur  ON ur.id  = wr.requester_id
            LEFT JOIN users ut  ON ut.id  = wr.target_user_id
            LEFT JOIN departments d ON d.id = wr.target_dept_id
            LEFT JOIN faculties   f ON f.id = wr.target_faculty_id
            LEFT JOIN users da  ON da.id  = wr.dean_approved_by
            LEFT JOIN users dha ON dha.id = wr.dept_head_approved_by
        ';
    }

    // ------------------------------------------------------------------
    // List — returns all requests visible to the given user context.
    //
    // $filters may contain any combination of:
    //   requester_id          → requests this user submitted
    //   pending_dean_faculty  → approval_step=pending_dean AND target_faculty_id=X
    //   pending_depthead_dept → approval_step=pending_dept_head AND target_dept_id=X
    //   pending_assignee_user → approval_step=pending_assignee AND target_user_id=X
    //   target_user_id        → any request targeting this user (admin view)
    //   status                → AND-filter on status
    //
    // Multiple top-level conditions are combined with OR so one call
    // returns "all rows relevant to me" in one query.
    // ------------------------------------------------------------------
    public static function list(array $filters = []): array
    {
        $orClauses = [];
        $bind      = [];

        // Requests I submitted
        if (!empty($filters['requester_id'])) {
            $orClauses[] = 'wr.requester_id = :rid';
            $bind[':rid'] = (int)$filters['requester_id'];
        }

        // Requests waiting for dean approval in my faculty
        if (!empty($filters['pending_dean_faculty'])) {
            $orClauses[] = "(wr.approval_step = 'pending_dean' AND wr.target_faculty_id = :pdf)";
            $bind[':pdf'] = (int)$filters['pending_dean_faculty'];
        }

        // Requests waiting for dept-head approval in my dept
        if (!empty($filters['pending_depthead_dept'])) {
            $orClauses[] = "(wr.approval_step = 'pending_dept_head' AND wr.target_dept_id = :pdd)";
            $bind[':pdd'] = (int)$filters['pending_depthead_dept'];
        }

        // Requests waiting for me (the assignee) to accept
        if (!empty($filters['pending_assignee_user'])) {
            $orClauses[] = "(wr.approval_step = 'pending_assignee' AND wr.target_user_id = :pau)";
            $bind[':pau'] = (int)$filters['pending_assignee_user'];
        }

        // Direct target lookup (admin)
        if (!empty($filters['target_user_id'])) {
            $orClauses[] = 'wr.target_user_id = :tuid';
            $bind[':tuid'] = (int)$filters['target_user_id'];
        }

        // No filter → return nothing (safer than returning everything)
        $whereSQL = empty($orClauses) ? '1=0' : '(' . implode(' OR ', $orClauses) . ')';

        // Optional AND filter on status
        $andClauses = [];
        if (!empty($filters['status'])) {
            $andClauses[] = 'wr.status = :status';
            $bind[':status'] = $filters['status'];
        }
        if (!empty($andClauses)) {
            $whereSQL .= ' AND ' . implode(' AND ', $andClauses);
        }

        $sql  = self::baseSelect() . ' WHERE ' . $whereSQL . ' ORDER BY wr.created_at DESC';
        $stmt = Db::connection()->prepare($sql);
        $stmt->execute($bind);
        return $stmt->fetchAll();
    }

    // ------------------------------------------------------------------
    // Find single request by ID
    // ------------------------------------------------------------------
    public static function findById(int $id): ?array
    {
        $stmt = Db::connection()->prepare(
            self::baseSelect() . ' WHERE wr.id = :id'
        );
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    // ------------------------------------------------------------------
    // Create a new request.
    // Caller must supply approval_step and target_role (computed in controller).
    // ------------------------------------------------------------------
    public static function create(array $data): int
    {
        $db   = Db::connection();
        $stmt = $db->prepare(
            'INSERT INTO work_requests
               (requester_id, target_user_id, target_dept_id, target_faculty_id,
                request_type, target_role, approval_step, title, description)
             VALUES
               (:rid, :tuid, :tdid, :tfid, :type, :trole, :step, :title, :desc)'
        );
        $stmt->execute([
            ':rid'   => $data['requester_id'],
            ':tuid'  => $data['target_user_id']    ?? null,
            ':tdid'  => $data['target_dept_id']    ?? null,
            ':tfid'  => $data['target_faculty_id'] ?? null,
            ':type'  => $data['request_type'],
            ':trole' => $data['target_role']        ?? null,
            ':step'  => $data['approval_step']      ?? 'pending_assignee',
            ':title' => $data['title'],
            ':desc'  => $data['description']        ?? null,
        ]);
        return (int)$db->lastInsertId();
    }

    // ------------------------------------------------------------------
    // Step 1 → 2: Dean approves, advance to pending_dept_head
    // ------------------------------------------------------------------
    public static function advanceToDeptHead(int $id, int $deanId): bool
    {
        $stmt = Db::connection()->prepare(
            "UPDATE work_requests
             SET approval_step = 'pending_dept_head',
                 dean_approved_by = :did,
                 dean_approved_at = NOW()
             WHERE id = :id AND approval_step = 'pending_dean'"
        );
        $stmt->execute([':did' => $deanId, ':id' => $id]);
        return $stmt->rowCount() > 0;
    }

    // ------------------------------------------------------------------
    // Cross-faculty step 1 → 2: the target's Dept Head approves, advance to
    // pending_dean (dean of the target faculty approves next).
    // ------------------------------------------------------------------
    public static function advanceToDean(int $id, int $deptHeadId): bool
    {
        $stmt = Db::connection()->prepare(
            "UPDATE work_requests
             SET approval_step = 'pending_dean',
                 dept_head_approved_by = :hid,
                 dept_head_approved_at = NOW()
             WHERE id = :id AND approval_step = 'pending_dept_head'"
        );
        $stmt->execute([':hid' => $deptHeadId, ':id' => $id]);
        return $stmt->rowCount() > 0;
    }

    // ------------------------------------------------------------------
    // Cross-faculty, department-head target: the Dean gives the final
    // approval (the target head already accepted at the dept-head step),
    // so the request is fully approved without a separate assignee step.
    // ------------------------------------------------------------------
    public static function deanFinalApprove(int $id, int $deanId): bool
    {
        $stmt = Db::connection()->prepare(
            "UPDATE work_requests
             SET status = 'approved',
                 approval_step = 'approved',
                 dean_approved_by = :did,
                 dean_approved_at = NOW(),
                 resolved_by = :did2,
                 resolved_at = NOW()
             WHERE id = :id AND approval_step = 'pending_dean'"
        );
        $stmt->execute([':did' => $deanId, ':did2' => $deanId, ':id' => $id]);
        return $stmt->rowCount() > 0;
    }

    // ------------------------------------------------------------------
    // Dean OR dept-head advances request to pending_assignee
    // $approverType = 'dean' | 'dept_head'
    // ------------------------------------------------------------------
    public static function advanceToAssignee(int $id, int $approverId, string $approverType): bool
    {
        if ($approverType === 'dean') {
            $stmt = Db::connection()->prepare(
                "UPDATE work_requests
                 SET approval_step = 'pending_assignee',
                     dean_approved_by = :aid,
                     dean_approved_at = NOW()
                 WHERE id = :id AND approval_step = 'pending_dean'"
            );
        } else {
            $stmt = Db::connection()->prepare(
                "UPDATE work_requests
                 SET approval_step = 'pending_assignee',
                     dept_head_approved_by = :aid,
                     dept_head_approved_at = NOW()
                 WHERE id = :id AND approval_step = 'pending_dept_head'"
            );
        }
        $stmt->execute([':aid' => $approverId, ':id' => $id]);
        return $stmt->rowCount() > 0;
    }

    // ------------------------------------------------------------------
    // Final step: assignee accepts → mark fully approved
    // ------------------------------------------------------------------
    public static function finalApprove(int $id, int $userId): bool
    {
        $stmt = Db::connection()->prepare(
            "UPDATE work_requests
             SET status = 'approved',
                 approval_step = 'approved',
                 resolved_by = :uid,
                 resolved_at = NOW()
             WHERE id = :id AND approval_step = 'pending_assignee'"
        );
        $stmt->execute([':uid' => $userId, ':id' => $id]);
        return $stmt->rowCount() > 0;
    }

    // ------------------------------------------------------------------
    // Reject at any step
    // ------------------------------------------------------------------
    public static function reject(int $id, int $userId): bool
    {
        $stmt = Db::connection()->prepare(
            "UPDATE work_requests
             SET status = 'rejected',
                 approval_step = 'rejected',
                 resolved_by = :uid,
                 resolved_at = NOW()
             WHERE id = :id AND status = 'pending'"
        );
        $stmt->execute([':uid' => $userId, ':id' => $id]);
        return $stmt->rowCount() > 0;
    }

    // ------------------------------------------------------------------
    // Legacy alias kept so any old callers don't crash
    // ------------------------------------------------------------------
    public static function resolve(int $id, string $status, int $resolvedBy): bool
    {
        if ($status === 'approved') return self::finalApprove($id, $resolvedBy);
        return self::reject($id, $resolvedBy);
    }
}
