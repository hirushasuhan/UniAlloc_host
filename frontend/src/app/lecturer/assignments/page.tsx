'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import DeadlineAlerts from '@/components/ui/DeadlineAlerts'
import { api } from '@/lib/api'
import { HiOutlineBriefcase, HiOutlineCheckCircle, HiOutlineClipboardDocumentList, HiOutlineXMark } from 'react-icons/hi2'

const PRIORITY_COLOR: Record<string,string> = {
  urgent:'bg-red-100 text-red-700', high:'bg-orange-100 text-orange-700',
  medium:'bg-amber-100 text-amber-700', low:'bg-slate-100 text-slate-700'
}
const STATUS_COLOR: Record<string,string> = {
  completed: 'bg-green-100 text-green-700', in_progress: 'bg-blue-100 text-blue-700',
  pending: 'bg-amber-100 text-amber-700', cancelled: 'bg-red-100 text-red-700',
  review_pending: 'bg-purple-100 text-purple-700'
}

const isOverdue = (deadline: string | null, status: string) => {
  if (!deadline || ['completed', 'cancelled', 'review_pending'].includes(status)) return false
  const clean = deadline.trim().split(' ')[0].split('T')[0]
  const [y, m, d] = clean.split('-').map(Number)
  if (!y || !m || !d) return false
  const date = new Date(y, m - 1, d)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return date.getTime() < today.getTime()
}

export default function LecturerAssignmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([])
  const [updating,    setUpdating]    = useState<number|null>(null)
  const [pct,         setPct]         = useState(0)
  const [note,        setNote]        = useState('')
  const [msg,         setMsg]         = useState<{text:string;ok:boolean}|null>(null)
  const [activeTab,   setActiveTab]   = useState<'active' | 'completed'>('active')

  const load = () => api.get('/assignments').then(r => setAssignments(r.data.data ?? []))
  useEffect(() => { load() }, [])

  async function saveProgress(id: number) {
    if (pct === 100) {
      const confirmed = window.confirm(
        'Are you sure you want to mark this assignment as 100% completed?'
      )
      if (!confirmed) return
    }
    try {
      await api.patch(`/assignments/${id}/progress`, { progress_percent: pct, note })
      setMsg({ text: 'Progress updated.', ok: true })
      setUpdating(null); load()
    } catch(e:any) { setMsg({ text: e.response?.data?.message ?? 'Error', ok: false }) }
  }

  const active    = assignments.filter(a => a.status !== 'completed' && a.status !== 'cancelled')
  const completed = assignments.filter(a => a.status === 'completed')

  return (
    <DashboardLayout requiredRole="lecturer">
      <h1 className="text-2xl font-heading font-bold mb-1">My Assignments</h1>
      <p className="text-[var(--muted)] text-sm mb-6">
        {active.length} active · {completed.length} completed
      </p>

      {msg && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm ${msg.ok?'bg-green-500/10 border border-green-500/30 text-green-600':'bg-red-500/10 border border-red-500/30 text-red-500'}`}>
          {msg.text}
        </div>
      )}

      {/* Overdue & approaching-deadline assignments — with Appeal action */}
      <DeadlineAlerts assignments={assignments} onChanged={load} mode="appeal" />

      {assignments.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <HiOutlineBriefcase size={32} className="mx-auto text-[var(--muted)] mb-3 opacity-40" />
          <p className="text-[var(--muted)]">No assignments assigned to you yet.</p>
        </div>
      ) : (
        <>
          {/* Tab Navigation */}
          <div className="flex border-b border-[var(--border)] mb-6 gap-2">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex items-center gap-2 px-5 py-3 font-medium text-sm border-b-2 transition-all ${
                activeTab === 'active'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <HiOutlineClipboardDocumentList size={17} />
              <span>Active Assignments</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  activeTab === 'active'
                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                    : 'bg-[var(--border)] text-[var(--muted)]'
                }`}
              >
                {active.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('completed')}
              className={`flex items-center gap-2 px-5 py-3 font-medium text-sm border-b-2 transition-all ${
                activeTab === 'completed'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <HiOutlineCheckCircle size={17} />
              <span>Completed Assignments</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  activeTab === 'completed'
                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                    : 'bg-[var(--border)] text-[var(--muted)]'
                }`}
              >
                {completed.length}
              </span>
            </button>
          </div>

          {activeTab === 'active' && (
            active.length > 0 ? (
              <div className="space-y-4">
                {active.map((a: any) => (
                  <AssignmentCard
                    key={a.id}
                    a={a}
                    updating={updating}
                    pct={pct}
                    note={note}
                    onOpen={() => { setUpdating(a.id); setPct(a.latest_progress ?? 0); setNote('') }}
                    onPct={setPct}
                    onNote={setNote}
                    onSave={() => saveProgress(a.id)}
                    onClose={() => setUpdating(null)}
                  />
                ))}
              </div>
            ) : (
              <div className="glass-card p-10 text-center">
                <HiOutlineCheckCircle size={32} className="mx-auto text-[var(--muted)] mb-3 opacity-40" />
                <p className="text-[var(--muted)]">No active assignments at the moment.</p>
              </div>
            )
          )}

          {activeTab === 'completed' && (
            completed.length > 0 ? (
              <div className="space-y-4">
                {completed.map((a: any) => (
                  <AssignmentCard
                    key={a.id}
                    a={a}
                    updating={updating}
                    pct={pct}
                    note={note}
                    onOpen={() => { setUpdating(a.id); setPct(a.latest_progress ?? 100); setNote('') }}
                    onPct={setPct}
                    onNote={setNote}
                    onSave={() => saveProgress(a.id)}
                    onClose={() => setUpdating(null)}
                  />
                ))}
              </div>
            ) : (
              <div className="glass-card p-10 text-center">
                <HiOutlineBriefcase size={32} className="mx-auto text-[var(--muted)] mb-3 opacity-40" />
                <p className="text-[var(--muted)]">No completed assignments yet.</p>
              </div>
            )
          )}
        </>
      )}
    </DashboardLayout>
  )
}

