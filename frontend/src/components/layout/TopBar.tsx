'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AuthUser } from '@/lib/auth'
import ThemeToggle from '@/components/ui/ThemeToggle'
import SettingsModal from '@/components/ui/SettingsModal'
import ChangePasswordModal from '@/components/ui/ChangePasswordModal'
import { HiOutlineBell, HiOutlineBars3 } from 'react-icons/hi2'
import { api } from '@/lib/api'

interface Props {
  user: AuthUser
  onUpdateUser: (updated: AuthUser) => void
  onOpenNav: () => void
}

export default function TopBar({ user, onUpdateUser, onOpenNav }: Props) {
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  const [notifications, setNotifications] = useState<any[]>([])
  const [institution, setInstitution] = useState('')
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    // Only fetch when the dropdown is opened, or just fetch once
    api.get('/notifications').then(r => {
      // Show top 5 recent notifications
      setNotifications(r.data.data?.slice(0, 5) ?? [])
    }).catch(() => {})

    // Institution name (saved by admin in Settings)
    api.get('/settings').then(r => {
      const rows = r.data.data ?? []
      const item = rows.find((s: any) => s.setting_key === 'institution_name')
      if (item?.setting_value) setInstitution(item.setting_value)
    }).catch(() => {})

    // Live clock — set after mount (avoids SSR hydration mismatch), tick every second
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  
  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 bg-[var(--bg)]/80 backdrop-blur-md border-b border-[var(--border)]">
        {/* Left Side: Mobile Menu Button + Institution & Clock */}
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={onOpenNav}
            aria-label="Open menu"
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--card)] text-[var(--text)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors active:scale-95"
          >
            <HiOutlineBars3 size={20} />
          </button>

          {institution && (
            <div className="min-w-0">
              <h2 className="font-heading font-bold text-sm sm:text-base leading-tight truncate">{institution}</h2>
              {now && (
                <p className="text-[11px] sm:text-xs text-[var(--muted)] mt-0.5 truncate">
                  {now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  <span className="mx-1.5">·</span>
                  {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          <ThemeToggle compact />
          
          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all"
            >
              <HiOutlineBell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-[var(--card)]" />
              )}
            </button>
            
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                <div className="absolute right-0 mt-2 w-72 bg-[var(--card-solid)] border border-[var(--border)] rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="p-4 border-b border-[var(--border)]">
                    <h3 className="font-semibold text-sm">Notifications</h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-sm text-[var(--muted)]">No notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-4 border-b border-[var(--border)] hover:bg-[var(--bg)] transition-colors cursor-pointer ${!n.is_read ? 'bg-[var(--bg)]/50' : ''}`}>
                          <p className={`text-sm ${!n.is_read ? 'font-semibold' : ''}`}>{n.message}</p>
                          <p className="text-xs text-[var(--muted)] mt-1">{new Date(n.created_at).toLocaleString()}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <Link href="/notifications" onClick={() => setShowNotifications(false)} className="block p-3 text-center text-sm text-[var(--accent)] hover:underline cursor-pointer">
                    View all notifications
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Profile */}
          <button 
            onClick={() => setShowSettingsModal(true)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm hover:scale-105 transition-transform"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
          >
            {user.full_name[0].toUpperCase()}
          </button>
        </div>
      </header>

      {showSettingsModal && (
        <SettingsModal 
          user={user} 
          onClose={() => setShowSettingsModal(false)} 
          onChangePasswordClick={() => {
            setShowSettingsModal(false)
            setShowPasswordModal(true)
          }}
          onUpdateUser={onUpdateUser}
        />
      )}

      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
    </>
  )
}
