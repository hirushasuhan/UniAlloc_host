'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { api } from '@/lib/api'
import { getUser } from '@/lib/auth'
import { HiOutlineXMark } from 'react-icons/hi2'

export default function DeptHeadStudentRequestsPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [users,    setUsers]    = useState<any[]>([])
  // Roster fetched on demand for the TARGET faculty of whichever request is
  // being endorsed (see openReview) — used to suggest a supervisor.
  const [suggestPool, setSuggestPool] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [mode,     setMode]     = useState<'endorse'|'final'>('final')
  const [assignTo, setAssignTo] = useState('')
  const [priority, setPriority] = useState('medium')
  const [estHours, setEstHours] = useState('4')
  const [deadline, setDeadline] = useState('')
  const [msg,      setMsg]      = useState<{text:string;ok:boolean}|null>(null)
  const [tabFilter, setTabFilter] = useState<'all' | 'action_required' | 'resolved'>('all')
  const [search,    setSearch]    = useState('')

  const myDept    = getUser()?.dept_id ?? null

  // Today's date (local) in YYYY-MM-DD — deadline can't be in the past
  const today = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()

  // Step 1: this head handles a request from a student in their OWN department.
  const isHomeStage  = (r: any) => r.approval_step === 'pending_home_head' && Number(r.home_department_id) === Number(myDept)
  // Step 2: this head is the TARGET department head for a cross-department request.
  const isFinalStage = (r: any) => r.approval_step === 'pending_final' && Number(r.department_id) === Number(myDept)
  // Own-department request → the head approves & assigns directly (no Dean).
  const isOwnDeptDirect = (r: any) => isHomeStage(r) && r.department_id && Number(r.department_id) === Number(myDept)

  const openReview = (r: any) => {
    setSelected(r)
    const endorsing = isHomeStage(r) && !isOwnDeptDirect(r)
    // Own-department (or the cross-dept final stage) → full assign form.
    // Any other home-stage request → endorse & forward.
    setMode(endorsing ? 'endorse' : 'final')
    setAssignTo(''); setPriority('medium'); setEstHours('4'); setDeadline('')

    // A request being endorsed here is, by definition, one this head cannot
    // finally approve themselves (own-department requests skip straight to
    // 'final' above) — it targets ANOTHER department or faculty. So who can
    // actually be suggested has to come from the request's TARGET faculty
    // (r.faculty_id), never this head's own — a lecturer in the home
    // department usually isn't even eligible to supervise where the request
    // is headed.
    setSuggestPool([])
    if (endorsing && r.faculty_id) {
      api.get(`/users?faculty_id=${r.faculty_id}`)
        .then(res => setSuggestPool(res.data.data ?? []))
        .catch(() => setSuggestPool([]))
    }
  }

  const load = () => api.get('/student-requests').then(r => setRequests(r.data.data ?? []))
  useEffect(() => {
    load()
    api.get('/users').then(r => setUsers(r.data.data ?? []))
  }, [])

  // /users is already scoped to the department for dept heads
  const assignable = users.filter(u => ['lecturer','department_head'].includes(u.role_name))

  // Supervisors the head may suggest when endorsing a request — always drawn
  // from suggestPool (the request's TARGET faculty, fetched in openReview):
  //   • Faculty-wide target (no department_id) → every lecturer/head/dean there.
  //   • Specific target department              → that department's own
  //     lecturers/head, plus its faculty's Dean.
  const suggestListFor = (r: any) => {
    if (!r) return []
    if (!r.department_id) {
      return suggestPool.filter(u => ['lecturer','department_head','dean'].includes(u.role_name))
    }
    return suggestPool.filter(u =>
      (Number(u.department_id) === Number(r.department_id) && ['lecturer','department_head'].includes(u.role_name))
      || u.role_name === 'dean'
    )
  }

  async function handleEndorse(action: 'endorse'|'reject') {
    if (!selected) return
    try {
      await api.patch(`/student-requests/${selected.id}`, {
        status: action === 'endorse' ? 'assigned' : 'rejected',
        ...(action === 'endorse' && assignTo ? { suggested_supervisor_id: parseInt(assignTo) } : {})
      })
      setMsg({ text: action === 'endorse'
        ? 'Request endorsed — forwarded to the final approver.'
        : 'Request rejected.', ok: true })
      setSelected(null); setAssignTo(''); load()
    } catch(e:any) { setMsg({ text: e.response?.data?.message ?? 'Error', ok: false }) }
  }

  async function handleResolve(status: 'assigned'|'rejected') {
    if (!selected) return

    // Approving creates a real supervision task in the lecturer's queue, and a
    // task with no deadline can never be scheduled or flagged overdue.
    if (status === 'assigned' && !deadline) {
      setMsg({ text: 'Pick a deadline before assigning a supervisor.', ok: false })
      return
    }

    try {
      await api.patch(`/student-requests/${selected.id}`, {
        status,
        assigned_to: status === 'assigned' && assignTo ? parseInt(assignTo) : null,
        ...(status === 'assigned' ? {
          priority,
          estimated_hours: parseFloat(estHours) || 4,
          deadline
        } : {})
      })
      setMsg({ text: status === 'assigned' ? 'Request approved — a supervision task was created for the lecturer.' : 'Request rejected.', ok: true })
      setSelected(null); setAssignTo(''); load()
    } catch(e:any) { setMsg({ text: e.response?.data?.message ?? 'Error', ok: false }) }
  }

  // Human-readable stage for this head's perspective
  const stageLabel = (r: any): { text: string; cls: string; dot: string } => {
    if (r.approval_step === 'approved' || r.status === 'assigned') {
      return {
        text: 'Approved & Assigned',
        cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
        dot: 'bg-emerald-500'
      }
    }
    if (r.approval_step === 'rejected' || r.status === 'rejected') {
      return {
        text: 'Rejected',
        cls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
        dot: 'bg-rose-500'
      }
    }
    if (isOwnDeptDirect(r)) {
      return {
        text: 'Awaiting Your Approval',
        cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold',
        dot: 'bg-amber-400 animate-pulse'
      }
    }
    if (isHomeStage(r)) {
      return {
        text: 'Awaiting Your Endorsement',
        cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold',
        dot: 'bg-amber-400 animate-pulse'
      }
    }
    if (isFinalStage(r)) {
      return {
        text: 'Awaiting Your Final Approval',
        cls: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-semibold',
        dot: 'bg-indigo-400 animate-pulse'
      }
    }
    if (r.home_head_approved_by) {
      return {
        text: 'Endorsed (Awaiting Dean)',
        cls: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20',
        dot: 'bg-sky-400'
      }
    }
    if (r.approval_step === 'pending_home_head') {
      return {
        text: 'Awaiting Dept Endorsement',
        cls: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
        dot: 'bg-zinc-400'
      }
    }
    return {
      text: 'Awaiting Final Approval',
      cls: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
      dot: 'bg-zinc-400'
    }
  }

  const canAct = (r: any) =>
    (isHomeStage(r) || isFinalStage(r)) &&
    r.approval_step !== 'approved' &&
    r.approval_step !== 'rejected' &&
    r.status !== 'assigned' &&
    r.status !== 'rejected'

  const actionRequiredCount = requests.filter(canAct).length
  const resolvedCount = requests.length - actionRequiredCount

  // Filter requests
  const filtered = requests.filter(r => {
    if (tabFilter === 'action_required' && !canAct(r)) return false
    if (tabFilter === 'resolved' && canAct(r)) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        r.student_name?.toLowerCase().includes(q) ||
        r.title?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.assigned_to_name?.toLowerCase().includes(q)
      )
    }
    return true
  })

  // Sort requests: Action required at the top, action taken / completed below
  const sortedRequests = [...filtered].sort((a, b) => {
    const aAction = canAct(a) ? 1 : 0
    const bAction = canAct(b) ? 1 : 0
    if (aAction !== bAction) {
      return bAction - aAction // 1 (action needed) comes before 0 (action taken)
    }
    const aDone = (a.approval_step === 'approved' || a.approval_step === 'rejected' || a.status === 'assigned' || a.status === 'rejected') ? 1 : 0
    const bDone = (b.approval_step === 'approved' || b.approval_step === 'rejected' || b.status === 'assigned' || b.status === 'rejected') ? 1 : 0
    if (aDone !== bDone) {
      return aDone - bDone
    }
    const dateA = new Date(a.created_at || 0).getTime()
    const dateB = new Date(b.created_at || 0).getTime()
    if (dateB !== dateA) return dateB - dateA
    return (b.id ?? 0) - (a.id ?? 0)
  })

  return (
    <DashboardLayout requiredRole="department_head">
      <h1 className="text-2xl font-heading font-bold mb-2">Student Supervisor Requests</h1>
      <p className="text-[var(--muted)] text-sm mb-6">
        Endorse requests from your own students, and assign supervisors for requests targeting your department
      </p>

      {msg && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm ${msg.ok?'bg-green-500/10 border border-green-500/30 text-green-600':'bg-red-500/10 border border-red-500/30 text-red-500'}`}>
          {msg.text}
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-1.5 bg-[var(--card)] p-1 rounded-xl border border-[var(--border)]">
          <button
            onClick={() => setTabFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tabFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            All Requests ({requests.length})
          </button>
          <button
            onClick={() => setTabFilter('action_required')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tabFilter === 'action_required'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <span>Action Required</span>
            {actionRequiredCount > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                tabFilter === 'action_required' ? 'bg-white text-amber-700' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
              }`}>
                {actionRequiredCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTabFilter('resolved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tabFilter === 'resolved'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            Action Taken ({resolvedCount})
          </button>
        </div>

        {requests.length > 3 && (
          <div className="relative flex-1 max-w-xs">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input text-xs py-1.5 pl-3 w-full"
              placeholder="Search student or title…"
            />
          </div>
        )}
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-[var(--border)]">
            {['Student','Title','Description','Stage','Supervisor','Date','Action'].map(h=>(
              <th key={h} className="text-left py-3 px-4 text-[var(--muted)] font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {sortedRequests.map((r:any) => {
              const st = stageLabel(r)
              const actionNeeded = canAct(r)
              return (
                <tr
                  key={r.id}
                  className={`border-b border-[var(--border)]/50 transition-colors ${
                    actionNeeded
                      ? 'bg-amber-500/[0.04] dark:bg-amber-500/[0.06] hover:bg-amber-500/[0.08]'
                      : 'hover:bg-[var(--bg)]/50'
                  }`}
                >
                  <td className="py-3 px-4 font-medium whitespace-nowrap">{r.student_name}</td>
                  <td className="py-3 px-4 max-w-[180px] truncate font-medium">{r.title}</td>
                  <td className="py-3 px-4 text-[var(--muted)] max-w-[200px] truncate">{r.description ?? '—'}</td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${st.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dot}`} />
                      {st.text}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[var(--muted)] whitespace-nowrap">{r.assigned_to_name ?? '—'}</td>
                  <td className="py-3 px-4 text-xs text-[var(--muted)] whitespace-nowrap">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {actionNeeded ? (
                      <button
                        onClick={() => openReview(r)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/20 active:scale-[0.98] transition-all"
                      >
                        {isHomeStage(r) && !isOwnDeptDirect(r) ? 'Endorse' : 'Review & Assign'}
                      </button>
                    ) : (
                      <span className="text-xs text-[var(--muted)] font-medium inline-flex items-center gap-1">
                        {r.approval_step === 'approved' || r.status === 'assigned' ? (
                          <span className="text-emerald-600 dark:text-emerald-400">✓ Assigned</span>
                        ) : r.approval_step === 'rejected' || r.status === 'rejected' ? (
                          <span className="text-rose-600 dark:text-rose-400">✕ Rejected</span>
                        ) : r.home_head_approved_by ? (
                          <span className="text-sky-600 dark:text-sky-400">✓ Endorsed</span>
                        ) : (
                          <span className="text-[var(--muted)]">In Progress</span>
                        )}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
            {sortedRequests.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-[var(--muted)]">No student requests found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Review Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-md p-6 relative">
            <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-[var(--muted)] hover:text-white"><HiOutlineXMark size={18}/></button>
            <h2 className="font-heading font-semibold text-lg mb-2">
              {mode === 'endorse' ? 'Endorse Student Request' : 'Review Student Request'}
            </h2>
            <div className="text-sm text-[var(--muted)] mb-4 space-y-1 bg-white/5 p-3 rounded-xl border border-white/10">
              <p>Student Name: <strong className="text-white">{selected.student_name}</strong></p>
              <p>Enrollment No: <strong className="text-white">{selected.student_enrollment ?? '—'}</strong></p>
              <p>Contact No: <strong className="text-white">{selected.student_contact ?? '—'}</strong></p>
              <p>Requested: <strong className="text-white">{selected.faculty_name}{selected.dept_name ? ` · ${selected.dept_name}` : ' · Faculty-wide'}</strong></p>
              {mode === 'final' && selected.suggested_supervisor_name && (
                <p>Suggested by dept: <strong className="text-white">{selected.suggested_supervisor_name}</strong></p>
              )}
            </div>
            <p className="font-semibold mb-1">{selected.title}</p>
            {selected.description && <p className="text-sm text-[var(--muted)] mb-4">{selected.description}</p>}

            {mode === 'endorse' ? (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1.5">Suggest a Supervisor (optional)</label>
                  <select value={assignTo} onChange={e=>setAssignTo(e.target.value)} className="input">
                    <option value="">— No suggestion —</option>
                    {suggestListFor(selected).map((u:any) => (
                      <option key={u.id} value={u.id}>{u.position ? `${u.position}. ` : ''}{u.full_name} ({u.role_name.replace('_',' ')})</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-[var(--muted)] mt-1">
                    The final approver assigns the actual supervisor. A suggestion is optional.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleEndorse('endorse')}
                    className="btn-primary flex-1 justify-center">Endorse &amp; Forward</button>
                  <button onClick={() => handleEndorse('reject')}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20">
                    Reject
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1.5">Assign Supervisor</label>
                  <select value={assignTo} onChange={e=>setAssignTo(e.target.value)} className="input">
                    <option value="">— Select a supervisor —</option>
                    {assignable.map((u:any) => (
                      <option key={u.id} value={u.id}>{u.position ? `${u.position}. ` : ''}{u.full_name} ({u.role_name.replace('_',' ')})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Priority</label>
                    <select value={priority} onChange={e=>setPriority(e.target.value)} className="input">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Est. Hours</label>
                    <input type="number" value={estHours} onChange={e=>setEstHours(e.target.value)} className="input" min="0.5" step="0.5"/>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Deadline *</label>
                    <input type="date" min={today} value={deadline} onChange={e=>setDeadline(e.target.value)} className="input"/>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleResolve('assigned')} disabled={!assignTo || !deadline}
                    className="btn-primary flex-1 justify-center">Assign &amp; Approve</button>
                  <button onClick={() => handleResolve('rejected')}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20">
                    Reject
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
