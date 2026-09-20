<?php
namespace App\Controllers;

use App\Dao\NotificationDao;
use App\Helpers\Response;
use App\Middleware\JwtMiddleware;

class NotificationController
{
    public function index(array $params = []): void
    {
        $auth = JwtMiddleware::handle();
        Response::success(NotificationDao::listForUser($auth['sub']));
    }

    public function markRead(array $params = []): void
    {
        $auth = JwtMiddleware::handle();
        $id   = (int)($params['id'] ?? 0);
        $ok   = NotificationDao::markRead($id, $auth['sub']);
        Response::success(['updated' => $ok]);
    }

    public function markAllRead(array $params = []): void
    {
        $auth = JwtMiddleware::handle();
        NotificationDao::markAllRead($auth['sub']);
        Response::success(null, 'All notifications marked as read');
    }

    public function clearRead(array $params = []): void
    {
        $auth  = JwtMiddleware::handle();
        $count = NotificationDao::clearRead($auth['sub']);
        Response::success(['cleared' => $count], 'Read notifications cleared');
    }

    public function destroy(array $params = []): void
    {
        $auth = JwtMiddleware::handle();
        $id   = (int)($params['id'] ?? 0);
        $ok   = NotificationDao::delete($id, $auth['sub']);
        Response::success(['deleted' => $ok], 'Notification deleted');
    }
}
