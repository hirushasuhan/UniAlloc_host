'use client'
import { useState } from 'react'
import { api } from '@/lib/api'
import { 
  HiOutlineExclamationTriangle, 
  HiOutlineClock, 
  HiOutlineTrash, 
  HiOutlineCalendarDays, 
  HiOutlineXMark, 
  HiOutlineHandRaised,
  HiOutlineChevronDown,
  HiOutlineChevronUp
} from 'react-icons/hi2'

// Statuses that mean the lecturer has nothing left to do → never "overdue"
const DONE = new Set(['completed', 'cancelled', 'review_pending'])
const DUE_SOON_DAYS = 3

function startOfToday(): Date {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d
}
function parseDate(deadline: string): Date {
  const clean = (deadline || '').trim().split(' ')[0].split('T')[0]
  const [y, m, d] = clean.split('-').map(Number)
  if (!y || !m || !d) return new Date(NaN)
  return new Date(y, m - 1, d)
}
function daysUntil(deadline: string): number {
  const d = parseDate(deadline)
  if (isNaN(d.getTime())) return 0
  return Math.round((d.getTime() - startOfToday().getTime()) / 86400000)
}
function fmt(deadline: string): string {
  try {
    const d = parseDate(deadline)
    if (isNaN(d.getTime())) return deadline
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch { return deadline }
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
  const [extendFor,       setExtendFor]       = useState<any | null>(null)
  const [appealFor,       setAppealFor]       = useState<any | null>(null)
  const [newDeadline,     setNewDeadline]     = useState('')
  const [message,         setMessage]         = useState('')
  const [reason,          setReason]          = useState('')
  const [busy,            setBusy]            = useState(false)
  const [err,             setErr]             = useState('')
  const [notice,          setNotice]          = useState<{ text: string; ok: boolean } | null>(null)
  const [showAllOverdue,  setShowAllOverdue]  = useState(false)

  const active  = (assignments ?? []).filter(a => a.deadline && !DONE.has(a.status))
  const overdue = active.filter(a => daysUntil(a.deadline) < 0)
                        .sort((a, b) => {
                          const diff = daysUntil(b.deadline) - daysUntil(a.deadline)
                          if (diff !== 0) return diff
                          return (b.id ?? 0) - (a.id ?? 0)
                        })
  const dueSoon = active.filter(a => { const d = daysUntil(a.deadline); return d >= 0 && d <= DUE_SOON_DAYS })
                        .sort((a, b) => daysUntil(a.deadline) - daysUntil(b.deadline))

  if (overdue.length === 0 && dueSoon.length === 0) return null

  const hasMoreOverdue = overdue.length > 3
  const visibleOverdue = showAllOverdue ? overdue : overdue.slice(0, 3)

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

  const priorityBadge = (p: string) => {
    switch (p) {
      case 'urgent':
        return 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30'
      case 'high':
        return 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30'
      case 'medium':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
      case 'low':
      default:
        return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30'
    }
  }

  // Assignee name only makes sense for managers; a lecturer is looking at their own work
  const who = (a: any) => (mode === 'manage' && a.assigned_to_name) ? a.assigned_to_name : ''

  const actions = (a: any) => {
    if (mode === 'view') return null
    if (mode === 'appeal') {
      return (
        <button onClick={() => openAppeal(a)} disabled={busy}
          className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 shrink-0 rounded-xl hover:border-accent hover:text-accent shadow-sm active:scale-95">
          <HiOutlineHandRaised size={14}/> Appeal
        </button>
      )
    }
    // manage mode
    return (
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={() => openExtend(a)} disabled={busy}
          className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 shrink-0 rounded-xl hover:border-accent hover:text-accent shadow-sm active:scale-95">
          <HiOutlineCalendarDays size={14} className="text-red-500"/>
          <span>Extend{a._overdue ? ' & warn' : ''}</span>
        </button>
        {a._overdue && (
          <button onClick={() => del(a)} disabled={busy} title="Delete assignment"
            className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 active:scale-95 transition-all">
            <HiOutlineTrash size={14}/>
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="mb-8 space-y-5">
      {notice && (
        <div className={`rounded-xl px-4 py-2.5 text-sm border ${notice.ok ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
          {notice.text}
        </div>
      )}

      {/* Overdue */}
      {overdue.length > 0 && (
        <div className="relative rounded-2xl p-4 sm:p-5 bg-gradient-to-b from-red-500/[0.08] via-red-500/[0.03] to-transparent dark:from-red-950/40 dark:via-red-950/20 dark:to-transparent/10 border border-red-500/20 dark:border-red-500/30 backdrop-blur-md shadow-xl shadow-red-500/[0.03]">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-500/15 dark:bg-red-500/25 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 ring-1 ring-red-500/20 shadow-inner">
                <HiOutlineExclamationTriangle size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-semibold text-sm text-[var(--text)] tracking-tight">
                    Overdue Assignments
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/25">
                    {overdue.length}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--muted)]">
                  Assignments past deadline that require immediate review
                </p>
              </div>
            </div>

            {hasMoreOverdue && (
              <span className="text-xs font-medium text-[var(--muted)] hidden sm:inline-block">
                {showAllOverdue ? `Showing all ${overdue.length}` : `Showing latest 3 of ${overdue.length}`}
              </span>
            )}
          </div>

          {/* Cards List with Fade Effect */}
          <div className="relative">
            <div className="space-y-2.5">
              {visibleOverdue.map(a => {
                const late = Math.abs(daysUntil(a.deadline))
                const assignee = who(a)
                return (
                  <div
                    key={a.id}
                    className="group relative flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[var(--card)] hover:bg-[var(--card-solid)] border border-[var(--border)] hover:border-red-500/30 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${priorityBadge(a.priority)}`}>
                          {a.priority || 'medium'}
                        </span>
                        <span className="font-medium text-sm text-[var(--text)] group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors truncate">
                          {a.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--muted)] mt-1.5 flex-wrap">
                        {assignee && (
                          <>
                            <span className="font-medium text-[var(--text)]/80">{assignee}</span>
                            <span className="text-[var(--muted)]/50">•</span>
                          </>
                        )}
                        <span>Due {fmt(a.deadline)}</span>
                        <span className="text-[var(--muted)]/50">•</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-red-600 dark:text-red-400">
                          <HiOutlineClock size={12} />
                          {late} day{late === 1 ? '' : 's'} overdue
                        </span>
                      </div>
                    </div>

                    {actions({ ...a, _overdue: true })}
                  </div>
                )
              })}
            </div>

            {/* Bottom fade gradient overlay */}
            {!showAllOverdue && hasMoreOverdue && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-[var(--bg)]/90 via-[var(--bg)]/50 to-transparent dark:from-[var(--bg)] dark:via-[var(--bg)]/60 rounded-b-xl"
              />
            )}
          </div>

          {/* See more / Show less toggle */}
          {hasMoreOverdue && (
            <div className="mt-3.5 flex justify-center">
              <button
                type="button"
                onClick={() => setShowAllOverdue(!showAllOverdue)}
                className="group inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 active:scale-95 border border-red-500/25 transition-all shadow-sm hover:shadow cursor-pointer"
              >
                <span>
                  {showAllOverdue ? 'Show less' : `See more (${overdue.length - 3} more overdue)`}
                </span>
                <HiOutlineChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${showAllOverdue ? 'rotate-180' : 'group-hover:translate-y-0.5'}`}
                />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Due soon */}
      {dueSoon.length > 0 && (
        <div className="relative rounded-2xl p-4 sm:p-5 bg-gradient-to-b from-amber-500/[0.08] via-amber-500/[0.03] to-transparent dark:from-amber-950/40 dark:via-amber-950/20 dark:to-transparent/10 border border-amber-500/20 dark:border-amber-500/30 backdrop-blur-md shadow-xl shadow-amber-500/[0.03]">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 dark:bg-amber-500/25 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 ring-1 ring-amber-500/20 shadow-inner">
                <HiOutlineClock size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-semibold text-sm text-[var(--text)] tracking-tight">
                    Deadlines Approaching
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                    {dueSoon.length}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--muted)]">
                  Upcoming assignments due in the next 3 days
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {dueSoon.map(a => {
              const left = daysUntil(a.deadline)
              const assignee = who(a)
              return (
                <div
                  key={a.id}
                  className="group relative flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[var(--card)] hover:bg-[var(--card-solid)] border border-[var(--border)] hover:border-amber-500/30 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${priorityBadge(a.priority)}`}>
                        {a.priority || 'medium'}
                      </span>
                      <span className="font-medium text-sm text-[var(--text)] group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate">
                        {a.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--muted)] mt-1.5 flex-wrap">
                      {assignee && (
                        <>
                          <span className="font-medium text-[var(--text)]/80">{assignee}</span>
                          <span className="text-[var(--muted)]/50">•</span>
                        </>
                      )}
                      <span>Due {fmt(a.deadline)}</span>
                      <span className="text-[var(--muted)]/50">•</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                        <HiOutlineClock size={12} />
                        {left === 0 ? 'Due today' : `${left} day${left === 1 ? '' : 's'} left`}
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
