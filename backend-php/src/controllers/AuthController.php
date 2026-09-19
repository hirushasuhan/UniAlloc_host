<?php
namespace App\Controllers;

use App\Helpers\Db;
use App\Helpers\JwtHelper;
use App\Helpers\Response;
use App\Helpers\Totp;
use App\Middleware\JwtMiddleware;
use App\Dao\AuditLogDao;
use App\Dao\LoginAttemptDao;
use App\Dao\UserDao;
use App\Helpers\PasswordPolicy;

class AuthController
{
    public function login(array $params = []): void
    {
        $body  = json_decode(file_get_contents('php://input'), true) ?? [];
        $email = trim($body['email'] ?? '');
        $pass  = $body['password'] ?? '';

        if (!$email || !$pass) {
            Response::error('Email and password are required', 422);
        }

        $ip = LoginAttemptDao::clientIp();
        if (LoginAttemptDao::isThrottled($email, $ip)) {
            Response::error(
                'Too many failed sign-in attempts. Please wait ' . LoginAttemptDao::WINDOW_MINUTES . ' minutes and try again.',
                429
            );
        }

        $db   = Db::connection();
        $stmt = $db->prepare(
            'SELECT u.id, u.full_name, u.title, u.position, u.email, u.password_hash, u.is_active, u.totp_enabled, u.token_version,
                    u.capacity_hours, u.operational_status, u.department_id, u.enrollment_number,
                    r.role_name,
                    d.faculty_id,
                    f.faculty_name
             FROM users u
             JOIN roles r ON r.id = u.role_id
             LEFT JOIN departments d ON d.id = u.department_id
             LEFT JOIN faculties f ON f.id = d.faculty_id
             WHERE u.email = :email
             LIMIT 1'
        );
        $stmt->execute([':email' => $email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($pass, $user['password_hash'])) {
            LoginAttemptDao::record($email, $ip, false);
            Response::error('Invalid credentials', 401);
        }

        if (!$user['is_active']) {
            LoginAttemptDao::record($email, $ip, false);
            Response::error('Account is deactivated. Contact the system administrator.', 403);
        }

        LoginAttemptDao::record($email, $ip, true);
        LoginAttemptDao::clearFailures($email);

        // For deans, look up faculty_id from faculties table
        $facultyId = $user['faculty_id'];
        $facultyName = $user['faculty_name'] ?? null;
        if ($user['role_name'] === 'dean') {
            $fs = $db->prepare('SELECT id, faculty_name FROM faculties WHERE dean_id = :uid LIMIT 1');
            $fs->execute([':uid' => $user['id']]);
            $frow = $fs->fetch();
            $facultyId = $frow['id'] ?? null;
            $facultyName = $frow['faculty_name'] ?? null;
        }

        $payload = [
            'sub'          => (int)$user['id'],
            'name'         => $user['full_name'],
            'email'        => $user['email'],
            'role'         => $user['role_name'],
            'dept'         => $user['department_id'] ? (int)$user['department_id'] : null,
            'faculty'      => $facultyId ? (int)$facultyId : null,
            'faculty_name' => $facultyName,
            'tv'           => (int)$user['token_version'],
        ];

        $token = JwtHelper::generate($payload);

        AuditLogDao::log((int)$user['id'], 'login', 'users', (int)$user['id']);

        Response::success([
            'token' => $token,
            'user'  => [
                'id'                => (int)$user['id'],
                'full_name'         => $user['full_name'],
                'title'             => $user['title'] ?? null,
                'position'          => $user['position'] ?? null,
                'operational_status'=> $user['operational_status'] ?? 'Available',
                'email'             => $user['email'],
                'role'              => $user['role_name'],
                'dept_id'           => $user['department_id'] ? (int)$user['department_id'] : null,
                'faculty_id'        => $facultyId ? (int)$facultyId : null,
                'faculty_name'      => $facultyName,
                'enrollment_number' => $user['enrollment_number'] ?? null,
                'contact'           => $user['contact'] ?? null,
                'totp_enabled'      => (bool)$user['totp_enabled'],
            ],
        ], 'Login successful');
    }

    public function logout(array $params = []): void
    {
        // JWT is stateless — client discards the token
        Response::success(null, 'Logged out');
    }

    public function register(array $params = []): void
    {
        $body  = json_decode(file_get_contents('php://input'), true) ?? [];
        $fullName = trim($body['full_name'] ?? '');
        $email    = trim($body['email'] ?? '');
        $pass     = $body['password'] ?? '';
        $deptId   = $body['department_id'] ?? null;
        $enrollNo = trim($body['enrollment_number'] ?? '');

        if (!$fullName || !$email || !$pass || !$deptId || !$enrollNo) {
            Response::error('All fields (Full Name, Email, Password, Department, Enrollment Number) are required', 422);
        }

        // Registration is public, so it gets the same throttling as login.
        $ip = LoginAttemptDao::clientIp();
        if (LoginAttemptDao::isThrottled('register:' . $ip, $ip)) {
            Response::error('Too many registration attempts. Please try again later.', 429);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            LoginAttemptDao::record('register:' . $ip, $ip, false);
            Response::error('Invalid email address', 422);
        }

        // Optionally restrict self-registration to the institution's domain.
        $cfg    = require __DIR__ . '/../../config/app.php';
        $domain = trim((string)($cfg['registration_domain'] ?? ''));
        if ($domain !== '' && !str_ends_with(strtolower($email), '@' . strtolower($domain))) {
            LoginAttemptDao::record('register:' . $ip, $ip, false);
            Response::error("Registration is limited to @$domain email addresses.", 422);
        }

        PasswordPolicy::enforce($pass);

        $db = Db::connection();

        // Check if email or enrollment number exists
        $stmt = $db->prepare('SELECT email, enrollment_number FROM users WHERE email = :email OR enrollment_number = :enroll LIMIT 1');
        $stmt->execute([':email' => $email, ':enroll' => $enrollNo]);
        $existing = $stmt->fetch();
        
        if ($existing) {
            if ($existing['email'] === $email) {
                Response::error('Email is already registered', 409);
            }
            if ($existing['enrollment_number'] === $enrollNo) {
                Response::error('Enrollment number is already registered', 409);
            }
        }

        $hash = password_hash($pass, PASSWORD_BCRYPT, ['cost' => 12]);

        try {
            $db->beginTransaction();

            $insertStmt = $db->prepare(
                'INSERT INTO users (full_name, email, password_hash, role_id, department_id, enrollment_number, capacity_hours)
                 VALUES (:fname, :email, :hash, 5, :dept, :enroll, 0.00)' // role_id 5 = student
            );
            $insertStmt->execute([
                ':fname'  => $fullName,
                ':email'  => $email,
                ':hash'   => $hash,
                ':dept'   => $deptId,
                ':enroll' => $enrollNo
            ]);
            $userId = (int)$db->lastInsertId();

            AuditLogDao::log($userId, 'register', 'users', $userId);

            $db->commit();

            // Auto-login logic
            $stmt = $db->prepare(
                'SELECT u.id, u.full_name, u.email, u.department_id, u.enrollment_number, u.totp_enabled, u.token_version,
                        r.role_name, d.faculty_id, f.faculty_name
                 FROM users u
                 JOIN roles r ON r.id = u.role_id
                 LEFT JOIN departments d ON d.id = u.department_id
                 LEFT JOIN faculties f ON f.id = d.faculty_id
                 WHERE u.id = :id
                 LIMIT 1'
            );
            $stmt->execute([':id' => $userId]);
            $user = $stmt->fetch();

            $facultyId = $user['faculty_id'] ? (int)$user['faculty_id'] : null;
            $facultyName = $user['faculty_name'] ?? null;

            $payload = [
                'sub'          => (int)$user['id'],
                'name'         => $user['full_name'],
                'email'        => $user['email'],
                'role'         => $user['role_name'],
                'dept'         => $user['department_id'] ? (int)$user['department_id'] : null,
                'faculty'      => $facultyId,
                'faculty_name' => $facultyName,
                'tv'           => (int)$user['token_version'],
            ];

            $token = JwtHelper::generate($payload);

            Response::success([
                'token' => $token,
                'user'  => [
                    'id'                => (int)$user['id'],
                    'full_name'         => $user['full_name'],
                    'title'             => null,
                    'position'          => null,
                    'email'             => $user['email'],
                    'role'              => $user['role_name'],
                    'dept_id'           => $user['department_id'] ? (int)$user['department_id'] : null,
                    'faculty_id'        => $facultyId,
                    'faculty_name'      => $facultyName,
                    'enrollment_number' => $user['enrollment_number'] ?? null,
                    'contact'           => null,
                    'totp_enabled'      => (bool)$user['totp_enabled'],
                ],
            ], 'Registration successful');

        } catch (\Exception $e) {
            $db->rollBack();
            error_log('[UniAlloc] Registration failed: ' . $e->getMessage());
            $debug = !empty((require __DIR__ . '/../../config/app.php')['debug']);
            Response::error(
                $debug ? 'Failed to register user: ' . $e->getMessage() : 'Registration could not be completed. Please try again.',
                500
            );
        }
    }

    // ------------------------------------------------------------
    // TOTP self-service password recovery
    // ------------------------------------------------------------

    /** Starts (or restarts) authenticator enrollment for the logged-in user. */
    public function totpSetup(array $params = []): void
    {
        // requireTotp:false — this IS the enrollment endpoint
        $auth   = JwtMiddleware::handle([], false);
        $secret = Totp::generateSecret();
        UserDao::saveTotpSecret((int)$auth['sub'], $secret);

        Response::success([
            'secret'      => $secret,
            'otpauth_url' => Totp::otpAuthUrl($secret, $auth['email'] ?? ('user' . $auth['sub'])),
        ]);
    }

    /** Confirms enrollment: the user proves they scanned/typed the secret correctly. */
    public function totpVerify(array $params = []): void
    {
        // requireTotp:false — this IS the enrollment endpoint
        $auth = JwtMiddleware::handle([], false);
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $code = trim((string)($body['code'] ?? ''));

        $user = UserDao::findAuthById((int)$auth['sub']);
        if (!$user || !$user['totp_secret']) {
            Response::error('No authenticator setup in progress. Please start setup again.', 422);
        }

        if (!Totp::verify($user['totp_secret'], $code)) {
            Response::error('Incorrect code. Please check your authenticator app and try again.', 401);
        }

        UserDao::enableTotp((int)$auth['sub']);
        AuditLogDao::log((int)$auth['sub'], 'totp_enabled', 'users', (int)$auth['sub']);
        Response::success(['totp_enabled' => true], 'Authenticator enrolled successfully');
    }

    /**
     * Step 1 of the public forgot-password flow: tells the frontend whether
     * this email can self-recover, WITHOUT ever confirming whether the email
     * itself exists (an unknown email and a known-but-unenrolled email both
     * come back as not recoverable).
     */
    public function forgotPasswordCheck(array $params = []): void
    {
        $body  = json_decode(file_get_contents('php://input'), true) ?? [];
        $email = trim(strtolower($body['email'] ?? ''));

        if (!$email) {
            Response::error('Email is required', 422);
        }

        $user = UserDao::findByEmailForRecovery($email);
        $recoverable = $user && $user['is_active'] && $user['totp_enabled'];

        Response::success(['recoverable' => (bool)$recoverable]);
    }

    /** Step 2: verifies the authenticator code and sets the new password directly. */
    public function forgotPasswordReset(array $params = []): void
    {
        $body        = json_decode(file_get_contents('php://input'), true) ?? [];
        $email       = trim(strtolower($body['email'] ?? ''));
        $code        = trim((string)($body['code'] ?? ''));
        $newPassword = (string)($body['new_password'] ?? '');

        if (!$email || !$code || $newPassword === '') {
            Response::error('Email, authenticator code, and a new password are required', 422);
        }
        PasswordPolicy::enforce($newPassword);

        $user = UserDao::findByEmailForRecovery($email);
        if (!$user || !$user['is_active'] || !$user['totp_enabled']) {
            Response::error('Unable to reset your password with the details provided. Please contact your System Administrator for help.', 401);
        }

        if (!empty($user['totp_locked_until']) && strtotime($user['totp_locked_until']) > time()) {
            Response::error('Too many incorrect attempts. Please wait before trying again, or contact your System Administrator.', 429);
        }

        if (!Totp::verify($user['totp_secret'], $code)) {
            UserDao::registerTotpFailure((int)$user['id']);
            Response::error('Unable to reset your password with the details provided. Please contact your System Administrator for help.', 401);
        }

        UserDao::clearTotpFailures((int)$user['id']);
        UserDao::update((int)$user['id'], ['password' => $newPassword]);
        // Revoke any session already holding the OLD password's token.
        UserDao::bumpTokenVersion((int)$user['id']);
        AuditLogDao::log((int)$user['id'], 'self_reset_password', 'users', (int)$user['id']);

        Response::success(['message' => 'Password reset successfully'], 'Password reset successfully');
    }
}
