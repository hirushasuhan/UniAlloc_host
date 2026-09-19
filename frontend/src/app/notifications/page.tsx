'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { api } from '@/lib/api'
import { HiOutlineBell, HiOutlineCheckBadge, HiOutlineArrowPath } from 'react-icons/hi2'

const TYPE_COLOR: Record<string,string> = {
  assignment: 'bg-indigo-100 text-indigo-700',
  deadline:   'bg-orange-100 text-orange-700',
  overload:   'bg-red-100 text-red-700',
  request:    'bg-blue-100 text-blue-700',
  appeal:     'bg-purple-100 text-purple-700',
  promotion:  'bg-emerald-100 text-emerald-700',
  system:     'bg-slate-100 text-slate-700',
}

export default function NotificationsPage() {
  const [notifs,  setNotifs]  = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const load = () => {
    setLoading(true)
    api.get('/notifications').then(r => setNotifs(r.data.data ?? [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  async function markRead(id: number) {
    await api.patch(`/notifications/${id}/read`)
    setNotifs(n => n.map(x => x.id === id ? { ...x, is_read: 1 } : x))
  }

  async function markAllRead() {
    await api.patch('/notifications/read-all')
    setNotifs(n => n.map(x => ({ ...x, is_read: 1 })))
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
        {notifs.map((n:any) => (
          <div key={n.id}
            className={`glass-card flex items-start gap-4 p-4 transition-all
              ${!n.is_read ? 'border-l-4 border-l-indigo-500' : 'opacity-70'}`}>
            <span className={`badge mt-0.5 flex-shrink-0 text-xs ${TYPE_COLOR[n.type] ?? TYPE_COLOR.system}`}>
              {n.type}
            </span>
            <p className="flex-1 text-sm">{n.message}</p>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-xs text-[var(--muted)] whitespace-nowrap">
                {new Date(n.created_at).toLocaleString()}
              </span>
              {!n.is_read && (
                <button onClick={() => markRead(n.id)}
                  className="text-xs text-indigo-500 hover:underline whitespace-nowrap">
                  Mark read
                </button>
              )}
            </div>
          </div>
        ))}
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
