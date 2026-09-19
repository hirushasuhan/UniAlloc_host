<?php
namespace App\Dao;

use App\Helpers\Db;

class NotificationDao
{
    public static function create(int $userId, string $message, string $type = 'system'): int
    {
        $db   = Db::connection();
        $stmt = $db->prepare(
            'INSERT INTO notifications (user_id, message, type) VALUES (:uid, :msg, :type)'
        );
        $stmt->execute([':uid' => $userId, ':msg' => $message, ':type' => $type]);
        return (int)$db->lastInsertId();
    }

    public static function listForUser(int $userId): array
    {
        $stmt = Db::connection()->prepare(
            'SELECT * FROM notifications WHERE user_id = :uid ORDER BY created_at DESC LIMIT 50'
        );
        $stmt->execute([':uid' => $userId]);
        return $stmt->fetchAll();
    }

    public static function markRead(int $id, int $userId): bool
    {
        $stmt = Db::connection()->prepare(
            'UPDATE notifications SET is_read = 1 WHERE id = :id AND user_id = :uid'
        );
        $stmt->execute([':id' => $id, ':uid' => $userId]);
        return $stmt->rowCount() > 0;
    }

    public static function markAllRead(int $userId): void
    {
        $stmt = Db::connection()->prepare(
            'UPDATE notifications SET is_read = 1 WHERE user_id = :uid AND is_read = 0'
        );
        $stmt->execute([':uid' => $userId]);
    }
}
