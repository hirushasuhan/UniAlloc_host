'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthUser } from '@/lib/auth'
import ThemeToggle from '@/components/ui/ThemeToggle'
import SettingsModal from '@/components/ui/SettingsModal'
import ChangePasswordModal from '@/components/ui/ChangePasswordModal'
import { HiOutlineBell, HiOutlineBars3, HiOutlineCheck, HiOutlineTrash } from 'react-icons/hi2'
import { api } from '@/lib/api'

interface Props {
  user: AuthUser
  onUpdateUser: (updated: AuthUser) => void
  onOpenNav: () => void
}

const TYPE_COLOR: Record<string, string> = {
  assignment: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400',
  deadline:   'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400',
  overload:   'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  request:    'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  appeal:     'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
  promotion:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  system:     'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

function getNotificationHref(n: any, role: string): string {
  const msg = (n.message || '').toLowerCase()
  const type = (n.type || '').toLowerCase()

  // 1. Appeals
  if (type === 'appeal' || msg.includes('appeal')) {
    if (role === 'department_head') return '/department-head/appeals'
    if (role === 'lecturer') return '/lecturer/appeals'
    if (role === 'dean') return '/dean/assignments'
  }

  // 2. Overload / Capacity
  if (type === 'overload' || msg.includes('overload') || msg.includes('capacity')) {
    if (role === 'lecturer') return '/lecturer/workload'
    if (role === 'department_head') return '/department-head/workload'
    if (role === 'dean') return '/dean/workload'
  }

  // 3. Student supervisor requests
  if (msg.includes('student') || msg.includes('supervisor')) {
    if (role === 'dean') return '/dean/student-requests'
    if (role === 'department_head') return '/department-head/student-requests'
    if (role === 'student') return '/student/requests'
    if (role === 'lecturer') return '/lecturer/requests'
  }

  // 4. General work requests
  if (type === 'request' || msg.includes('request')) {
    if (role === 'student') return '/student/requests'
    if (role === 'lecturer') return '/lecturer/requests'
    if (role === 'department_head') return '/department-head/requests'
    if (role === 'dean') return '/dean/requests'
  }

  // 5. Assignments / Tasks / Deadlines
  if (type === 'assignment' || type === 'deadline' || msg.includes('assignment') || msg.includes('task') || msg.includes('deadline')) {
    if (role === 'lecturer') return '/lecturer/assignments'
    if (role === 'department_head') return '/department-head/assignments'
    if (role === 'dean') return '/dean/assignments'
  }

  // 6. Promotions
  if (type === 'promotion' || msg.includes('promotion') || msg.includes('role')) {
    if (role === 'system_admin') return '/admin/promotions'
  }

  return '/notifications'
}

export default function TopBar({ user, onUpdateUser, onOpenNav }: Props) {
  const router = useRouter()
  const notifDropdownRef = useRef<HTMLDivElement>(null)

  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  const [notifications, setNotifications] = useState<any[]>([])
  const [institution, setInstitution] = useState('')
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    // Initial fetch of recent notifications
    api.get('/notifications').then(r => {
      setNotifications(r.data.data?.slice(0, 5) ?? [])
    }).catch(() => {})

    // Institution name (saved by admin in Settings)
    api.get('/settings').then(r => {
      const rows = r.data.data ?? []
      const item = rows.find((s: any) => s.setting_key === 'institution_name')
      if (item?.setting_value) setInstitution(item.setting_value)
    }).catch(() => {})

    // Live clock
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Close dropdown on click outside or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowNotifications(false)
      }
    }

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showNotifications])

  const toggleNotifications = () => {
    if (!showNotifications) {
      // Refresh notifications when opened
      api.get('/notifications').then(r => {
        setNotifications(r.data.data?.slice(0, 5) ?? [])
      }).catch(() => {})
    }
    setShowNotifications(prev => !prev)
  }

  const handleNotificationClick = async (n: any) => {
    setShowNotifications(false)
    if (!n.is_read) {
      try {
        await api.patch(`/notifications/${n.id}/read`)
        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: 1 } : x))
      } catch {}
    }
    const href = getNotificationHref(n, user.role)
    router.push(href)
  }

  const markAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await api.patch('/notifications/read-all')
      setNotifications(prev => prev.map(x => ({ ...x, is_read: 1 })))
    } catch {}
  }

  const clearReadNotifications = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await api.delete('/notifications/read')
      setNotifications(prev => prev.filter(x => !x.is_read))
    } catch {}
  }
  
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
          
          {/* Notifications Dropdown */}
          <div className="relative" ref={notifDropdownRef}>
            <button 
              onClick={toggleNotifications}
              aria-label="Notifications"
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all relative"
            >
              <HiOutlineBell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-[var(--card)] animate-pulse" />
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[var(--card-solid)] border border-[var(--border)] rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="p-3.5 px-4 border-b border-[var(--border)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                      >
                        <HiOutlineCheck size={13} /> Mark all read
                      </button>
                    )}
                    {notifications.some(n => n.is_read) && (
                      <button
                        onClick={clearReadNotifications}
                        className="text-xs text-red-500 dark:text-red-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                        title="Clear read notifications"
                      >
                        <HiOutlineTrash size={13} /> Clear read
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-[var(--border)]/60">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-sm text-[var(--muted)]">No notifications</div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`p-3.5 px-4 hover:bg-[var(--bg)] transition-colors cursor-pointer group flex items-start gap-3 ${
                          !n.is_read ? 'bg-[var(--accent)]/[0.04]' : 'opacity-80 hover:opacity-100'
                        }`}
                      >
                        <div className="mt-1.5 flex-shrink-0">
                          {!n.is_read ? (
                            <span className="block w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-indigo-500/30" />
                          ) : (
                            <span className="block w-2 h-2 rounded-full bg-transparent" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider ${TYPE_COLOR[n.type] ?? TYPE_COLOR.system}`}>
                              {n.type || 'system'}
                            </span>
                          </div>
                          <p className={`text-sm leading-snug line-clamp-2 text-[var(--text)] group-hover:text-[var(--accent)] transition-colors ${!n.is_read ? 'font-medium' : ''}`}>
                            {n.message}
                          </p>
                          <p className="text-[11px] text-[var(--muted)] mt-1">
                            {new Date(n.created_at).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <Link 
                  href="/notifications" 
                  onClick={() => setShowNotifications(false)} 
                  className="block p-2.5 text-center text-xs font-semibold text-[var(--accent)] hover:bg-[var(--bg)] border-t border-[var(--border)] transition-colors"
                >
                  View all notifications →
                </Link>
              </div>
            )}
          </div>

          {/* Profile */}
          <button 
            onClick={() => setShowSettingsModal(true)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm hover:scale-105 transition-transform"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
          >
            {(user?.full_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
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
