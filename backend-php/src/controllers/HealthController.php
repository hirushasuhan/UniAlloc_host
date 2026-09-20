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
            // /health is unauthenticated, so the raw driver message — which can
            // name the host, database and user — is logged instead of returned.
            // APP_DEBUG opts back into the detail while developing.
            error_log('[UniAlloc] Health check DB error: ' . $e->getMessage());

            $cfg     = require __DIR__ . '/../../config/app.php';
            $payload = ['status' => 'UP', 'database' => 'disconnected'];
            if (!empty($cfg['debug'])) {
                $payload['error'] = $e->getMessage();
            }

            Response::json($payload, 200);
        }
    }
}
