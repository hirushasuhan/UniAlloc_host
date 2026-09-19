<?php
namespace App\Dao;

use App\Helpers\Crypto;
use App\Helpers\Db;
use PDO;

class UserDao
{
    /** List users scoped by role claims */
    public static function list(array $auth, array $filters = []): array
    {
        $db   = Db::connection();
        $where = [];
        $bind  = [];

        // By default only active users are listed; admins can request everyone
        // (needed to see & reactivate deactivated accounts)
        if (empty($filters['include_inactive'])) {
            $where[] = 'u.is_active = 1';
        } else {
            $where[] = '1=1';
        }

        // Scope: dean → faculty; dept_head → dept; lecturer/student → own only (handled in controller)
        if (isset($filters['department_id'])) {
            $where[] = 'u.department_id = :dept_id';
            $bind[':dept_id'] = $filters['department_id'];
        }
        if (isset($filters['faculty_id'])) {
            // NOTE: PDO with emulated prepares disabled does not allow reusing the
            // same named placeholder twice, so two distinct placeholders are used.
            $where[] = '(d.faculty_id = :faculty_id OR (r.role_name = \'dean\' AND f_dean.id = :faculty_id_dean))';
            $bind[':faculty_id']      = $filters['faculty_id'];
            $bind[':faculty_id_dean'] = $filters['faculty_id'];
        }
        if (isset($filters['role_name'])) {
            $where[] = 'r.role_name = :role_name';
            $bind[':role_name'] = $filters['role_name'];
        }

        $sql = 'SELECT u.id, u.full_name, u.title, u.position, u.email, u.role_id, r.role_name,
                       u.department_id, d.dept_name,
                       COALESCE(d.faculty_id, f_dean.id) AS faculty_id,
                       COALESCE(f.faculty_name, f_dean.faculty_name) AS faculty_name,
                       u.capacity_hours, u.operational_status, u.contact, u.enrollment_number, u.is_active, u.totp_enabled, u.created_at
                FROM users u
                JOIN roles r ON r.id = u.role_id
                LEFT JOIN departments d ON d.id = u.department_id
                LEFT JOIN faculties f ON f.id = d.faculty_id
                LEFT JOIN faculties f_dean ON f_dean.dean_id = u.id
                WHERE ' . implode(' AND ', $where) . '
                ORDER BY r.id, u.full_name';

        $stmt = $db->prepare($sql);
        $stmt->execute($bind);
        return $stmt->fetchAll();
    }

