'use client'
import { useState } from 'react'
import { api } from '@/lib/api'
import { HiOutlineExclamationTriangle, HiOutlineClock, HiOutlineTrash, HiOutlineCalendarDays, HiOutlineXMark, HiOutlineHandRaised } from 'react-icons/hi2'

// Statuses that mean the lecturer has nothing left to do → never "overdue"
const DONE = new Set(['completed', 'cancelled', 'review_pending'])
const DUE_SOON_DAYS = 3

function startOfToday(): Date {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d
}
function daysUntil(deadline: string): number {
  const d = new Date(deadline + 'T00:00:00')
  return Math.round((d.getTime() - startOfToday().getTime()) / 86400000)
}
function fmt(deadline: string): string {
  try { return new Date(deadline + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) }
  catch { return deadline }
}

interface Props {
  assignments: any[]
  onChanged: () => void
  // 'manage' → dean / department head managing others' work (Extend & warn, Delete)
  // 'appeal' → lecturer viewing their own work (Appeal)
  // 'view'   → dean / department head viewing their OWN work (read-only, no actions)
  mode?: 'manage' | 'appeal' | 'view'
}

export default function DeadlineAlerts({ assignments, onChanged, mode = 'manage' }: Props) {
  const [extendFor,   setExtendFor]   = useState<any | null>(null)
  const [appealFor,   setAppealFor]   = useState<any | null>(null)
  const [newDeadline, setNewDeadline] = useState('')
  const [message,     setMessage]     = useState('')
  const [reason,      setReason]      = useState('')
  const [busy,        setBusy]        = useState(false)
  const [err,         setErr]         = useState('')
  const [notice,      setNotice]      = useState<{ text: string; ok: boolean } | null>(null)

  const active  = (assignments ?? []).filter(a => a.deadline && !DONE.has(a.status))
  const overdue = active.filter(a => daysUntil(a.deadline) < 0)
                        .sort((a, b) => daysUntil(a.deadline) - daysUntil(b.deadline))
  const dueSoon = active.filter(a => { const d = daysUntil(a.deadline); return d >= 0 && d <= DUE_SOON_DAYS })
                        .sort((a, b) => daysUntil(a.deadline) - daysUntil(b.deadline))

  if (overdue.length === 0 && dueSoon.length === 0) return null

  const todayISO = startOfToday().toISOString().slice(0, 10)

  function openExtend(a: any) { setErr(''); setMessage(''); setNewDeadline(''); setExtendFor(a) }
  function openAppeal(a: any) { setErr(''); setReason(''); setAppealFor(a) }

  async function confirmExtend() {
    if (!extendFor) return
    if (!newDeadline)           { setErr('Please pick a new deadline.'); return }
    if (newDeadline < todayISO) { setErr('Deadline cannot be in the past.'); return }
    setBusy(true); setErr('')
    try {
      await api.put(`/assignments/${extendFor.id}`, {
        deadline: newDeadline,
        notify_message: message.trim() || undefined,
      })
      setNotice({ text: `Deadline extended for "${extendFor.title}" — the lecturer was notified.`, ok: true })
      setExtendFor(null)
      onChanged()
    } catch (e: any) {
      setErr(e.response?.data?.message ?? 'Failed to extend the deadline.')
    } finally { setBusy(false) }
  }

  async function submitAppeal() {
    if (!appealFor) return
    if (!reason.trim()) { setErr('Please describe the reason for your appeal.'); return }
    setBusy(true); setErr('')
    try {
      await api.post('/appeals', { assignment_id: appealFor.id, reason: reason.trim() })
      setNotice({ text: `Appeal submitted for "${appealFor.title}". Your department head will review it.`, ok: true })
      setAppealFor(null)
      onChanged()
    } catch (e: any) {
      setErr(e.response?.data?.message ?? 'Failed to submit the appeal.')
    } finally { setBusy(false) }
  }

  async function del(a: any) {
    if (!confirm(`Delete assignment "${a.title}"?\n\nThis removes it from ${a.assigned_to_name ?? 'the lecturer'}'s workload.`)) return
    setBusy(true)
    try {
      await api.delete(`/assignments/${a.id}`)
      setNotice({ text: `Assignment "${a.title}" was removed.`, ok: true })
      onChanged()
    } catch (e: any) {
      setNotice({ text: e.response?.data?.message ?? 'Failed to delete the assignment.', ok: false })
    } finally { setBusy(false) }
  }

  const priorityDot = (p: string) => (({
    urgent: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-amber-500', low: 'bg-slate-400',
  }) as Record<string, string>)[p] ?? 'bg-slate-400'

  // Assignee name only makes sense for managers; a lecturer is looking at their own work
  const who = (a: any) => (mode === 'manage' && a.assigned_to_name) ? `${a.assigned_to_name} · ` : ''

  const actions = (a: any) => {
    if (mode === 'view') return null
    if (mode === 'appeal') {
      return (
        <button onClick={() => openAppeal(a)} disabled={busy}
          className="btn-secondary text-xs py-1.5 px-2.5 inline-flex items-center gap-1.5 shrink-0">
          <HiOutlineHandRaised size={14}/> Appeal
        </button>
      )
    }
    // manage mode
    return (
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={() => openExtend(a)} disabled={busy}
          className="btn-secondary text-xs py-1.5 px-2.5 inline-flex items-center gap-1.5">
          <HiOutlineCalendarDays size={14}/> Extend{a._overdue ? ' & warn' : ''}
        </button>
        {a._overdue && (
          <button onClick={() => del(a)} disabled={busy} title="Delete assignment"
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20">
            <HiOutlineTrash size={14}/>
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="mb-8 space-y-4">
      {notice && (
        <div className={`rounded-xl px-4 py-2.5 text-sm border ${notice.ok ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
          {notice.text}
        </div>
      )}

      {/* Overdue */}
      {overdue.length > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/[0.07] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-red-500/20 text-red-600 dark:text-red-400 font-semibold text-sm">
            <HiOutlineExclamationTriangle size={18}/> Overdue assignments ({overdue.length})
          </div>
          <div className="divide-y divide-[var(--border)]/40">
            {overdue.map(a => {
              const late = Math.abs(daysUntil(a.deadline))
              return (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${priorityDot(a.priority)}`} />
                      <span className="font-medium truncate">{a.title}</span>
                    </div>
                    <div className="text-xs text-[var(--muted)] mt-0.5">
                      {who(a)}due {fmt(a.deadline)} ·{' '}
                      <span className="text-red-500 font-medium">{late} day{late === 1 ? '' : 's'} overdue</span>
                    </div>
                  </div>
                  {actions({ ...a, _overdue: true })}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Due soon */}
      {dueSoon.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.07] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold text-sm">
            <HiOutlineClock size={18}/> Deadlines approaching ({dueSoon.length})
          </div>
          <div className="divide-y divide-[var(--border)]/40">
            {dueSoon.map(a => {
              const left = daysUntil(a.deadline)
              return (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${priorityDot(a.priority)}`} />
                      <span className="font-medium truncate">{a.title}</span>
                    </div>
                    <div className="text-xs text-[var(--muted)] mt-0.5">
                      {who(a)}due {fmt(a.deadline)} ·{' '}
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        {left === 0 ? 'due today' : `${left} day${left === 1 ? '' : 's'} left`}
                      </span>
                    </div>
                  </div>
                  {actions({ ...a, _overdue: false })}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Extend modal (manage mode) */}
      {extendFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--card-solid)] shadow-2xl rounded-2xl border border-[var(--border)] w-full max-w-md p-6 relative">
            <button onClick={() => setExtendFor(null)} className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--text)]">
              <HiOutlineXMark size={20}/>
            </button>
            <h2 className="font-heading font-semibold text-lg mb-1">Extend deadline</h2>
            <p className="text-sm text-[var(--muted)] mb-4 truncate">{extendFor.title} · {extendFor.assigned_to_name ?? ''}</p>

            <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">New deadline *</label>
            <input type="date" value={newDeadline} min={todayISO} onChange={e => setNewDeadline(e.target.value)} className="input mb-4" />

            <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Warning message to lecturer</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
              placeholder="e.g. This task is overdue. Please prioritise and complete it by the new date."
              className="input mb-2 resize-none" />
            <p className="text-[11px] text-[var(--muted)] mb-4">The lecturer is always notified of the new deadline; add a note for extra context.</p>

            {err && <div className="mb-4 text-sm text-red-500 bg-red-500/10 rounded-xl px-3 py-2 border border-red-500/20">{err}</div>}

            <div className="flex gap-2">
              <button onClick={confirmExtend} disabled={busy || !newDeadline}
                className="btn-primary flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed">
                {busy ? 'Saving…' : 'Extend & notify'}
              </button>
              <button onClick={() => setExtendFor(null)} disabled={busy} className="btn-secondary flex-1 justify-center">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Appeal modal (appeal mode) */}
      {appealFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--card-solid)] shadow-2xl rounded-2xl border border-[var(--border)] w-full max-w-md p-6 relative">
            <button onClick={() => setAppealFor(null)} className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--text)]">
              <HiOutlineXMark size={20}/>
            </button>
            <h2 className="font-heading font-semibold text-lg mb-1">Appeal this assignment</h2>
            <p className="text-sm text-[var(--muted)] mb-4 truncate">{appealFor.title} · due {fmt(appealFor.deadline)}</p>

            <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Reason for appeal *</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4}
              placeholder="Explain why you cannot meet this deadline (e.g. overloaded, unrealistic scope, on leave)…"
              className="input mb-2 resize-none" />
            <p className="text-[11px] text-[var(--muted)] mb-4">Your appeal is sent to your Department Head for review.</p>

            {err && <div className="mb-4 text-sm text-red-500 bg-red-500/10 rounded-xl px-3 py-2 border border-red-500/20">{err}</div>}

            <div className="flex gap-2">
              <button onClick={submitAppeal} disabled={busy || !reason.trim()}
                className="btn-primary flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed">
                {busy ? 'Submitting…' : 'Submit appeal'}
              </button>
              <button onClick={() => setAppealFor(null)} disabled={busy} className="btn-secondary flex-1 justify-center">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
