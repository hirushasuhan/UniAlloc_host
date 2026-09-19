<?php
// ============================================================
// UniAlloc — Entry Point & Custom Router
// Start:  php -S localhost:8000 -t public/
// ============================================================

declare(strict_types=1);

define('BASE_PATH', dirname(__DIR__));

// --- Autoloader (manual PSR-4 style) ---
spl_autoload_register(function (string $class): void {
    $prefix = 'App\\';
    $base   = BASE_PATH . '/src/';
    if (!str_starts_with($class, $prefix)) return;
    $relative = str_replace('\\', '/', substr($class, strlen($prefix)));
    $file = $base . $relative . '.php';
    if (file_exists($file)) require $file;
});

// --- Error handling ---------------------------------------------------
// Uncaught exceptions used to reach the client as a raw PHP stack trace,
// which exposes absolute filesystem paths and internal structure. Log the
// detail server-side and return clean JSON instead.
$cfg = require BASE_PATH . '/config/app.php';

ini_set('display_errors', !empty($cfg['debug']) ? '1' : '0');
error_reporting(E_ALL);

set_exception_handler(function (\Throwable $e) use ($cfg) {
    error_log(sprintf(
        '[UniAlloc] Uncaught %s: %s in %s:%d',
        get_class($e), $e->getMessage(), $e->getFile(), $e->getLine()
    ));

    // The most common setup mistake deserves an actionable message rather
    // than a generic one, in every mode.
    if ($e instanceof \PDOException && str_contains($e->getMessage(), "doesn't exist")) {
        $message = 'Database schema is out of date — a required table or column is missing. '
                 . 'Run: mysql -u root <your_db_name> < database/apply_pending_migrations.sql';
    } elseif (!empty($cfg['debug'])) {
        $message = get_class($e) . ': ' . $e->getMessage();
    } else {
        $message = 'An unexpected server error occurred. Please contact the administrator.';
    }

    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json');
    }
    echo json_encode(['success' => false, 'message' => $message]);
});

// --- CORS ---
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $cfg['cors_origins'], true)) {
    header("Access-Control-Allow-Origin: $origin");
}
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Max-Age: 86400');

// --- Security headers ---
// Responses carry staff records, so they must never be cached by a shared
// proxy or restored from the browser's back/forward cache after sign-out.
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header('Cache-Control: no-store, no-cache, must-revalidate, private');
header('Pragma: no-cache');
header_remove('X-Powered-By');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// --- Parse URI ---
$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri    = rtrim($uri, '/');
$method = strtoupper($_SERVER['REQUEST_METHOD']);

// Strip /api prefix if present
$uri = preg_replace('#^/api#', '', $uri);

