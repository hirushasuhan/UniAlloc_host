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

                // Pin the session to UTC so every TIMESTAMP column (audit
                // logs, created_at/updated_at, ...) reads and writes a
                // consistent instant, regardless of whichever timezone the
                // DB host or the backend host happens to be configured
                // with. TIMESTAMP columns store the true UTC instant
                // internally either way, so this only fixes how it's
                // interpreted on the way in/out — it doesn't shift any
                // existing data. Callers that want a specific person's
                // local time convert from this UTC value on the frontend.
                self::$instance->exec("SET time_zone = '+00:00'");
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
