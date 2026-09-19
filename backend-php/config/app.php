<?php
// ============================================================
// UniAlloc — Application Settings
// ------------------------------------------------------------
// All secrets are read from backend-php/.env (gitignored).
// This file is safe to commit: it contains no credentials.
// ============================================================

require_once __DIR__ . '/../src/helpers/Env.php';
\App\Helpers\Env::load(__DIR__ . '/../.env');

return [
    'app_name'               => \App\Helpers\Env::get('APP_NAME', 'UniAlloc'),
    'app_url'                => \App\Helpers\Env::get('APP_URL', 'http://localhost:8000'),
    'debug'                  => \App\Helpers\Env::bool('APP_DEBUG', false),
    'jwt_secret'             => \App\Helpers\Env::get('JWT_SECRET', ''),
    'jwt_ttl'                => \App\Helpers\Env::int('JWT_TTL', 480),   // minutes (8 hours)
    'app_key'                => \App\Helpers\Env::get('APP_KEY', ''),
    'cors_origins'           => \App\Helpers\Env::list('CORS_ORIGINS', ['http://localhost:3000']),
    'registration_domain'    => \App\Helpers\Env::get('REGISTRATION_EMAIL_DOMAIN', ''),
    'overload_threshold_pct' => \App\Helpers\Env::int('OVERLOAD_THRESHOLD_PCT', 90),
];