function AssignmentCard({ a, updating, pct, note, onOpen, onPct, onNote, onSave, onClose }: any) {
  const isCancelled = a.status === 'cancelled'

  return (
    <div className={`glass-card p-5 ${a.status === 'completed' || isCancelled ? 'opacity-75' : ''}`}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`badge text-xs ${PRIORITY_COLOR[a.priority]}`}>{a.priority}</span>
            {a.deadline && (
              <span className={`text-xs ${isOverdue(a.deadline, a.status) ? 'text-red-600 font-semibold' : 'text-[var(--muted)]'}`}>
                Due: {a.deadline}
                {isOverdue(a.deadline, a.status) && (
                  <span className="ml-1.5 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                    Overdue
                  </span>
                )}
              </span>
            )}
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
            style={{width:`${a.latest_progress ?? (a.status === 'completed' ? 100 : 0)}%`}}/>
        </div>
        <span className="text-sm font-medium w-10 text-right">{a.latest_progress ?? (a.status === 'completed' ? 100 : 0)}%</span>
      </div>

      {!isCancelled && (
        updating === a.id ? (
          <div className="space-y-3 bg-[var(--bg)] rounded-xl p-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Progress: {pct}% {pct === 100 && '(Completed)'}
              </label>
              <input type="range" min={0} max={100} step={5} value={pct}
                onChange={e=>onPct(+e.target.value)} className="w-full accent-indigo-500"/>
            </div>
            <textarea placeholder="Add a progress note (optional)…" rows={2}
              value={note} onChange={e=>onNote(e.target.value)} className="input text-sm"/>
            <div className="flex gap-2">
              <button onClick={onSave} className="btn-primary text-sm py-2 px-4">Save</button>
              <button onClick={onClose} className="btn-secondary text-sm py-2 px-4">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={onOpen}
            className="text-sm text-indigo-500 hover:underline font-medium">
            {a.status === 'completed' ? 'Adjust progress / status ↺' : 'Update progress →'}
          </button>
        )
      )}
    </div>
  )
}
