<?php
namespace App\Controllers;

use App\Dao\AuditLogDao;
use App\Helpers\Response;
use App\Middleware\JwtMiddleware;

class AuditLogController
{
    public function index(array $params = []): void
    {
        JwtMiddleware::handle(['system_admin']);
        $limit  = (int)($_GET['limit']  ?? 100);
        $offset = (int)($_GET['offset'] ?? 0);
        Response::success(AuditLogDao::list($limit, $offset));
    }
}
