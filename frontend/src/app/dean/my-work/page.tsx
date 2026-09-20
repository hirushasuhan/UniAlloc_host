'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import DeadlineAlerts from '@/components/ui/DeadlineAlerts'
import { api } from '@/lib/api'
import { getUser } from '@/lib/auth'
import {
  HiOutlineBriefcase,
  HiOutlinePaperAirplane,
  HiOutlinePlus,
  HiOutlineXMark,
  HiOutlineCheckCircle,
  HiOutlineClipboardDocumentList,
} from 'react-icons/hi2'
import ConfirmCompletionModal from '@/components/ui/ConfirmCompletionModal'

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high:   'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low:    'bg-slate-100 text-slate-700',
}

export default function DeanMyWorkPage() {
  const user = getUser()
  const [assignments, setAssignments] = useState<any[]>([])
  const [updating,    setUpdating]    = useState<number | null>(null)
  const [pct,         setPct]         = useState(0)
  const [note,        setNote]        = useState('')
  const [msg,         setMsg]         = useState<{ text: string; ok: boolean } | null>(null)
  const [activeTab,   setActiveTab]   = useState<'active' | 'completed'>('active')
  const [confirmModal, setConfirmModal] = useState<{ id: number; title: string; pct: number; note: string } | null>(null)
  const [savingProgress, setSavingProgress] = useState(false)

  // Self-allocation modal
  const [showSelf, setShowSelf] = useState(false)
  const [selfSaving, setSelfSaving] = useState(false)
  const [selfForm, setSelfForm] = useState({
    title: '', description: '', priority: 'medium', estimated_hours: '4', deadline: ''
  })
  const today = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()

  const load = () =>
    api.get('/assignments?my=1').then(r => setAssignments(r.data.data ?? []))

  useEffect(() => { load() }, [])

  async function createSelfTask(e: React.FormEvent) {
    e.preventDefault(); setSelfSaving(true)
    try {
      await api.post('/assignments', {
        title:           selfForm.title,
        description:     selfForm.description || null,
        assigned_to:     user?.id,
        priority:        selfForm.priority,
        estimated_hours: parseFloat(selfForm.estimated_hours) || 4,
        deadline:        selfForm.deadline || null,
      })
      setMsg({ text: 'Task allocated to yourself — it now counts towards your workload.', ok: true })
      setShowSelf(false)
      setSelfForm({ title: '', description: '', priority: 'medium', estimated_hours: '4', deadline: '' })
      load()
    } catch (e: any) {
      setMsg({ text: e.response?.data?.message ?? 'Error', ok: false })
    } finally { setSelfSaving(false) }
  }

  async function executeSaveProgress(id: number, savePct: number, saveNote: string) {
    setSavingProgress(true)
    setMsg(null)
    try {
      await api.patch(`/assignments/${id}/progress`, { progress_percent: savePct, note: saveNote })
      setMsg({ text: 'Progress updated.', ok: true })
      setUpdating(null)
      setConfirmModal(null)
      load()
    } catch (e: any) {
      setMsg({ text: e.response?.data?.message ?? 'Error', ok: false })
    } finally {
      setSavingProgress(false)
    }
  }

  async function saveProgress(id: number) {
    if (pct === 100) {
      const assignment = assignments.find(a => a.id === id)
      setConfirmModal({ id, title: assignment?.title || '', pct, note })
      return
    }
    await executeSaveProgress(id, pct, note)
  }

  const active    = assignments.filter(a => a.status !== 'completed' && a.status !== 'cancelled')
  const completed = assignments.filter(a => a.status === 'completed')

  return (
    <DashboardLayout requiredRole="dean">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
            <HiOutlineBriefcase size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold">My Work</h1>
            <p className="text-[var(--muted)] text-sm">
              {active.length} active · {completed.length} completed
            </p>
          </div>
        </div>
        <button onClick={() => setShowSelf(true)} className="btn-primary">
          <HiOutlinePlus size={16}/> Allocate Work to Myself
        </button>
      </div>

      {msg && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm ${msg.ok
          ? 'bg-green-500/10 border border-green-500/30 text-green-600'
          : 'bg-red-500/10 border border-red-500/30 text-red-500'}`}>
          {msg.text}
        </div>
      )}

      {/* Overdue & approaching-deadline alerts for my own work (read-only) */}
      <DeadlineAlerts assignments={assignments} onChanged={load} mode="view" />

      {assignments.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <HiOutlineBriefcase size={32} className="mx-auto text-[var(--muted)] mb-3 opacity-40" />
          <p className="text-[var(--muted)]">No assignments have been assigned to you yet.</p>
        </div>
      ) : (
        <>
          {/* Tab Navigation */}
          <div className="flex border-b border-[var(--border)] mb-6 gap-2">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex items-center gap-2 px-5 py-3 font-medium text-sm border-b-2 transition-all ${
                activeTab === 'active'
                  ? 'border-violet-500 text-violet-600 dark:text-violet-400 font-semibold'
                  : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <HiOutlineClipboardDocumentList size={17} />
              <span>Active Assignments</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  activeTab === 'active'
                    ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
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
                  ? 'border-violet-500 text-violet-600 dark:text-violet-400 font-semibold'
                  : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <HiOutlineCheckCircle size={17} />
              <span>Completed Assignments</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  activeTab === 'completed'
                    ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
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
                    onUpdate={() => { setUpdating(a.id); setPct(a.latest_progress ?? 0); setNote('') }}
                    onPctChange={setPct}
                    onNoteChange={setNote}
                    onSave={() => saveProgress(a.id)}
                    onCancel={() => setUpdating(null)}
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
                    onUpdate={() => { setUpdating(a.id); setPct(a.latest_progress ?? 100); setNote('') }}
                    onPctChange={setPct}
                    onNoteChange={setNote}
                    onSave={() => saveProgress(a.id)}
                    onCancel={() => setUpdating(null)}
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

      {/* ---- Self-Allocation Modal ---- */}
      {showSelf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-md p-6 relative">
            <button onClick={() => setShowSelf(false)} className="absolute top-4 right-4 text-[var(--muted)]">
              <HiOutlineXMark size={18}/>
            </button>
            <h2 className="font-heading font-semibold text-lg mb-1">Allocate Work to Myself</h2>
            <p className="text-xs text-[var(--muted)] mb-5">This task will appear in My Work and count towards your weekly capacity.</p>
            <form onSubmit={createSelfTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input value={selfForm.title} onChange={e=>setSelfForm(f=>({...f,title:e.target.value}))} className="input" required placeholder="e.g. Curriculum review"/>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={selfForm.description} onChange={e=>setSelfForm(f=>({...f,description:e.target.value}))} className="input" rows={2} placeholder="Optional details…"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select value={selfForm.priority} onChange={e=>setSelfForm(f=>({...f,priority:e.target.value}))} className="input">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Est. Hours</label>
                  <input type="number" min="0.5" step="0.5" value={selfForm.estimated_hours} onChange={e=>setSelfForm(f=>({...f,estimated_hours:e.target.value}))} className="input"/>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Deadline</label>
                  <input type="date" min={today} value={selfForm.deadline} onChange={e=>setSelfForm(f=>({...f,deadline:e.target.value}))} className="input"/>
                </div>
              </div>
              <button type="submit" disabled={selfSaving} className="btn-primary w-full justify-center">
                {selfSaving ? 'Allocating…' : 'Allocate Task'}
              </button>
            </form>
          </div>
        </div>
      )}

      <ConfirmCompletionModal
        isOpen={!!confirmModal}
        taskTitle={confirmModal?.title}
        loading={savingProgress}
        onConfirm={() => {
          if (confirmModal) {
            executeSaveProgress(confirmModal.id, confirmModal.pct, confirmModal.note)
          }
        }}
        onCancel={() => setConfirmModal(null)}
      />
    </DashboardLayout>
  )
}

function AssignmentCard({ a, updating, pct, note, onUpdate, onPctChange, onNoteChange, onSave, onCancel }: any) {
  const PRIORITY_COLOR: Record<string, string> = {
    urgent: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700',
    medium: 'bg-amber-100 text-amber-700', low: 'bg-slate-100 text-slate-700',
  }
  const isCancelled = a.status === 'cancelled'

  return (
    <div className={`glass-card p-5 ${a.status === 'completed' || isCancelled ? 'opacity-75' : ''}`}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`badge text-xs ${PRIORITY_COLOR[a.priority] ?? ''}`}>{a.priority}</span>
            {a.deadline && <span className="text-xs text-[var(--muted)]">Due: {a.deadline}</span>}
          </div>
          <h3 className="font-semibold">{a.title}</h3>
          {a.description && <p className="text-sm text-[var(--muted)] mt-1">{a.description}</p>}
          <p className="text-xs text-[var(--muted)] mt-1">
            Assigned by: {a.assigned_by_name} · {a.estimated_hours}h estimated
          </p>
        </div>
        <span className={`badge flex-shrink-0 ${
          a.status === 'completed'  ? 'bg-green-100 text-green-700' :
          a.status === 'in_progress'? 'bg-blue-100 text-blue-700'  :
                                      'bg-amber-100 text-amber-700'
        }`}>
          {a.status.replace('_', ' ')}
        </span>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-2.5 rounded-full bg-[var(--border)]">
          <div className="h-2.5 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all"
            style={{ width: `${a.latest_progress ?? (a.status === 'completed' ? 100 : 0)}%` }} />
        </div>
        <span className="text-sm font-medium w-10 text-right">{a.latest_progress ?? (a.status === 'completed' ? 100 : 0)}%</span>
      </div>

      {/* Progress update form */}
      {!isCancelled && (
        updating === a.id ? (
          <div className="space-y-3 bg-[var(--bg)] rounded-xl p-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Progress: {pct}% {pct === 100 && '(Completed)'}
              </label>
              <input type="range" min={0} max={100} step={5} value={pct}
                onChange={e => onPctChange(+e.target.value)}
                className="w-full accent-violet-500" />
            </div>
            <textarea placeholder="Add a note (optional)…" rows={2}
              value={note} onChange={e => onNoteChange(e.target.value)}
              className="input text-sm" />
            <div className="flex gap-2">
              <button onClick={onSave} className="btn-primary text-sm py-2 px-4">Save</button>
              <button onClick={onCancel} className="btn-secondary text-sm py-2 px-4">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={onUpdate} className="text-sm text-violet-500 hover:underline font-medium">
            {a.status === 'completed' ? 'Adjust progress / status ↺' : 'Update progress →'}
          </button>
        )
      )}
    </div>
  )
}
