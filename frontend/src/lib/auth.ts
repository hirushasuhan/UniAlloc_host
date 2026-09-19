export interface AuthUser {
  id: number
  full_name: string
  title?: string | null
  position?: string | null
  operational_status?: string | null
  email: string
  role: 'system_admin' | 'dean' | 'department_head' | 'lecturer' | 'student'
  dept_id: number | null
  faculty_id: number | null
  faculty_name?: string | null
  contact?: string | null
  totp_enabled: boolean
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem('ua_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem('ua_token')
}

export function saveAuth(token: string, user: AuthUser): void {
  sessionStorage.setItem('ua_token', token)
  sessionStorage.setItem('ua_user', JSON.stringify(user))
}

export function clearAuth(): void {
  sessionStorage.removeItem('ua_token')
  sessionStorage.removeItem('ua_user')
}

/**
 * Nuke ALL client-side data: session/local storage, cookies and the
 * browser Cache Storage. Used when an unauthorized access attempt is
 * detected, so nothing sensitive survives on the machine.
 */
export function purgeAllClientData(): void {
  if (typeof window === 'undefined') return

  // 1. Web storage
  try { sessionStorage.clear() } catch {}
  try { localStorage.clear() } catch {}

  // 2. Cookies — expire every cookie on this origin (all paths/domains we can reach)
  try {
    const cookies = document.cookie.split(';')
    for (const c of cookies) {
      const name = c.split('=')[0].trim()
      if (!name) continue
      const expiry = 'expires=Thu, 01 Jan 1970 00:00:00 GMT'
      document.cookie = `${name}=; ${expiry}; path=/`
      document.cookie = `${name}=; ${expiry}; path=${window.location.pathname}`
      document.cookie = `${name}=; ${expiry}; path=/; domain=${window.location.hostname}`
    }
  } catch {}

  // 3. Cache Storage (service-worker / fetch caches)
  try {
    if ('caches' in window) {
      caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {})
    }
  } catch {}
}

export function roleHome(role: string): string {
  const map: Record<string, string> = {
    system_admin:    '/admin',
    dean:            '/dean',
    department_head: '/department-head',
    lecturer:        '/lecturer',
    student:         '/student',
  }
  return map[role] ?? '/login'
}
