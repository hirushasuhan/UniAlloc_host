'use client'
import { useEffect, useState, FormEvent } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { api } from '@/lib/api'
import { getUser } from '@/lib/auth'
import { HiOutlineCheckCircle, HiOutlineXCircle, HiOutlinePlus, HiOutlineXMark } from 'react-icons/hi2'
import TruncatedTitle from '@/components/ui/TruncatedTitle'

const STEP_LABEL: Record<string, string> = {
  pending_dean:      'Awaiting Dean Approval',
  pending_dept_head: 'Awaiting Dept Head',
  pending_assignee:  'Awaiting Acceptance',
  approved:          'Approved',
  rejected:          'Rejected',
}
const STEP_COLOR: Record<string, string> = {
  pending_dean:      'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  pending_dept_head: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20',
  pending_assignee:  'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
  approved:          'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
  rejected:          'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
}
const STEP_DOT: Record<string, string> = {
  pending_dean:      'bg-amber-400 animate-pulse',
  pending_dept_head: 'bg-sky-400 animate-pulse',
  pending_assignee:  'bg-indigo-400 animate-pulse',
  approved:          'bg-emerald-500',
  rejected:          'bg-rose-500',
}

export default function DeanRequestsPage() {
  const user = getUser()
  const [requests,   setRequests]   = useState<any[]>([])
  const [faculties,  setFaculties]  = useState<any[]>([])
  const [users,      setUsers]      = useState<any[]>([])
  const [showModal,  setShowModal]  = useState(false)
  const [msg,        setMsg]        = useState<{ text: string; ok: boolean } | null>(null)
  const [form, setForm] = useState({
    request_type: 'cross_faculty',
    target_faculty_id: '',
    target_user_id: '',
    title: '',
    description: '',
  })
  const [saving, setSaving] = useState(false)
  const [tabFilter, setTabFilter] = useState<'all' | 'cross_faculty' | 'approved' | 'pending'>('all')

  const load = () => api.get('/work-requests').then(r => setRequests(r.data.data ?? []))
  useEffect(() => {
    load()
    api.get('/faculties').then(r => setFaculties(r.data.data ?? []))
  }, [])

  // Cross-faculty requests can never target the dean's own faculty or themselves
  const otherFaculties = faculties.filter((f: any) => f.id !== user?.faculty_id)

  // When a target faculty is selected, load their users (excluding self)
  useEffect(() => {
    if (form.target_faculty_id) {
      api.get(`/users?faculty_id=${form.target_faculty_id}`)
        .then(r => setUsers((r.data.data ?? []).filter((u: any) => u.id !== user?.id)))
        .catch(() => setUsers([]))
    } else {
      setUsers([])
    }
  }, [form.target_faculty_id])

  async function act(id: number, action: 'approve' | 'accept' | 'reject') {
    try {
      await api.patch(`/work-requests/${id}`, { action })
      const labels: Record<string,string> = {
        approve: 'Request approved — forwarded to next step.',
        accept:  'Request accepted — assignment has been created.',
        reject:  'Request rejected.',
      }
      setMsg({ text: labels[action], ok: action !== 'reject' })
      load()
    } catch (e: any) {
      setMsg({ text: e.response?.data?.message ?? 'Error', ok: false })
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/work-requests', {
        request_type:   form.request_type,
        target_user_id: form.target_user_id || undefined,
        title:          form.title,
        description:    form.description,
      })
      setMsg({ text: 'Request submitted.', ok: true })
      setShowModal(false)
      setForm({ request_type: 'cross_faculty', target_faculty_id: '', target_user_id: '', title: '', description: '' })
      load()
    } catch (e: any) {
      setMsg({ text: e.response?.data?.message ?? 'Error', ok: false })
    } finally { setSaving(false) }
  }

  // 1. Requests needing my approval — ONLY if I am the dean of the TARGET faculty
  const toApprove = requests.filter(
    r => r.approval_step === 'pending_dean' && Number(r.target_faculty_id) === user?.faculty_id
  )
  // 2. Requests where I am the direct target and need to accept/reject
  const toAccept  = requests.filter(
    r => r.approval_step === 'pending_assignee' && Number(r.target_user_id) === user?.id
  )
  // 3. Everything else (submitted by me, already resolved, in other steps)
  const other = requests.filter(
    r => !(r.approval_step === 'pending_dean' && Number(r.target_faculty_id) === user?.faculty_id) &&
         !(r.approval_step === 'pending_assignee' && Number(r.target_user_id) === user?.id)
  )

  return (
    <DashboardLayout requiredRole="dean">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">Work Requests</h1>
          <p className="text-[var(--muted)] text-sm mt-1">
            {toApprove.length} pending approval · {toAccept.length} awaiting your acceptance
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <HiOutlinePlus size={16} /> New Request
        </button>
      </div>

      {msg && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm ${msg.ok
          ? 'bg-green-500/10 border border-green-500/30 text-green-600'
          : 'bg-red-500/10 border border-red-500/30 text-red-500'}`}>
          {msg.text}
        </div>
      )}

      {/* ---- Section 1: Approve / reject (dean of target faculty) ---- */}
      {toApprove.length > 0 && (
        <section className="mb-8">
          <h2 className="font-heading font-semibold mb-3">Awaiting Your Approval</h2>
          <div className="glass-card divide-y divide-[var(--border)]/50">
            {toApprove.map((r: any) => (
              <div key={r.id} className="p-5 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      <span>🌐</span>
                      <span>{r.request_type?.replace(/_/g, '-')}</span>
                    </span>
                    <span className="text-xs text-[var(--muted)]">
                      Target: <strong>{r.target_user_name ?? '—'}</strong>
                      {r.target_role && <> ({r.target_role.replace('_', ' ')})</>}
                    </span>
                  </div>
                  <p className="font-semibold">{r.title}</p>
                  {r.description && (
                    <p className="text-sm text-[var(--muted)] mt-1 line-clamp-2">{r.description}</p>
                  )}
                  <p className="text-xs text-[var(--muted)] mt-2">
                    From: <strong>{r.requester_name}</strong> · {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => act(r.id, 'approve')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-700 hover:bg-green-500/20 text-sm font-medium">
                    <HiOutlineCheckCircle size={14} /> Approve
                  </button>
                  <button onClick={() => act(r.id, 'reject')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-700 hover:bg-red-500/20 text-sm font-medium">
                    <HiOutlineXCircle size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---- Section 2: Accept / reject (dean is the direct target) ---- */}
      {toAccept.length > 0 && (
        <section className="mb-8">
          <h2 className="font-heading font-semibold mb-3">Awaiting Your Acceptance</h2>
          <div className="glass-card divide-y divide-[var(--border)]/50">
            {toAccept.map((r: any) => (
              <div key={r.id} className="p-5 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      <span>🌐</span>
                      <span>{r.request_type?.replace(/_/g, '-')}</span>
                    </span>
                    {r.dean_approver_name && (
                      <span className="text-xs text-green-600">Dean ✓</span>
                    )}
                    {r.dept_head_approver_name && (
                      <span className="text-xs text-green-600">Dept Head ✓</span>
                    )}
                  </div>
                  <p className="font-semibold">{r.title}</p>
                  {r.description && (
                    <p className="text-sm text-[var(--muted)] mt-1 line-clamp-2">{r.description}</p>
                  )}
                  <p className="text-xs text-[var(--muted)] mt-2">
                    Requested by: <strong>{r.requester_name}</strong>
                    &nbsp;· {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => act(r.id, 'accept')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-700 hover:bg-green-500/20 text-sm font-medium">
                    <HiOutlineCheckCircle size={14} /> Accept
                  </button>
                  <button onClick={() => act(r.id, 'reject')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-700 hover:bg-red-500/20 text-sm font-medium">
                    <HiOutlineXCircle size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---- Section 3: All other requests ---- */}
      {other.length > 0 && (() => {
        const filteredOther = other.filter((r: any) => {
          if (tabFilter === 'cross_faculty') return r.request_type === 'cross_faculty'
          if (tabFilter === 'approved') return r.approval_step === 'approved'
          if (tabFilter === 'pending') return r.approval_step !== 'approved'
          return true
        })

        return (
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="font-heading font-semibold text-lg">Cross-Faculty & All Requests</h2>
              <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[var(--card-solid)] border border-[var(--border)] text-xs">
                <button
                  type="button"
                  onClick={() => setTabFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    tabFilter === 'all'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  All ({other.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTabFilter('cross_faculty')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    tabFilter === 'cross_faculty'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  🌐 Cross-Faculty ({other.filter((r: any) => r.request_type === 'cross_faculty').length})
                </button>
                <button
                  type="button"
                  onClick={() => setTabFilter('approved')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    tabFilter === 'approved'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  In Progress & Completed ({other.filter((r: any) => r.approval_step === 'approved').length})
                </button>
                <button
                  type="button"
                  onClick={() => setTabFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    tabFilter === 'pending'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  Pending ({other.filter((r: any) => r.approval_step !== 'approved').length})
                </button>
              </div>
            </div>

            <div className="glass-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    {['Title', 'From', 'Target', 'Type', 'Status', 'Execution Progress', 'Date'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-[var(--muted)] font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredOther.map((r: any) => (
                    <tr key={r.id} className="border-b border-[var(--border)]/50 hover:bg-[var(--bg)]/50">
                      <td className="py-3 px-4 font-medium">
                        <TruncatedTitle title={r.title} subtitle={r.description} maxWidthClass="max-w-[200px] lg:max-w-[280px]" />
                      </td>
                      <td className="py-3 px-4 text-[var(--muted)] whitespace-nowrap">
                        {r.requester_id === user?.id ? (
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">You</span>
                        ) : (
                          r.requester_name
                        )}
                      </td>
                      <td className="py-3 px-4 text-[var(--muted)]">
                        <div>
                          <span className="font-medium text-[var(--text)]">
                            {r.target_user_id === user?.id ? 'You' : (r.target_user_name ?? r.target_faculty_name ?? '—')}
                          </span>
                          {Number(r.target_faculty_id) === Number(user?.faculty_id) && Number(r.requester_id) !== Number(user?.id) && (
                            <span className="inline-block text-[10px] ml-1.5 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold whitespace-nowrap">
                              Your Faculty Staff
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {r.request_type === 'cross_faculty' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-sm">
                            <span className="text-xs">🌐</span>
                            <span>Cross-Faculty</span>
                          </span>
                        ) : r.request_type === 'cross_department' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shadow-sm">
                            <span className="text-xs">🏛️</span>
                            <span>Cross-Dept</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                            {r.request_type?.replace(/_/g, '-')}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${STEP_COLOR[r.approval_step] ?? 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STEP_DOT[r.approval_step] ?? 'bg-zinc-400'}`} />
                          {STEP_LABEL[r.approval_step] ?? r.approval_step}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {r.approval_step === 'approved' ? (
                          <div className="flex flex-col gap-1 min-w-[140px]">
                            <div className="flex items-center justify-between text-xs">
                              <span className={`font-bold ${Number(r.latest_progress) === 100 ? 'text-green-600 dark:text-green-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                {r.latest_progress ?? 0}%
                              </span>
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                                {r.assignment_status?.replace('_', ' ') ?? 'assigned'}
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  Number(r.latest_progress) === 100
                                    ? 'bg-gradient-to-r from-emerald-500 to-green-500'
                                    : 'bg-gradient-to-r from-indigo-500 to-cyan-500'
                                }`}
                                style={{ width: `${Math.max(0, Math.min(100, Number(r.latest_progress ?? 0)))}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--muted)] italic">Awaiting approval</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[var(--muted)] whitespace-nowrap text-xs">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {filteredOther.length === 0 && (
                    <tr><td colSpan={7} className="py-8 text-center text-[var(--muted)]">No requests match this filter.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )
      })()}

      {requests.length === 0 && (
        <div className="glass-card p-8 text-center text-[var(--muted)]">No requests yet.</div>
      )}

      {/* ---- New Request Modal ---- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-md p-6 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-[var(--muted)]">
              <HiOutlineXMark size={18} />
            </button>
            <h2 className="font-heading font-semibold text-lg mb-5">Submit Work Request</h2>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Request Type</label>
                <select value={form.request_type}
                  onChange={e => setForm(f => ({ ...f, request_type: e.target.value, target_faculty_id: '', target_user_id: '' }))}
                  className="input">
                  <option value="cross_faculty">Cross-Faculty (request person from another faculty)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Target Faculty</label>
                <select value={form.target_faculty_id}
                  onChange={e => setForm(f => ({ ...f, target_faculty_id: e.target.value, target_user_id: '' }))}
                  className="input" required>
                  <option value="">— Select faculty —</option>
                  {otherFaculties.map((f: any) => (
                    <option key={f.id} value={f.id}>{f.faculty_name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-[var(--muted)] mt-1">Your own faculty is not listed — assign work within your faculty directly from Assignments.</p>
              </div>

              {form.target_faculty_id && (
                <div>
                  <label className="block text-sm font-medium mb-1">Target Person</label>
                  <select value={form.target_user_id}
                    onChange={e => setForm(f => ({ ...f, target_user_id: e.target.value }))}
                    className="input" required>
                    <option value="">— Select person —</option>
                    {users.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.position ? `${u.position}. ` : ''}{u.full_name} ({u.role_name?.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="input" required placeholder="Brief description of work needed" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Details</label>
                <textarea value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="input" rows={3} placeholder="Full details of the request…" />
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
                {saving ? 'Submitting…' : 'Submit Request'}
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
