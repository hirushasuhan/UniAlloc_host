<?php
namespace App\Dao;

use App\Helpers\Db;

class AssignmentDao
{
    public static function list(array $filters = []): array
    {
        $where = ['1=1'];
        $bind  = [];

        if (!empty($filters['assigned_to'])) {
            $where[] = 'a.assigned_to = :assigned_to';
            $bind[':assigned_to'] = $filters['assigned_to'];
        }
        if (!empty($filters['assigned_by'])) {
            $where[] = 'a.assigned_by = :assigned_by';
            $bind[':assigned_by'] = $filters['assigned_by'];
        }
        if (!empty($filters['department_id'])) {
            $where[] = 'a.department_id = :department_id';
            $bind[':department_id'] = $filters['department_id'];
        }
        if (!empty($filters['faculty_id'])) {
            $where[] = 'd.faculty_id = :faculty_id';
            $bind[':faculty_id'] = $filters['faculty_id'];
        }
        if (!empty($filters['dean_scope_faculty_id'])) {
            // Faculty's own assignments, OR ones the dean created, OR ones assigned TO the dean themselves
            $where[] = '(d.faculty_id = :dean_scope_faculty_id OR a.assigned_by = :dean_scope_user_id OR a.assigned_to = :dean_scope_user_id2)';
            $bind[':dean_scope_faculty_id'] = $filters['dean_scope_faculty_id'];
            $bind[':dean_scope_user_id'] = $filters['dean_scope_user_id'];
            $bind[':dean_scope_user_id2'] = $filters['dean_scope_user_id'];
        }
        if (!empty($filters['status'])) {
            $where[] = 'a.status = :status';
            $bind[':status'] = $filters['status'];
        }
        if (!empty($filters['priority'])) {
            $where[] = 'a.priority = :priority';
            $bind[':priority'] = $filters['priority'];
        }

        $sql = 'SELECT a.*,
                       ' . UserDao::displayNameSql('ut') . ' AS assigned_to_name,
                       ' . UserDao::displayNameSql('ub') . ' AS assigned_by_name,
                       d.dept_name,
                       (SELECT MAX(ap.progress_percent) FROM assignment_progress ap WHERE ap.assignment_id = a.id) AS latest_progress
                FROM assignments a
                JOIN users ut ON ut.id = a.assigned_to
                JOIN users ub ON ub.id = a.assigned_by
                LEFT JOIN departments d ON d.id = a.department_id
                WHERE ' . implode(' AND ', $where) . '
                ORDER BY FIELD(a.priority,"urgent","high","medium","low"), a.deadline ASC';

        $stmt = Db::connection()->prepare($sql);
        $stmt->execute($bind);
        return $stmt->fetchAll();
    }

    public static function findById(int $id): ?array
    {
        $stmt = Db::connection()->prepare(
            'SELECT a.*,
                    ' . UserDao::displayNameSql('ut') . ' AS assigned_to_name,
                    ' . UserDao::displayNameSql('ub') . ' AS assigned_by_name,
                    d.dept_name
             FROM assignments a
             JOIN users ut ON ut.id = a.assigned_to
             JOIN users ub ON ub.id = a.assigned_by
             LEFT JOIN departments d ON d.id = a.department_id
             WHERE a.id = :id'
        );
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function create(array $data): int
    {
        $db   = Db::connection();
        $stmt = $db->prepare(
            'INSERT INTO assignments
              (title, description, assigned_to, assigned_by, department_id, priority, estimated_hours, deadline)
             VALUES
              (:title, :description, :assigned_to, :assigned_by, :department_id, :priority, :estimated_hours, :deadline)'
        );
        $stmt->execute([
            ':title'           => $data['title'],
            ':description'     => $data['description'] ?? null,
            ':assigned_to'     => $data['assigned_to'],
            ':assigned_by'     => $data['assigned_by'],
            ':department_id'   => $data['department_id'] ?? null,
            ':priority'        => $data['priority'] ?? 'medium',
            ':estimated_hours' => $data['estimated_hours'] ?? 0,
            ':deadline'        => $data['deadline'] ?? null,
        ]);
        return (int)$db->lastInsertId();
    }

    public static function update(int $id, array $data): bool
    {
        $allowed = ['title','description','priority','status','estimated_hours','actual_hours','deadline'];
        $fields  = [];
        $bind    = [':id' => $id];
        foreach ($allowed as $col) {
            if (array_key_exists($col, $data)) {
                $fields[] = "$col = :$col";
                $bind[":$col"] = $data[$col];
            }
        }
        if (empty($fields)) return false;
        $stmt = Db::connection()->prepare('UPDATE assignments SET ' . implode(', ', $fields) . ' WHERE id = :id');
        $stmt->execute($bind);
        return $stmt->rowCount() > 0;
    }

    public static function delete(int $id): bool
    {
        $stmt = Db::connection()->prepare("UPDATE assignments SET status = 'cancelled' WHERE id = :id");
        $stmt->execute([':id' => $id]);
        return $stmt->rowCount() > 0;
    }

    public static function addProgress(int $assignmentId, int $userId, int $percent, ?string $note): int
    {
        $db   = Db::connection();
        $stmt = $db->prepare(
            'INSERT INTO assignment_progress (assignment_id, updated_by, progress_percent, note)
             VALUES (:aid, :uid, :pct, :note)'
        );
        $stmt->execute([':aid' => $assignmentId, ':uid' => $userId, ':pct' => $percent, ':note' => $note]);
        return (int)$db->lastInsertId();
    }

    public static function getProgress(int $assignmentId): array
    {
        $stmt = Db::connection()->prepare(
            'SELECT ap.*, ' . UserDao::displayNameSql('u') . ' AS updated_by_name
             FROM assignment_progress ap
             JOIN users u ON u.id = ap.updated_by
             WHERE ap.assignment_id = :aid
             ORDER BY ap.updated_at DESC'
        );
        $stmt->execute([':aid' => $assignmentId]);
        return $stmt->fetchAll();
    }
}
