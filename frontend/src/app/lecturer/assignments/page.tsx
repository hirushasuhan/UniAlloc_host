'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import DeadlineAlerts from '@/components/ui/DeadlineAlerts'
import { api } from '@/lib/api'
import { HiOutlineXMark } from 'react-icons/hi2'

const PRIORITY_COLOR: Record<string,string> = {
  urgent:'bg-red-100 text-red-700', high:'bg-orange-100 text-orange-700',
  medium:'bg-amber-100 text-amber-700', low:'bg-slate-100 text-slate-700'
}
const STATUS_COLOR: Record<string,string> = {
  completed: 'bg-green-100 text-green-700', in_progress: 'bg-blue-100 text-blue-700',
  pending: 'bg-amber-100 text-amber-700', cancelled: 'bg-red-100 text-red-700',
  review_pending: 'bg-purple-100 text-purple-700'
}

export default function LecturerAssignmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([])
  const [updating,    setUpdating]    = useState<number|null>(null)
  const [pct,         setPct]         = useState(0)
  const [note,        setNote]        = useState('')
  const [msg,         setMsg]         = useState<{text:string;ok:boolean}|null>(null)

  const load = () => api.get('/assignments').then(r => setAssignments(r.data.data ?? []))
  useEffect(() => { load() }, [])

  async function saveProgress(id: number) {
    try {
      await api.patch(`/assignments/${id}/progress`, { progress_percent: pct, note })
      setMsg({ text: 'Progress updated.', ok: true })
      setUpdating(null); load()
    } catch(e:any) { setMsg({ text: e.response?.data?.message ?? 'Error', ok: false }) }
  }

  return (
    <DashboardLayout requiredRole="lecturer">
      <h1 className="text-2xl font-heading font-bold mb-2">My Assignments</h1>
      <p className="text-[var(--muted)] text-sm mb-6">{assignments.length} assignments assigned to you</p>

      {msg && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm ${msg.ok?'bg-green-500/10 border border-green-500/30 text-green-600':'bg-red-500/10 border border-red-500/30 text-red-500'}`}>
          {msg.text}
        </div>
      )}

      {/* Overdue & approaching-deadline assignments — with Appeal action */}
      <DeadlineAlerts assignments={assignments} onChanged={load} mode="appeal" />

      <div className="space-y-4">
        {assignments.map((a:any) => (
          <div key={a.id} className="glass-card p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`badge text-xs ${PRIORITY_COLOR[a.priority]}`}>{a.priority}</span>
                  {a.deadline && <span className="text-xs text-[var(--muted)]">Due: {a.deadline}</span>}
                </div>
                <h3 className="font-semibold">{a.title}</h3>
                {a.description && <p className="text-sm text-[var(--muted)] mt-1">{a.description}</p>}
                <p className="text-xs text-[var(--muted)] mt-1">Assigned by: {a.assigned_by_name} · {a.estimated_hours}h estimated</p>
              </div>
              <span className={`badge flex-shrink-0 ${STATUS_COLOR[a.status] || 'bg-slate-100 text-slate-700'}`}>
                {a.status.replace('_',' ')}
              </span>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-2.5 rounded-full bg-[var(--border)]">
                <div className="h-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all"
                  style={{width:`${a.latest_progress??0}%`}}/>
              </div>
              <span className="text-sm font-medium w-10 text-right">{a.latest_progress??0}%</span>
            </div>

            {a.status !== 'completed' && a.status !== 'cancelled' && a.status !== 'review_pending' && (
              updating === a.id ? (
                <div className="space-y-3 bg-[var(--bg)] rounded-xl p-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Progress: {pct}%</label>
                    <input type="range" min={0} max={100} step={5} value={pct}
                      onChange={e=>setPct(+e.target.value)} className="w-full accent-indigo-500"/>
                  </div>
                  <textarea placeholder="Add a progress note (optional)…" rows={2}
                    value={note} onChange={e=>setNote(e.target.value)} className="input text-sm"/>
                  <div className="flex gap-2">
                    <button onClick={() => saveProgress(a.id)} className="btn-primary text-sm py-2 px-4">Save</button>
                    <button onClick={() => setUpdating(null)} className="btn-secondary text-sm py-2 px-4">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setUpdating(a.id); setPct(a.latest_progress??0); setNote('') }}
                  className="text-sm text-indigo-500 hover:underline font-medium">
                  Update progress →
                </button>
              )
            )}
          </div>
        ))}
        {assignments.length === 0 && (
          <div className="glass-card p-8 text-center text-[var(--muted)]">No assignments yet.</div>
        )}
      </div>
    </DashboardLayout>
  )
}
