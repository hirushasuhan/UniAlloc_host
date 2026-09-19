<?php
// ============================================================
// UniAlloc — PDO Singleton Connection
// ============================================================

namespace App\Helpers;

use PDO;
use PDOException;

class Db
{
    private static ?PDO $instance = null;

    public static function connection(): PDO
    {
        if (self::$instance === null) {
            $cfg = require __DIR__ . '/../../config/database.php';
            $dsn = sprintf(
                'mysql:host=%s;port=%d;dbname=%s;charset=%s',
                $cfg['host'],
                $cfg['port'],
                $cfg['dbname'],
                $cfg['charset']
            );
            try {
                self::$instance = new PDO($dsn, $cfg['username'], $cfg['password'], [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]);
            } catch (PDOException $e) {
                // The raw PDO message names the host, database and user, so it
                // is only surfaced when APP_DEBUG is explicitly on.
                $app   = require __DIR__ . '/../../config/app.php';
                $debug = !empty($app['debug']);

                error_log('[UniAlloc] DB connection failed: ' . $e->getMessage());

                http_response_code(500);
                header('Content-Type: application/json');
                echo json_encode([
                    'success' => false,
                    'message' => $debug
                        ? 'Database connection failed: ' . $e->getMessage()
                        : 'Database connection failed. Please contact the administrator.',
                ]);
                exit;
            }
        }
        return self::$instance;
    }
}
