<?php
namespace App\Dao;

use App\Helpers\Db;

class PromotionDao
{
    public static function list(): array
    {
        $stmt = Db::connection()->query(
            'SELECT rp.*, ' . UserDao::displayNameSql('u') . ' AS user_name,
                    r1.role_name AS old_role, r2.role_name AS new_role,
                    ' . UserDao::displayNameSql('pb') . ' AS promoted_by_name
             FROM role_promotions rp
             JOIN users u ON u.id = rp.user_id
             JOIN roles r1 ON r1.id = rp.old_role_id
             JOIN roles r2 ON r2.id = rp.new_role_id
             LEFT JOIN users pb ON pb.id = rp.promoted_by
             ORDER BY rp.promoted_at DESC'
        );
        return $stmt->fetchAll();
    }

    public static function create(int $userId, int $oldRoleId, int $newRoleId, int $promotedBy): int
    {
        $db   = Db::connection();
        $stmt = $db->prepare(
            'INSERT INTO role_promotions (user_id, old_role_id, new_role_id, promoted_by)
             VALUES (:uid, :old, :new, :pb)'
        );
        $stmt->execute([':uid' => $userId, ':old' => $oldRoleId, ':new' => $newRoleId, ':pb' => $promotedBy]);
        return (int)$db->lastInsertId();
    }

    public static function approve(int $id, int $approvedBy): bool
    {
        $db = Db::connection();

        // Get promotion details
        $stmt = $db->prepare("SELECT * FROM role_promotions WHERE id = :id AND status = 'pending'");
        $stmt->execute([':id' => $id]);
        $p = $stmt->fetch();
        if (!$p) return false;

        // Update promotion record
        $upd = $db->prepare("UPDATE role_promotions SET status = 'approved', approved_by = :ab WHERE id = :id");
        $upd->execute([':ab' => $approvedBy, ':id' => $id]);

        // Actually change the user's role
        $changeRole = $db->prepare('UPDATE users SET role_id = :role_id WHERE id = :uid');
        $changeRole->execute([':role_id' => $p['new_role_id'], ':uid' => $p['user_id']]);

        // If promoted to department_head, update departments.head_id if dept_id available
        $newRoleStmt = $db->prepare('SELECT role_name FROM roles WHERE id = :id');
        $newRoleStmt->execute([':id' => $p['new_role_id']]);
        $roleRow = $newRoleStmt->fetch();

        if ($roleRow['role_name'] === 'department_head') {
            $userStmt = $db->prepare('SELECT department_id FROM users WHERE id = :uid');
            $userStmt->execute([':uid' => $p['user_id']]);
            $userRow = $userStmt->fetch();
            if ($userRow && $userRow['department_id']) {
                $db->prepare('UPDATE departments SET head_id = :uid WHERE id = :did')
                   ->execute([':uid' => $p['user_id'], ':did' => $userRow['department_id']]);
            }
        } else {
            // Demoted from department head → clear any department still pointing to them
            $db->prepare('UPDATE departments SET head_id = NULL WHERE head_id = :uid')
               ->execute([':uid' => $p['user_id']]);
        }

        return true;
    }

    public static function reject(int $id, int $approvedBy): bool
    {
        $stmt = Db::connection()->prepare(
            "UPDATE role_promotions SET status = 'rejected', approved_by = :ab WHERE id = :id AND status = 'pending'"
        );
        $stmt->execute([':ab' => $approvedBy, ':id' => $id]);
        return $stmt->rowCount() > 0;
    }
}
