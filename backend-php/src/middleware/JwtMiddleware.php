<?php
// ============================================================
// UniAlloc — JWT Auth & RBAC Middleware
// ============================================================

namespace App\Middleware;

use App\Dao\UserDao;
use App\Helpers\JwtHelper;
use App\Helpers\Response;

class JwtMiddleware
{
    /**
     * Call before any protected route handler.
     *
     * A valid signature is necessary but NOT sufficient: the account is
     * re-checked against the database on every request, so deactivation,
     * role changes and password resets take effect immediately instead of
     * waiting out the token's lifetime.
     *
     * @param array $allowedRoles e.g. ['system_admin','dean'] — empty means any authenticated user
     * @param bool  $requireTotp  false only for the enrollment endpoints themselves
     */
    public static function handle(array $allowedRoles = [], bool $requireTotp = true): array
    {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (!str_starts_with($authHeader, 'Bearer ')) {
            Response::error('Unauthorised — token missing', 401);
        }

        $token   = substr($authHeader, 7);
        $payload = JwtHelper::validate($token);

        if ($payload === null || empty($payload['sub'])) {
            Response::error('Unauthorised — invalid or expired token', 401);
        }

        // --- Re-authorise against the live database ----------------------
        $state = UserDao::findSecurityState((int)$payload['sub']);

        if (!$state) {
            Response::error('Unauthorised — account no longer exists', 401);
        }

        if (!$state['is_active']) {
            Response::error('Account is deactivated. Contact the system administrator.', 403);
        }

        // Password changes / resets bump token_version, killing older tokens.
        if ((int)($payload['tv'] ?? -1) !== (int)$state['token_version']) {
            Response::error('Session expired — please sign in again.', 401);
        }

        // Trust the database over the token for anything authorisation depends on.
        $payload['role']    = $state['role_name'];
        $payload['dept']    = $state['department_id'] !== null ? (int)$state['department_id'] : null;
        $payload['faculty'] = $state['faculty_id']    !== null ? (int)$state['faculty_id']    : null;

        if (!empty($allowedRoles) && !in_array($payload['role'], $allowedRoles, true)) {
            Response::error('Forbidden — insufficient role', 403);
        }

        // Self-service password recovery is mandatory, and enforcing it here
        // (not just in the UI) is what stops a tampered client from skipping it.
        if ($requireTotp && empty($state['totp_enabled'])) {
            Response::error(
                'Authenticator enrollment is required before you can use the system.',
                403,
                ['code' => 'TOTP_SETUP_REQUIRED']
            );
        }

        return $payload; // ['sub'=>userId, 'role'=>roleName, 'dept'=>deptId|null, 'faculty'=>facultyId|null]
    }
}
