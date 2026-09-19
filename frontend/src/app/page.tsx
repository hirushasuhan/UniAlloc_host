'use client'
import { useEffect } from 'react'
import { getUser, roleHome } from '@/lib/auth'

export default function HomePage() {
  useEffect(() => {
    const user = getUser()
    const target = user?.role ? roleHome(user.role) : '/login'
    window.location.replace(target)
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg)]">
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var raw = sessionStorage.getItem('ua_user');
                var u = raw ? JSON.parse(raw) : null;
                var map = { system_admin: '/admin', dean: '/dean', department_head: '/department-head', lecturer: '/lecturer', student: '/student' };
                var dest = (u && u.role && map[u.role]) ? map[u.role] : '/login';
                window.location.replace(dest);
              } catch(e) {
                window.location.replace('/login');
              }
            })();
          `,
        }}
      />
      <div className="w-10 h-10 rounded-full border-4 border-[var(--accent)] border-t-transparent animate-spin mb-4" />
      <p className="text-sm font-medium text-[var(--muted)]">Loading UniAlloc...</p>
    </div>
  )
}
