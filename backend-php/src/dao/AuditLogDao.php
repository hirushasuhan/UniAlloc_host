<?php
namespace App\Dao;

use App\Helpers\Db;

class AuditLogDao
{
    public static function log(int $userId, string $action, ?string $entity = null, ?int $entityId = null, ?array $detail = null): void
    {
        $stmt = Db::connection()->prepare(
            'INSERT INTO audit_logs (user_id, action, entity, entity_id, detail)
             VALUES (:uid, :action, :entity, :entity_id, :detail)'
        );
        $stmt->execute([
            ':uid'       => $userId,
            ':action'    => $action,
            ':entity'    => $entity,
            ':entity_id' => $entityId,
            ':detail'    => $detail ? json_encode($detail) : null,
        ]);
    }

    public static function list(int $limit = 100, int $offset = 0): array
    {
        // `timestamp` is formatted here as an explicit ISO-8601 UTC string
        // (with the trailing Z) instead of MySQL's bare "Y-m-d H:i:s". A
        // bare string like that has no timezone marker, so `new Date(...)`
        // on the frontend guesses — and browsers parse a space-separated
        // datetime as LOCAL time, not UTC, which silently shows the wrong
        // moment. An unambiguous UTC string lets `toLocaleString()` convert
        // it correctly to whichever timezone the viewer's own browser is in.
        $stmt = Db::connection()->prepare(
            "SELECT al.id, al.user_id, al.action, al.entity, al.entity_id, al.detail,
                    DATE_FORMAT(al.timestamp, '%Y-%m-%dT%H:%i:%sZ') AS `timestamp`,
                    u.full_name AS user_name, u.email AS user_email
             FROM audit_logs al
             LEFT JOIN users u ON u.id = al.user_id
             ORDER BY al.timestamp DESC
             LIMIT :limit OFFSET :offset"
        );
        $stmt->bindValue(':limit',  $limit,  \PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }
}
