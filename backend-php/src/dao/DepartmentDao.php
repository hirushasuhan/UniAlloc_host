<?php
namespace App\Dao;

use App\Helpers\Db;

class DepartmentDao
{
    public static function list(?int $facultyId = null): array
    {
        $where = $facultyId ? 'WHERE d.faculty_id = :fid' : '';
        $bind  = $facultyId ? [':fid' => $facultyId] : [];

        $stmt = Db::connection()->prepare(
            "SELECT d.id, d.dept_name, d.faculty_id, f.faculty_name,
                    d.head_id, u.full_name AS head_name, d.created_at
             FROM departments d
             JOIN faculties f ON f.id = d.faculty_id
             LEFT JOIN users u ON u.id = d.head_id
             $where
             ORDER BY f.faculty_name, d.dept_name"
        );
        $stmt->execute($bind);
        return $stmt->fetchAll();
    }

    public static function findById(int $id): ?array
    {
        $stmt = Db::connection()->prepare(
            'SELECT d.id, d.dept_name, d.faculty_id, f.faculty_name,
                    d.head_id, u.full_name AS head_name, d.created_at
             FROM departments d
             JOIN faculties f ON f.id = d.faculty_id
             LEFT JOIN users u ON u.id = d.head_id
             WHERE d.id = :id'
        );
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function create(string $deptName, int $facultyId, ?int $headId = null): int
    {
        $db   = Db::connection();
        $stmt = $db->prepare(
            'INSERT INTO departments (dept_name, faculty_id, head_id) VALUES (:name, :fid, :head)'
        );
        $stmt->execute([':name' => $deptName, ':fid' => $facultyId, ':head' => $headId]);
        return (int)$db->lastInsertId();
    }

    public static function update(int $id, array $data): bool
    {
        $fields = [];
        $bind   = [':id' => $id];
        foreach (['dept_name','faculty_id','head_id'] as $col) {
            if (array_key_exists($col, $data)) {
                $fields[] = "$col = :$col";
                $bind[":$col"] = $data[$col];
            }
        }
        if (empty($fields)) return false;
        $stmt = Db::connection()->prepare('UPDATE departments SET ' . implode(', ', $fields) . ' WHERE id = :id');
        $stmt->execute($bind);
        return $stmt->rowCount() > 0;
    }
}