    public static function findById(int $id): ?array
    {
        $db   = Db::connection();
        $stmt = $db->prepare(
            'SELECT u.id, u.full_name, u.title, u.position, u.email, u.role_id, r.role_name,
                    u.department_id, d.dept_name,
                    COALESCE(d.faculty_id, f_dean.id) AS faculty_id,
                    COALESCE(f.faculty_name, f_dean.faculty_name) AS faculty_name,
                    u.capacity_hours, u.operational_status, u.contact, u.enrollment_number, u.is_active, u.totp_enabled, u.created_at
             FROM users u
             JOIN roles r ON r.id = u.role_id
             LEFT JOIN departments d ON d.id = u.department_id
             LEFT JOIN faculties f ON f.id = d.faculty_id
             LEFT JOIN faculties f_dean ON f_dean.dean_id = u.id
             WHERE u.id = :id'
        );
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function findWithPassword(int $id): ?array
    {
        $db = Db::connection();
        $stmt = $db->prepare('SELECT id, password_hash FROM users WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * Resolve the Department Head's user id for a department.
     * Prefers departments.head_id, but falls back to looking up the active
     * user with the department_head role in that department (head_id is not
     * always maintained when heads are created directly).
     */
    public static function departmentHeadId(int $departmentId): ?int
    {
        if (!$departmentId) return null;
        $db = Db::connection();

        $stmt = $db->prepare('SELECT head_id FROM departments WHERE id = :did');
        $stmt->execute([':did' => $departmentId]);
        $row = $stmt->fetch();
        if ($row && $row['head_id']) return (int)$row['head_id'];

        $stmt = $db->prepare(
            "SELECT u.id FROM users u
             JOIN roles r ON r.id = u.role_id
             WHERE u.department_id = :did
               AND r.role_name = 'department_head'
               AND u.is_active = 1
             LIMIT 1"
        );
        $stmt->execute([':did' => $departmentId]);
        $row = $stmt->fetch();
        return $row ? (int)$row['id'] : null;
    }

    /**
     * SQL expression producing a display name with the honorific title
     * prefixed, e.g. "Dr. Jane Silva". Falls back to full_name when title
     * is NULL. Note: this uses `title` (the honorific), NOT `position`
     * (the academic rank) — a "Senior Lecturer" is not a name prefix.
     */
    public static function displayNameSql(string $alias): string
    {
        return "TRIM(CONCAT(COALESCE(CONCAT($alias.title, '. '), ''), $alias.full_name))";
    }

    /** Allowed honorific titles / name prefixes (dropdown on the frontend) */
    public const TITLES = [
        'Prof', 'Dr', 'Mr', 'Mrs', 'Ms', 'Miss', 'Rev', 'Thero',
    ];

    /** Allowed academic ranks / job positions (dropdown on the frontend) */
    public const POSITIONS = [
        'Senior Professor', 'Professor', 'Associate Professor',
        'Senior Lecturer', 'Senior Lecturer (Grade I)', 'Senior Lecturer (Grade II)',
        'Lecturer', 'Lecturer (Grade I)', 'Lecturer (Grade II)',
        'Probationary Lecturer', 'Assistant Lecturer', 'Temporary Lecturer',
        'Visiting Lecturer', 'Instructor', 'Demonstrator', 'Research Assistant',
    ];

    /** Allowed lecturer operational (availability) statuses */
    public const OPERATIONAL_STATUSES = [
        'Available', 'On Study Leave', 'Temporarily Not Available', 'On Vacation',
    ];

    public static function create(array $data): int
    {
        $db   = Db::connection();
        $stmt = $db->prepare(
            'INSERT INTO users (full_name, title, position, email, password_hash, role_id, department_id,
                                enrollment_number, contact, capacity_hours)
             VALUES (:full_name, :title, :position, :email, :password_hash, :role_id, :department_id,
                     :enrollment_number, :contact, :capacity_hours)'
        );
        $stmt->execute([
            ':full_name'         => $data['full_name'],
            ':title'             => $data['title'] ?? null,
            ':position'          => $data['position'] ?? null,
            ':email'             => $data['email'],
            ':password_hash'     => password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => 12]),
            ':role_id'           => $data['role_id'],
            ':department_id'     => $data['department_id'] ?? null,
            ':enrollment_number' => $data['enrollment_number'] ?? null,
            ':contact'           => $data['contact'] ?? null,
            ':capacity_hours'    => $data['capacity_hours'] ?? 40.00,
        ]);
        return (int)$db->lastInsertId();
    }

