<?php
namespace App\Controllers;

use App\Helpers\Db;
use App\Helpers\Response;

class HealthController
{
    public function index(array $params = []): void
    {
        try {
            Db::connection()->query('SELECT 1');
            Response::json(['status' => 'UP', 'database' => 'connected']);
        } catch (\Exception $e) {
            Response::json(['status' => 'DOWN', 'database' => 'error: ' . $e->getMessage()], 500);
        }
    }
}