// --- Route table ---
$routes = [
    // Health
    'GET /health'                          => ['HealthController', 'index'],

    // Auth
    'POST /auth/login'                     => ['AuthController', 'login'],
    'POST /auth/register'                  => ['AuthController', 'register'],
    'POST /auth/logout'                    => ['AuthController', 'logout'],
    'POST /auth/totp/setup'                => ['AuthController', 'totpSetup'],
    'POST /auth/totp/verify'                => ['AuthController', 'totpVerify'],
    'POST /auth/forgot-password/check'     => ['AuthController', 'forgotPasswordCheck'],
    'POST /auth/forgot-password/reset'     => ['AuthController', 'forgotPasswordReset'],

    // Users
    'GET /users'                           => ['UserController', 'index'],
    'POST /users'                          => ['UserController', 'store'],
    'GET /users/{id}'                      => ['UserController', 'show'],
    'PUT /users/{id}'                      => ['UserController', 'update'],
    'DELETE /users/{id}'                   => ['UserController', 'destroy'],
    'POST /users/{id}/reset-password'      => ['UserController', 'resetPassword'],
    'POST /users/me/change-password'       => ['UserController', 'changePassword'],

    // Faculties
    'GET /faculties'                       => ['FacultyController', 'index'],
    'POST /faculties'                      => ['FacultyController', 'store'],
    'GET /faculties/{id}'                  => ['FacultyController', 'show'],
    'PUT /faculties/{id}'                  => ['FacultyController', 'update'],

    // Departments
    'GET /departments'                     => ['DepartmentController', 'index'],
    'POST /departments'                    => ['DepartmentController', 'store'],
    'GET /departments/{id}'                => ['DepartmentController', 'show'],
    'PUT /departments/{id}'                => ['DepartmentController', 'update'],

    // Assignments
    'GET /assignments'                     => ['AssignmentController', 'index'],
    'POST /assignments'                    => ['AssignmentController', 'store'],
    'GET /assignments/{id}'                => ['AssignmentController', 'show'],
    'PUT /assignments/{id}'                => ['AssignmentController', 'update'],
    'DELETE /assignments/{id}'             => ['AssignmentController', 'destroy'],
    'PATCH /assignments/{id}/progress'     => ['AssignmentController', 'updateProgress'],

    // Workload / Capacity
    'GET /capacity/{userId}'               => ['WorkloadController', 'show'],
    'GET /capacity'                        => ['WorkloadController', 'index'],

    // Work Requests
    'GET /work-requests'                   => ['WorkRequestController', 'index'],
    'POST /work-requests'                  => ['WorkRequestController', 'store'],
    'GET /work-requests/{id}'              => ['WorkRequestController', 'show'],
    'PATCH /work-requests/{id}'            => ['WorkRequestController', 'resolve'],

    // Workload Appeals
    'GET /appeals'                         => ['AppealController', 'index'],
    'POST /appeals'                        => ['AppealController', 'store'],
    'GET /appeals/{id}'                    => ['AppealController', 'show'],
    'PATCH /appeals/{id}'                  => ['AppealController', 'update'],

    // Student Requests
    'GET /student-requests'                => ['StudentRequestController', 'index'],
    'POST /student-requests'               => ['StudentRequestController', 'store'],
    'GET /student-requests/{id}'           => ['StudentRequestController', 'show'],
    'PATCH /student-requests/{id}'         => ['StudentRequestController', 'update'],

    // Notifications
    'GET /notifications'                   => ['NotificationController', 'index'],
    'PATCH /notifications/{id}/read'       => ['NotificationController', 'markRead'],
    'PATCH /notifications/read-all'        => ['NotificationController', 'markAllRead'],

    // Leadership vacancies (dashboard alerts)
    'GET /vacancies'                       => ['VacancyController', 'index'],

    // Role Promotions
    'GET /promotions'                      => ['PromotionController', 'index'],
    'POST /promotions'                     => ['PromotionController', 'store'],
    'PATCH /promotions/{id}'               => ['PromotionController', 'update'],

    // Audit Logs
    'GET /audit-logs'                      => ['AuditLogController', 'index'],

    // Settings
    'GET /settings'                        => ['SettingsController', 'index'],
    'PUT /settings'                        => ['SettingsController', 'update'],
];

// --- Match Route ---
$params = [];
$handler = null;

foreach ($routes as $pattern => $ctrl) {
    [$routeMethod, $routePath] = explode(' ', $pattern, 2);
    if ($routeMethod !== $method) continue;

    // Convert {id} placeholders to regex
    $regex = '#^' . preg_replace('#\{(\w+)\}#', '(?P<$1>[^/]+)', $routePath) . '$#';
    if (preg_match($regex, $uri, $matches)) {
        $params  = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
        $handler = $ctrl;
        break;
    }
}

if ($handler === null) {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => "Route not found: $method $uri"]);
    exit;
}

[$controllerClass, $action] = $handler;
$fqcn = "App\\Controllers\\$controllerClass";

if (!class_exists($fqcn)) {
    http_response_code(501);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => "Controller $controllerClass not implemented yet"]);
    exit;
}

$controller = new $fqcn();
$controller->$action($params);
