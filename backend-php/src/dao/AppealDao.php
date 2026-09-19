<?php
namespace App\Dao;

use App\Helpers\Db;

class AppealDao
{
    public static function list(array $filters = []): array
    {
        $where = ['1=1'];
        $bind  = [];

        if (!empty($filters['lecturer_id'])) {
            $where[] = 'wa.lecturer_id = :lid';
            $bind[':lid'] = $filters['lecturer_id'];
        }
        if (!empty($filters['department_id'])) {
            $where[] = 'u.department_id = :did';
            $bind[':did'] = $filters['department_id'];
        }
        if (!empty($filters['faculty_id'])) {
            $where[] = 'd.faculty_id = :fid';
            $bind[':fid'] = $filters['faculty_id'];
        }
        if (!empty($filters['status'])) {
            $where[] = 'wa.status = :status';
            $bind[':status'] = $filters['status'];
        }

        $stmt = Db::connection()->prepare(
            'SELECT wa.*, ' . UserDao::displayNameSql('u') . ' AS lecturer_name, a.title AS assignment_title
             FROM workload_appeals wa
             JOIN users u ON u.id = wa.lecturer_id
             LEFT JOIN assignments a ON a.id = wa.assignment_id
             LEFT JOIN departments d ON d.id = u.department_id
             WHERE ' . implode(' AND ', $where) . '
             ORDER BY wa.created_at DESC'
        );
        $stmt->execute($bind);
        return $stmt->fetchAll();
    }

    public static function findById(int $id): ?array
    {
        $stmt = Db::connection()->prepare(
            'SELECT wa.*, ' . UserDao::displayNameSql('u') . ' AS lecturer_name
             FROM workload_appeals wa JOIN users u ON u.id = wa.lecturer_id
             WHERE wa.id = :id'
        );
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function create(int $lecturerId, ?int $assignmentId, string $reason): int
    {
        $db   = Db::connection();
        $stmt = $db->prepare(
            'INSERT INTO workload_appeals (lecturer_id, assignment_id, reason) VALUES (:lid, :aid, :reason)'
        );
        $stmt->execute([':lid' => $lecturerId, ':aid' => $assignmentId, ':reason' => $reason]);
        return (int)$db->lastInsertId();
    }

    public static function update(int $id, string $status, int $reviewedBy, ?string $reviewNote): bool
    {
        $stmt = Db::connection()->prepare(
            "UPDATE workload_appeals
             SET status = :status, reviewed_by = :rb, review_note = :note
             WHERE id = :id"
        );
        $stmt->execute([':status' => $status, ':rb' => $reviewedBy, ':note' => $reviewNote, ':id' => $id]);
        return $stmt->rowCount() > 0;
    }
}
