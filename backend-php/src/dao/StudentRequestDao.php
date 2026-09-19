<?php
namespace App\Dao;

use App\Helpers\Db;

class StudentRequestDao
{
    /**
     * Common SELECT column list + joins shared by list() and findById().
     * Exposes the student's HOME department/faculty (hd — used to route the
     * two-step approval chain) alongside the request's TARGET faculty/dept.
     */
    private static function selectSql(string $where): string
    {
        return
            'SELECT sr.*,
                    us.full_name         AS student_name,
                    us.enrollment_number AS student_enrollment,
                    us.contact           AS student_contact,
                    us.department_id     AS student_department_id,
                    hd.id                AS home_department_id,
                    hd.dept_name         AS home_dept_name,
                    hd.faculty_id        AS home_faculty_id,
                    f.faculty_name,
                    dd.dept_name         AS dept_name,
                    ' . UserDao::displayNameSql('ua') . ' AS assigned_to_name,
                    ' . UserDao::displayNameSql('sg') . ' AS suggested_supervisor_name
             FROM student_requests sr
             JOIN  users us       ON us.id = sr.student_id
             LEFT JOIN departments hd ON hd.id = us.department_id
             JOIN  faculties f    ON f.id  = sr.faculty_id
             LEFT JOIN departments dd ON dd.id = sr.department_id
             LEFT JOIN users ua   ON ua.id = sr.assigned_to
             LEFT JOIN users sg   ON sg.id = sr.suggested_supervisor_id
             ' . $where;
    }

    public static function list(array $filters = []): array
    {
        $where = ['1=1'];
        $bind  = [];

        if (!empty($filters['student_id'])) {
            $where[] = 'sr.student_id = :sid';
            $bind[':sid'] = $filters['student_id'];
        }
        if (!empty($filters['faculty_id'])) {
            $where[] = 'sr.faculty_id = :fid';
            $bind[':fid'] = $filters['faculty_id'];
        }
        // A department head is involved in a request if they head the student's
        // HOME department (step 1 endorsement) OR the request's TARGET
        // department (step 2 final approval for cross-department requests).
        // NOTE: distinct placeholders — the DB runs with EMULATE_PREPARES=false,
        // which forbids reusing one named placeholder twice in a query.
        if (!empty($filters['department_id'])) {
            $where[] = '(hd.id = :did_home OR sr.department_id = :did_target)';
            $bind[':did_home']   = $filters['department_id'];
            $bind[':did_target'] = $filters['department_id'];
        }
        if (!empty($filters['status'])) {
            $where[] = 'sr.status = :status';
            $bind[':status'] = $filters['status'];
        }

        $stmt = Db::connection()->prepare(
            self::selectSql('WHERE ' . implode(' AND ', $where)) . ' ORDER BY sr.created_at DESC'
        );
        $stmt->execute($bind);
        return $stmt->fetchAll();
    }

    public static function findById(int $id): ?array
    {
        $stmt = Db::connection()->prepare(self::selectSql('WHERE sr.id = :id'));
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function create(int $studentId, int $facultyId, string $title, ?string $description, ?int $departmentId = null): int
    {
        $db   = Db::connection();
        $stmt = $db->prepare(
            'INSERT INTO student_requests (student_id, faculty_id, department_id, title, description, approval_step)
             VALUES (:sid, :fid, :did, :title, :desc, :step)'
        );
        $stmt->execute([
            ':sid'   => $studentId,
            ':fid'   => $facultyId,
            ':did'   => $departmentId,
            ':title' => $title,
            ':desc'  => $description,
            ':step'  => 'pending_home_head',
        ]);
        return (int)$db->lastInsertId();
    }

    /**
     * Step 1 — the student's home department head endorses the request.
     * Records the endorsement and optionally a suggested supervisor, then
     * advances the chain to `pending_final` (status stays 'pending').
     */
    public static function endorse(int $id, int $homeHeadId, ?int $suggestedSupervisorId): bool
    {
        $stmt = Db::connection()->prepare(
            'UPDATE student_requests
                SET approval_step           = :step,
                    home_head_approved_by   = :hh,
                    home_head_approved_at   = NOW(),
                    suggested_supervisor_id = :sug
              WHERE id = :id'
        );
        $stmt->execute([
            ':step' => 'pending_final',
            ':hh'   => $homeHeadId,
            ':sug'  => $suggestedSupervisorId,
            ':id'   => $id,
        ]);
        return $stmt->rowCount() > 0;
    }

    /**
     * Step 2 — final approval. On approval the supervisor is assigned and the
     * request is marked assigned/approved; rejection marks it rejected.
     */
    public static function finalise(int $id, string $status, int $reviewedBy, ?int $assignedTo): bool
    {
        $step = $status === 'assigned' ? 'approved' : 'rejected';
        $stmt = Db::connection()->prepare(
            'UPDATE student_requests
                SET status = :status, approval_step = :step, reviewed_by = :rb, assigned_to = :at
              WHERE id = :id'
        );
        $stmt->execute([
            ':status' => $status,
            ':step'   => $step,
            ':rb'     => $reviewedBy,
            ':at'     => $assignedTo,
            ':id'     => $id,
        ]);
        return $stmt->rowCount() > 0;
    }

    /** Reject the request at step 1 (home head declines to endorse). */
    public static function reject(int $id, int $reviewedBy): bool
    {
        $stmt = Db::connection()->prepare(
            'UPDATE student_requests
                SET status = :status, approval_step = :step, reviewed_by = :rb
              WHERE id = :id'
        );
        $stmt->execute([
            ':status' => 'rejected',
            ':step'   => 'rejected',
            ':rb'     => $reviewedBy,
            ':id'     => $id,
        ]);
        return $stmt->rowCount() > 0;
    }
}
