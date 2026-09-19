<?php
namespace App\Dao;

use App\Helpers\Db;

class FacultyDao
{
    public static function list(): array
    {
        $stmt = Db::connection()->query(
            'SELECT f.id, f.faculty_name, f.dean_id, u.full_name AS dean_name, f.created_at
             FROM faculties f
             LEFT JOIN users u ON u.id = f.dean_id
             ORDER BY f.faculty_name'
        );
        return $stmt->fetchAll();
    }

    public static function findById(int $id): ?array
    {
        $stmt = Db::connection()->prepare(
            'SELECT f.id, f.faculty_name, f.dean_id, u.full_name AS dean_name, f.created_at
             FROM faculties f
             LEFT JOIN users u ON u.id = f.dean_id
             WHERE f.id = :id'
        );
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function create(string $facultyName, ?int $deanId = null): int
    {
        $db   = Db::connection();
        $stmt = $db->prepare('INSERT INTO faculties (faculty_name, dean_id) VALUES (:name, :dean)');
        $stmt->execute([':name' => $facultyName, ':dean' => $deanId]);
        return (int)$db->lastInsertId();
    }

    public static function update(int $id, array $data): bool
    {
        $fields = [];
        $bind   = [':id' => $id];
        foreach (['faculty_name','dean_id'] as $col) {
            if (array_key_exists($col, $data)) {
                $fields[] = "$col = :$col";
                $bind[":$col"] = $data[$col];
            }
        }
        if (empty($fields)) return false;
        $stmt = Db::connection()->prepare('UPDATE faculties SET ' . implode(', ', $fields) . ' WHERE id = :id');
        $stmt->execute($bind);
        return $stmt->rowCount() > 0;
    }
}
