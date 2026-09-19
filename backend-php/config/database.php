<?php
// ============================================================
// UniAlloc — PDO Database Configuration
// ------------------------------------------------------------
// Credentials come from backend-php/.env (gitignored).
// This file is safe to commit: it contains no credentials.
// ============================================================

require_once __DIR__ . '/../src/helpers/Env.php';
\App\Helpers\Env::load(__DIR__ . '/../.env');

return [
    'host'     => \App\Helpers\Env::get('DB_HOST', '127.0.0.1'),
    'port'     => \App\Helpers\Env::int('DB_PORT', 3306),
    'dbname'   => \App\Helpers\Env::get('DB_NAME', 'uniAlloc_db'),
    'username' => \App\Helpers\Env::get('DB_USER', 'root'),
    'password' => \App\Helpers\Env::get('DB_PASSWORD', ''),
    'charset'  => \App\Helpers\Env::get('DB_CHARSET', 'utf8mb4'),
];
