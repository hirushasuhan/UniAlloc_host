<?php
namespace App\Services;

use App\Helpers\Db;
use App\Dao\NotificationDao;

class WorkloadService
{
    /**
     * Returns capacity summary for a user:
     * capacity_hours, allocated_hours, available_hours, overload_pct, is_overloaded
     */
    public static function getCapacity(int $userId): array
    {
        $db = Db::connection();

        // Get user's capacity (full_name is prefixed with the academic position, e.g. "Dr. …")
        $stmt = $db->prepare(
            'SELECT capacity_hours, ' . \App\Dao\UserDao::displayNameSql('users') . ' AS full_name
             FROM users WHERE id = :uid'
        );
        $stmt->execute([':uid' => $userId]);
        $user = $stmt->fetch();

        if (!$user) return [];

        // Sum active (pending + in_progress) assignment hours
        $stmt2 = $db->prepare(
            "SELECT COALESCE(SUM(estimated_hours), 0) AS allocated
             FROM assignments
             WHERE assigned_to = :uid AND status IN ('pending','in_progress')"
        );
        $stmt2->execute([':uid' => $userId]);
        $row = $stmt2->fetch();

        $capacity  = (float)$user['capacity_hours'];
        $allocated = (float)$row['allocated'];
        $available = max(0, $capacity - $allocated);
        $pct       = $capacity > 0 ? round(($allocated / $capacity) * 100, 1) : 0;

        $cfg = require __DIR__ . '/../../config/app.php';
        $threshold = (int)$cfg['overload_threshold_pct'];

        return [
            'user_id'         => $userId,
            'full_name'       => $user['full_name'],
            'capacity_hours'  => $capacity,
            'allocated_hours' => $allocated,
            'available_hours' => $available,
            'utilization_pct' => $pct,
            'is_overloaded'   => $pct >= $threshold,
            'threshold_pct'   => $threshold,
        ];
    }

    /**
     * After an assignment is created, check for overload and trigger notification if needed.
     */
    public static function checkAndNotifyOverload(int $assignedToUserId, int $assignmentId, int $assignedBy): void
    {
        $cap = self::getCapacity($assignedToUserId);
        if (!$cap || !$cap['is_overloaded']) return;

        $msg = sprintf(
            'Overload warning: %s is now at %.1f%% capacity (%g/%g hrs). Assignment #%d was just assigned.',
            $cap['full_name'],
            $cap['utilization_pct'],
            $cap['allocated_hours'],
            $cap['capacity_hours'],
            $assignmentId
        );

        // Notify the lecturer themselves
        NotificationDao::create($assignedToUserId, $msg, 'overload');

        // Notify their Department Head
        $db   = Db::connection();
        $stmt = $db->prepare('SELECT department_id FROM users WHERE id = :uid');
        $stmt->execute([':uid' => $assignedToUserId]);
        $row = $stmt->fetch();
        $headId = ($row && $row['department_id'])
            ? \App\Dao\UserDao::departmentHeadId((int)$row['department_id'])
            : null;
        // Don't notify the head about their own overload twice (they already got the direct one)
        if ($headId && $headId !== $assignedToUserId) {
            NotificationDao::create($headId, $msg, 'overload');
        }
    }

    /**
     * Returns list of under-loaded lecturers in the same department as alternatives.
     */
    public static function suggestAlternatives(int $overloadedUserId): array
    {
        $db   = Db::connection();
        $stmt = $db->prepare('SELECT department_id FROM users WHERE id = :uid');
        $stmt->execute([':uid' => $overloadedUserId]);
        $row  = $stmt->fetch();
        if (!$row || !$row['department_id']) return [];

        $deptId = (int)$row['department_id'];

        $stmt2 = $db->prepare(
            "SELECT u.id, " . \App\Dao\UserDao::displayNameSql('u') . " AS full_name, u.capacity_hours,
                    COALESCE(SUM(a.estimated_hours),0) AS allocated_hours
             FROM users u
             LEFT JOIN assignments a ON a.assigned_to = u.id AND a.status IN ('pending','in_progress')
             WHERE u.department_id = :dept AND u.role_id = (SELECT id FROM roles WHERE role_name='lecturer')
               AND u.id != :uid AND u.is_active = 1 AND u.operational_status = 'Available'
             GROUP BY u.id
             HAVING (allocated_hours / u.capacity_hours * 100) < 90
             ORDER BY allocated_hours ASC
             LIMIT 5"
        );
        $stmt2->execute([':dept' => $deptId, ':uid' => $overloadedUserId]);
        return $stmt2->fetchAll();
    }
}
