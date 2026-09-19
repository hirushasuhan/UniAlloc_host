'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { api } from '@/lib/api'
import { HiOutlineXMark } from 'react-icons/hi2'

export default function DeptHeadAppealsPage() {
  const [appeals,  setAppeals]  = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [note,     setNote]     = useState('')
  const [msg,      setMsg]      = useState<{text:string;ok:boolean}|null>(null)

  // Appealed assignment + remedial action controls
  const [task,         setTask]         = useState<any>(null)
  const [taskPriority, setTaskPriority] = useState('medium')
  const [taskDeadline, setTaskDeadline] = useState('')
  const [applying,     setApplying]     = useState(false)

  // General appeal (no specific assignment) → ALL active tasks of the lecturer
  const [tasks, setTasks] = useState<any[]>([])

  const today = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()

  const load = () => api.get('/appeals').then(r => setAppeals(r.data.data ?? []))
  useEffect(() => { load() }, [])

  const openReview = (a: any) => {
    setSelected(a); setNote(''); setTask(null); setTasks([])
    if (a.assignment_id) {
      api.get(`/assignments/${a.assignment_id}`).then(r => {
        const t = r.data.data
        setTask(t)
        setTaskPriority(t.priority ?? 'medium')
        setTaskDeadline(t.deadline ?? '')
      }).catch(() => setTask(null))
    } else {
      // General appeal → load every active task assigned to this lecturer
      api.get('/assignments').then(r => {
        const list = (r.data.data ?? []).filter((t: any) =>
          Number(t.assigned_to) === Number(a.lecturer_id) &&
          !['cancelled', 'completed'].includes(t.status)
        )
        setTasks(list.map((t: any) => ({ ...t, _priority: t.priority, _deadline: t.deadline ?? '' })))
      }).catch(() => setTasks([]))
    }
  }

  const setTaskField = (id: number, field: string, val: string) =>
    setTasks(ts => ts.map(t => t.id === id ? { ...t, [field]: val } : t))

  // Apply priority/deadline changes to one task in the list
  async function applyRowChanges(t: any) {
    setApplying(true)
    try {
      await api.put(`/assignments/${t.id}`, { priority: t._priority, deadline: t._deadline || null })
      setMsg({ text: `"${t.title}" updated — the lecturer has been notified.`, ok: true })
      setTasks(ts => ts.map(x => x.id === t.id ? { ...x, priority: t._priority, deadline: t._deadline || null } : x))
    } catch(e:any) { setMsg({ text: e.response?.data?.message ?? 'Error updating task.', ok: false }) }
    finally { setApplying(false) }
  }

  // Remove one task from the lecturer (cancels the assignment)
  async function removeRowTask(t: any) {
    if (!confirm(`Remove "${t.title}" from ${selected?.lecturer_name}?\n\nThe assignment will be cancelled and no longer count towards their workload.`)) return
    setApplying(true)
    try {
      await api.put(`/assignments/${t.id}`, { status: 'cancelled' })
      setMsg({ text: `"${t.title}" removed from the lecturer — they have been notified.`, ok: true })
      setTasks(ts => ts.filter(x => x.id !== t.id))
    } catch(e:any) { setMsg({ text: e.response?.data?.message ?? 'Error removing task.', ok: false }) }
    finally { setApplying(false) }
  }

  // Change priority / extend deadline of the appealed task
  async function applyTaskChanges() {
    if (!task) return
    setApplying(true)
    try {
      await api.put(`/assignments/${task.id}`, {
        priority: taskPriority,
        deadline: taskDeadline || null,
      })
      setMsg({ text: 'Task updated — the lecturer has been notified.', ok: true })
      setTask((t: any) => ({ ...t, priority: taskPriority, deadline: taskDeadline || null }))
    } catch(e:any) { setMsg({ text: e.response?.data?.message ?? 'Error updating task.', ok: false }) }
    finally { setApplying(false) }
  }

  // Remove the task from the lecturer entirely (cancels the assignment)
  async function removeTask() {
    if (!task) return
    if (!confirm(`Remove "${task.title}" from ${selected?.lecturer_name}?\n\nThe assignment will be cancelled and no longer count towards their workload.`)) return
    setApplying(true)
    try {
      await api.put(`/assignments/${task.id}`, { status: 'cancelled' })
      setMsg({ text: 'Task removed from the lecturer — they have been notified.', ok: true })
      setTask((t: any) => ({ ...t, status: 'cancelled' }))
    } catch(e:any) { setMsg({ text: e.response?.data?.message ?? 'Error removing task.', ok: false }) }
    finally { setApplying(false) }
  }

  async function resolve(status:'reviewed'|'resolved') {
    if (!selected) return
    try {
      await api.patch(`/appeals/${selected.id}`, { status, review_note: note })
      setMsg({ text: `Appeal ${status}.`, ok: true })
      setSelected(null); setNote(''); setTask(null); load()
    } catch(e:any) { setMsg({ text: e.response?.data?.message ?? 'Error', ok: false }) }
  }

  const STATUS_COLOR: Record<string,string> = {
    pending:'bg-amber-100 text-amber-700', reviewed:'bg-blue-100 text-blue-700', resolved:'bg-green-100 text-green-700'
  }

  return (
    <DashboardLayout requiredRole="department_head">
      <h1 className="text-2xl font-heading font-bold mb-2">Workload Appeals</h1>
      <p className="text-[var(--muted)] text-sm mb-6">Review appeals submitted by lecturers in your department</p>

      {msg && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm ${msg.ok?'bg-green-500/10 border border-green-500/30 text-green-600':'bg-red-500/10 border border-red-500/30 text-red-500'}`}>
          {msg.text}
        </div>
      )}

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-[var(--border)]">
            {['Lecturer','Assignment','Reason','Status','Submitted','Action'].map(h=>(
              <th key={h} className="text-left py-3 px-4 text-[var(--muted)] font-medium">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {appeals.map((a:any) => (
              <tr key={a.id} className="border-b border-[var(--border)]/50 hover:bg-[var(--bg)]/50">
                <td className="py-3 px-4 font-medium">{a.lecturer_name}</td>
                <td className="py-3 px-4 text-[var(--muted)]">{a.assignment_title ?? '—'}</td>
                <td className="py-3 px-4 max-w-[220px] truncate text-[var(--muted)]">{a.reason}</td>
                <td className="py-3 px-4"><span className={`badge ${STATUS_COLOR[a.status]}`}>{a.status}</span></td>
                <td className="py-3 px-4 text-[var(--muted)]">{new Date(a.created_at).toLocaleDateString()}</td>
                <td className="py-3 px-4">
                  {a.status === 'pending' && (
                    <button onClick={() => openReview(a)}
                      className="text-xs text-indigo-500 hover:underline">Review</button>
                  )}
                </td>
              </tr>
            ))}
            {appeals.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-[var(--muted)]">No appeals found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`glass-card w-full ${selected.assignment_id ? 'max-w-md' : 'max-w-lg'} p-6 relative max-h-[90vh] overflow-y-auto`}>
            <button onClick={() => { setSelected(null); setTask(null) }} className="absolute top-4 right-4 text-[var(--muted)]"><HiOutlineXMark size={18}/></button>
            <h2 className="font-heading font-semibold text-lg mb-1">Review Appeal</h2>
            <p className="text-sm text-[var(--muted)] mb-3">From: <strong>{selected.lecturer_name}</strong></p>
            <div className="bg-[var(--bg)] rounded-xl p-3 mb-4 text-sm">{selected.reason}</div>

            {/* Remedial actions on the appealed assignment */}
            {selected.assignment_id && task && (
              <div className="border border-[var(--border)] rounded-xl p-4 mb-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-0.5">Appealed Task</p>
                    <p className="text-sm font-semibold truncate">{task.title}</p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      {task.estimated_hours}h · current deadline: {task.deadline ?? '—'}
                    </p>
                  </div>
                  <span className={`badge shrink-0 text-[10px] ${
                    task.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>{task.status.replace('_',' ')}</span>
                </div>

                {task.status === 'cancelled' ? (
                  <p className="text-xs text-red-500 font-medium">This task has been removed from the lecturer's workload.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">Priority</label>
                        <select value={taskPriority} onChange={e=>setTaskPriority(e.target.value)} className="input py-2 text-sm">
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">Extend Deadline</label>
                        <input type="date" min={today} value={taskDeadline} onChange={e=>setTaskDeadline(e.target.value)} className="input py-2 text-sm"/>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={applyTaskChanges} disabled={applying}
                        className="btn-secondary flex-1 justify-center text-xs py-2">
                        {applying ? 'Applying…' : 'Apply Changes'}
                      </button>
                      <button type="button" onClick={removeTask} disabled={applying}
                        className="flex-1 px-3 py-2 rounded-xl border border-red-300 text-red-600 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-900/20">
                        Remove Task from Lecturer
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
            {selected.assignment_id && !task && (
              <p className="text-xs text-[var(--muted)] mb-4">Loading appealed task details…</p>
            )}

            {/* General appeal → all active tasks of this lecturer, each adjustable */}
            {!selected.assignment_id && (
              <div className="border border-[var(--border)] rounded-xl p-4 mb-4">
                <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
                  {selected.lecturer_name}&apos;s Active Tasks ({tasks.length})
                </p>

                {tasks.length === 0 ? (
                  <p className="text-xs text-[var(--muted)]">This lecturer has no active tasks.</p>
                ) : (
                  <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                    {tasks.map((t: any) => (
                      <div key={t.id} className="bg-[var(--bg)] rounded-xl p-3 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{t.title}</p>
                            <p className="text-[11px] text-[var(--muted)] mt-0.5">
                              {t.estimated_hours}h · deadline: {t.deadline ?? '—'}
                            </p>
                          </div>
                          <span className={`badge shrink-0 text-[10px] ${
                            t.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                          }`}>{t.status.replace('_',' ')}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <select value={t._priority} onChange={e=>setTaskField(t.id, '_priority', e.target.value)} className="input py-1.5 text-xs">
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                          <input type="date" min={today} value={t._deadline} onChange={e=>setTaskField(t.id, '_deadline', e.target.value)} className="input py-1.5 text-xs"/>
                        </div>

                        <div className="flex gap-2">
                          <button type="button" onClick={() => applyRowChanges(t)} disabled={applying}
                            className="btn-secondary flex-1 justify-center text-[11px] py-1.5">
                            Apply Changes
                          </button>
                          <button type="button" onClick={() => removeRowTask(t)} disabled={applying}
                            className="flex-1 px-2 py-1.5 rounded-lg border border-red-300 text-red-600 text-[11px] font-semibold hover:bg-red-50 dark:hover:bg-red-900/20">
                            Remove from Lecturer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1.5">Review Note (optional)</label>
              <textarea value={note} onChange={e=>setNote(e.target.value)} className="input" rows={3} placeholder="Your response…"/>
            </div>
            <div className="flex gap-3">
              <button onClick={() => resolve('reviewed')} className="btn-secondary flex-1 justify-center">Mark Reviewed</button>
              <button onClick={() => resolve('resolved')} className="btn-primary flex-1 justify-center">Resolve</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
