'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getUser, getToken, AuthUser } from '@/lib/auth'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function DashboardLayout({ children, requiredRole }: {
  children: React.ReactNode
  requiredRole?: string | string[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    const u = getUser()
    const token = getToken()

    // Not logged in at all (no session / tampered storage) → access denied
    if (!u || !token) { router.replace('/no-access'); return }

    // Logged in but wrong role for this panel → access denied
    if (requiredRole) {
      const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
      if (!allowed.includes(u.role)) { router.replace('/no-access'); return }
    }

    // No self-service password recovery enrolled yet → finish that first,
    // before anything else in the dashboard is reachable.
    if (!u.totp_enabled) { router.replace('/security-setup'); return }

    setUser(u)
  }, [])

  // Close the mobile drawer on route change
  useEffect(() => { setNavOpen(false) }, [pathname])

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-[var(--accent)] border-t-transparent animate-spin"/>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} open={navOpen} onClose={() => setNavOpen(false)} onUpdateUser={setUser} />

      <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
        <TopBar user={user} onUpdateUser={setUser} onOpenNav={() => setNavOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">{children}</main>
      </div>
    </div>
  )
}
