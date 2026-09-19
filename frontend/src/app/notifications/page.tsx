'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { api } from '@/lib/api'
import { getUser } from '@/lib/auth'
import { HiOutlineBell, HiOutlineCheckBadge, HiOutlineArrowPath, HiOutlineArrowTopRightOnSquare } from 'react-icons/hi2'

const TYPE_COLOR: Record<string,string> = {
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

  if (type === 'appeal' || msg.includes('appeal')) {
    if (role === 'department_head') return '/department-head/appeals'
    if (role === 'lecturer') return '/lecturer/appeals'
    if (role === 'dean') return '/dean/assignments'
  }

  if (type === 'overload' || msg.includes('overload') || msg.includes('capacity')) {
    if (role === 'lecturer') return '/lecturer/workload'
    if (role === 'department_head') return '/department-head/workload'
    if (role === 'dean') return '/dean/workload'
  }

  if (msg.includes('student') || msg.includes('supervisor')) {
    if (role === 'dean') return '/dean/student-requests'
    if (role === 'department_head') return '/department-head/student-requests'
    if (role === 'student') return '/student/requests'
    if (role === 'lecturer') return '/lecturer/requests'
  }

  if (type === 'request' || msg.includes('request')) {
    if (role === 'student') return '/student/requests'
    if (role === 'lecturer') return '/lecturer/requests'
    if (role === 'department_head') return '/department-head/requests'
    if (role === 'dean') return '/dean/requests'
  }

  if (type === 'assignment' || type === 'deadline' || msg.includes('assignment') || msg.includes('task') || msg.includes('deadline')) {
    if (role === 'lecturer') return '/lecturer/assignments'
    if (role === 'department_head') return '/department-head/assignments'
    if (role === 'dean') return '/dean/assignments'
  }

  if (type === 'promotion' || msg.includes('promotion') || msg.includes('role')) {
    if (role === 'system_admin') return '/admin/promotions'
  }

  return '/notifications'
}

export default function NotificationsPage() {
  const router = useRouter()
  const user = getUser()
  const [notifs,  setNotifs]  = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const load = () => {
    setLoading(true)
    api.get('/notifications').then(r => setNotifs(r.data.data ?? [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  async function markRead(id: number, e?: React.MouseEvent) {
    if (e) e.stopPropagation()
    await api.patch(`/notifications/${id}/read`)
    setNotifs(n => n.map(x => x.id === id ? { ...x, is_read: 1 } : x))
  }

  async function markAllRead() {
    await api.patch('/notifications/read-all')
    setNotifs(n => n.map(x => ({ ...x, is_read: 1 })))
  }

  const handleCardClick = async (n: any) => {
    if (!n.is_read) {
      markRead(n.id)
    }
    const href = getNotificationHref(n, user?.role ?? '')
    if (href && href !== '/notifications') {
      router.push(href)
    }
  }

  const unread = notifs.filter(n => !n.is_read).length

  return (
    <DashboardLayout>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white">
            <HiOutlineBell size={20}/>
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold">Notifications</h1>
            <p className="text-[var(--muted)] text-sm">{unread} unread</p>
          </div>
        </div>
        <div className="flex gap-2">
          {unread > 0 && (
            <button onClick={markAllRead} className="btn-secondary text-sm">
              <HiOutlineCheckBadge size={15}/> Mark all read
            </button>
          )}
          <button onClick={load} disabled={loading} className="btn-secondary text-sm">
            <HiOutlineArrowPath size={15} className={loading?'animate-spin':''}/> Refresh
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {notifs.map((n:any) => {
          const href = getNotificationHref(n, user?.role ?? '')
          const canNavigate = href && href !== '/notifications'

          return (
            <div 
              key={n.id}
              onClick={() => handleCardClick(n)}
              className={`glass-card flex items-start gap-4 p-4 transition-all ${canNavigate ? 'cursor-pointer hover:border-[var(--accent)] hover:shadow-md' : ''}
                ${!n.is_read ? 'border-l-4 border-l-indigo-500' : 'opacity-80'}`}
            >
              <span className={`badge mt-0.5 flex-shrink-0 text-xs ${TYPE_COLOR[n.type] ?? TYPE_COLOR.system}`}>
                {n.type}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!n.is_read ? 'font-semibold text-[var(--text)]' : 'text-[var(--text)]'}`}>{n.message}</p>
                {canNavigate && (
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline mt-1 font-medium">
                    Go to page <HiOutlineArrowTopRightOnSquare size={12}/>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-[var(--muted)] whitespace-nowrap">
                  {new Date(n.created_at).toLocaleString()}
                </span>
                {!n.is_read && (
                  <button onClick={(e) => markRead(n.id, e)}
                    className="text-xs text-indigo-500 hover:underline whitespace-nowrap font-medium">
                    Mark read
                  </button>
                )}
              </div>
            </div>
          )
        })}
        {notifs.length === 0 && (
          <div className="glass-card p-10 text-center">
            <HiOutlineBell size={32} className="mx-auto text-[var(--muted)] mb-3 opacity-40"/>
            <p className="text-[var(--muted)]">No notifications yet.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