    public static function update(int $id, array $data): bool
    {
        $db     = Db::connection();
        $fields = [];
        $bind   = [':id' => $id];

        foreach (['full_name','title','position','email','contact','capacity_hours','operational_status','department_id','is_active'] as $col) {
            if (array_key_exists($col, $data)) {
                $fields[] = "$col = :$col";
                $bind[":$col"] = $data[$col];
            }
        }
        if (isset($data['password'])) {
            $fields[] = 'password_hash = :password_hash';
            $bind[':password_hash'] = password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => 12]);
        }
        if (empty($fields)) return false;

        $sql  = 'UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = :id';
        $stmt = $db->prepare($sql);
        $stmt->execute($bind);
        return $stmt->rowCount() > 0;
    }

    /**
     * PERMANENTLY delete a user and everything related to them.
     * Runs in a transaction so it's all-or-nothing.
     */
    public static function hardDelete(int $id): bool
    {
        $db = Db::connection();
        $db->beginTransaction();
        try {
            // 1. Progress logs — theirs, and those on assignments being removed
            $db->prepare(
                'DELETE FROM assignment_progress
                 WHERE updated_by = :uid
                    OR assignment_id IN (SELECT id FROM assignments WHERE assigned_to = :uid2 OR assigned_by = :uid3)'
            )->execute([':uid' => $id, ':uid2' => $id, ':uid3' => $id]);

            // 2. Assignments they were given or created
            $db->prepare('DELETE FROM assignments WHERE assigned_to = :uid OR assigned_by = :uid2')
               ->execute([':uid' => $id, ':uid2' => $id]);

            // 3. Workload appeals they submitted (+ detach ones they reviewed)
            $db->prepare('UPDATE workload_appeals SET reviewed_by = NULL WHERE reviewed_by = :uid')->execute([':uid' => $id]);
            $db->prepare('DELETE FROM workload_appeals WHERE lecturer_id = :uid')->execute([':uid' => $id]);

            // 4. Work requests they made (+ detach where they were target/approver)
            $db->prepare('UPDATE work_requests SET target_user_id = NULL WHERE target_user_id = :uid')->execute([':uid' => $id]);
            $db->prepare('UPDATE work_requests SET resolved_by = NULL WHERE resolved_by = :uid')->execute([':uid' => $id]);
            $db->prepare('UPDATE work_requests SET dean_approved_by = NULL WHERE dean_approved_by = :uid')->execute([':uid' => $id]);
            $db->prepare('UPDATE work_requests SET dept_head_approved_by = NULL WHERE dept_head_approved_by = :uid')->execute([':uid' => $id]);
            $db->prepare('DELETE FROM work_requests WHERE requester_id = :uid')->execute([':uid' => $id]);

            // 5. Student requests they submitted (+ detach where supervisor/reviewer)
            $db->prepare('UPDATE student_requests SET assigned_to = NULL WHERE assigned_to = :uid')->execute([':uid' => $id]);
            $db->prepare('UPDATE student_requests SET reviewed_by = NULL WHERE reviewed_by = :uid')->execute([':uid' => $id]);
            $db->prepare('DELETE FROM student_requests WHERE student_id = :uid')->execute([':uid' => $id]);

            // 6. Role promotions about them (+ detach where they promoted/approved others)
            $db->prepare('UPDATE role_promotions SET promoted_by = NULL WHERE promoted_by = :uid')->execute([':uid' => $id]);
            $db->prepare('UPDATE role_promotions SET approved_by = NULL WHERE approved_by = :uid')->execute([':uid' => $id]);
            $db->prepare('DELETE FROM role_promotions WHERE user_id = :uid')->execute([':uid' => $id]);

            // 7. Notifications & audit logs
            $db->prepare('DELETE FROM notifications WHERE user_id = :uid')->execute([':uid' => $id]);
            $db->prepare('DELETE FROM audit_logs WHERE user_id = :uid')->execute([':uid' => $id]);

            // 8. Leadership references & settings
            $db->prepare('UPDATE faculties SET dean_id = NULL WHERE dean_id = :uid')->execute([':uid' => $id]);
            $db->prepare('UPDATE departments SET head_id = NULL WHERE head_id = :uid')->execute([':uid' => $id]);
            $db->prepare('UPDATE settings SET updated_by = NULL WHERE updated_by = :uid')->execute([':uid' => $id]);

            // 9. Finally, the user record itself
            $stmt = $db->prepare('DELETE FROM users WHERE id = :uid');
            $stmt->execute([':uid' => $id]);
            $deleted = $stmt->rowCount() > 0;

            $db->commit();
            return $deleted;
        } catch (\Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    public static function roleIdByName(string $name): ?int
    {
        $stmt = Db::connection()->prepare('SELECT id FROM roles WHERE role_name = :name');
        $stmt->execute([':name' => $name]);
        $row = $stmt->fetch();
        return $row ? (int)$row['id'] : null;
    }

    // ------------------------------------------------------------
    // TOTP self-service password recovery
    // ------------------------------------------------------------

    // ------------------------------------------------------------
    // Session security
    // ------------------------------------------------------------

    /**
     * Everything JwtMiddleware needs to re-authorise a request against the
     * live database rather than trusting stale claims inside the token:
     * account status, current role/scope, token version and TOTP enrollment.
     */
    public static function findSecurityState(int $id): ?array
    {
        $stmt = Db::connection()->prepare(
            'SELECT u.id, u.is_active, u.department_id, u.token_version, u.totp_enabled,
                    r.role_name,
                    COALESCE(d.faculty_id, f_dean.id) AS faculty_id
             FROM users u
             JOIN roles r ON r.id = u.role_id
             LEFT JOIN departments d ON d.id = u.department_id
             LEFT JOIN faculties f_dean ON f_dean.dean_id = u.id
             WHERE u.id = :id
             LIMIT 1'
        );
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /** Uniqueness guard for profile email edits (the column is UNIQUE in MySQL). */
    public static function emailTakenByOther(string $email, int $excludeUserId): bool
    {
        $stmt = Db::connection()->prepare('SELECT id FROM users WHERE email = :email AND id <> :id LIMIT 1');
        $stmt->execute([':email' => $email, ':id' => $excludeUserId]);
        return (bool)$stmt->fetch();
    }

    /**
     * Invalidates every JWT already issued to this user. Called whenever the
     * password changes, so a stolen token dies with the old credential.
     */
    public static function bumpTokenVersion(int $id): void
    {
        Db::connection()
          ->prepare('UPDATE users SET token_version = token_version + 1 WHERE id = :id')
          ->execute([':id' => $id]);
    }

    /** Auth-only lookup for the TOTP setup/verify endpoints (already-logged-in user). */
    public static function findAuthById(int $id): ?array
    {
        $stmt = Db::connection()->prepare('SELECT id, email, totp_secret, totp_enabled FROM users WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        if (!$row) return null;
        $row['totp_secret'] = Crypto::decrypt($row['totp_secret']);
        return $row;
    }

    /** Public lookup by email for the (unauthenticated) forgot-password flow. */
    public static function findByEmailForRecovery(string $email): ?array
    {
        $stmt = Db::connection()->prepare(
            'SELECT id, email, is_active, totp_secret, totp_enabled, totp_failed_attempts, totp_locked_until
             FROM users WHERE email = :email LIMIT 1'
        );
        $stmt->execute([':email' => $email]);
        $row = $stmt->fetch();
        if (!$row) return null;
        $row['totp_secret'] = Crypto::decrypt($row['totp_secret']);
        return $row;
    }

    /** Stores a freshly generated (unconfirmed) secret — not active until verified. */
    public static function saveTotpSecret(int $id, string $secret): void
    {
        Db::connection()->prepare(
            'UPDATE users SET totp_secret = :secret, totp_enabled = 0, totp_failed_attempts = 0, totp_locked_until = NULL WHERE id = :id'
        )->execute([':secret' => Crypto::encrypt($secret), ':id' => $id]);
    }

    /** Confirms enrollment once the user has proven they hold the secret. */
    public static function enableTotp(int $id): void
    {
        Db::connection()->prepare(
            'UPDATE users SET totp_enabled = 1, totp_failed_attempts = 0, totp_locked_until = NULL WHERE id = :id'
        )->execute([':id' => $id]);
    }

    /**
     * Wipes TOTP enrollment entirely. Used when an admin resets a user's
     * password (lost-phone fallback) — the old secret can no longer be
     * trusted, so the user is routed back through the enrollment wizard.
     */
    public static function disableTotp(int $id): void
    {
        Db::connection()->prepare(
            'UPDATE users SET totp_secret = NULL, totp_enabled = 0, totp_failed_attempts = 0, totp_locked_until = NULL WHERE id = :id'
        )->execute([':id' => $id]);
    }

    /** Records a wrong code on the public reset endpoint; locks out after too many. */
    public static function registerTotpFailure(int $id, int $maxAttempts = 5, int $lockMinutes = 15): void
    {
        $db = Db::connection();
        $db->prepare('UPDATE users SET totp_failed_attempts = totp_failed_attempts + 1 WHERE id = :id')
           ->execute([':id' => $id]);

        $stmt = $db->prepare('SELECT totp_failed_attempts FROM users WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $attempts = (int)($stmt->fetch()['totp_failed_attempts'] ?? 0);

        if ($attempts >= $maxAttempts) {
            // $lockMinutes is a trusted internal int (not user input), so it's safe to
            // inline directly — MySQL's INTERVAL clause is picky about bound params
            // when PDO::ATTR_EMULATE_PREPARES is off, as configured in Db::connection().
            $mins = (int)$lockMinutes;
            $db->prepare("UPDATE users SET totp_locked_until = DATE_ADD(NOW(), INTERVAL $mins MINUTE), totp_failed_attempts = 0 WHERE id = :id")
               ->execute([':id' => $id]);
        }
    }

    public static function clearTotpFailures(int $id): void
    {
        Db::connection()->prepare(
            'UPDATE users SET totp_failed_attempts = 0, totp_locked_until = NULL WHERE id = :id'
        )->execute([':id' => $id]);
    }
}
