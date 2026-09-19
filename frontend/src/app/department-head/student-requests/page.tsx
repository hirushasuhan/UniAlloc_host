'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { api } from '@/lib/api'
import { getUser } from '@/lib/auth'
import { HiOutlineXMark } from 'react-icons/hi2'

export default function DeptHeadStudentRequestsPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [users,    setUsers]    = useState<any[]>([])
  const [facultyUsers, setFacultyUsers] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [mode,     setMode]     = useState<'endorse'|'final'>('final')
  const [assignTo, setAssignTo] = useState('')
  const [priority, setPriority] = useState('medium')
  const [estHours, setEstHours] = useState('4')
  const [deadline, setDeadline] = useState('')
  const [msg,      setMsg]      = useState<{text:string;ok:boolean}|null>(null)

  const myDept    = getUser()?.dept_id ?? null
  const myFaculty = getUser()?.faculty_id ?? null

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
    // Own-department (or the cross-dept final stage) → full assign form.
    // Any other home-stage request → endorse & forward.
    setMode(isHomeStage(r) && !isOwnDeptDirect(r) ? 'endorse' : 'final')
    setAssignTo(''); setPriority('medium'); setEstHours('4'); setDeadline('')
  }

  const load = () => api.get('/student-requests').then(r => setRequests(r.data.data ?? []))
  useEffect(() => {
    load()
    api.get('/users').then(r => setUsers(r.data.data ?? []))
    // All staff in this head's faculty (every department + the Dean) — used to
    // suggest supervisors for faculty-wide requests and to suggest the Dean.
    if (myFaculty) {
      api.get(`/users?faculty_id=${myFaculty}`)
        .then(r => setFacultyUsers(r.data.data ?? []))
        .catch(() => setFacultyUsers([]))
    }
  }, [])

  // /users is already scoped to the department for dept heads
  const assignable = users.filter(u => ['lecturer','department_head'].includes(u.role_name))
  const facultyDean = facultyUsers.filter(u => u.role_name === 'dean')

  // Supervisors the head may suggest when endorsing a request:
  //   • Faculty-wide request → every lecturer/head in the faculty, plus the Dean.
  //   • Otherwise            → own-department staff, plus the Dean.
  const suggestListFor = (r: any) => {
    if (r && !r.department_id) {
      return facultyUsers.filter(u => ['lecturer','department_head','dean'].includes(u.role_name))
    }
    return [...assignable, ...facultyDean]
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
    try {
      await api.patch(`/student-requests/${selected.id}`, {
        status,
        assigned_to: status === 'assigned' && assignTo ? parseInt(assignTo) : null,
        ...(status === 'assigned' ? {
          priority,
          estimated_hours: parseFloat(estHours) || 4,
          deadline: deadline || null
        } : {})
      })
      setMsg({ text: status === 'assigned' ? 'Request approved — a supervision task was created for the lecturer.' : 'Request rejected.', ok: true })
      setSelected(null); setAssignTo(''); load()
    } catch(e:any) { setMsg({ text: e.response?.data?.message ?? 'Error', ok: false }) }
  }

  // Human-readable stage for this head's perspective
  const stageLabel = (r: any): { text: string; cls: string } => {
    if (r.approval_step === 'approved')  return { text: 'Approved',  cls: 'bg-green-100 text-green-700' }
    if (r.approval_step === 'rejected')  return { text: 'Rejected',  cls: 'bg-red-100 text-red-700' }
    if (isOwnDeptDirect(r))              return { text: 'Awaiting your approval', cls: 'bg-amber-100 text-amber-700' }
    if (isHomeStage(r))                  return { text: 'Awaiting your endorsement', cls: 'bg-amber-100 text-amber-700' }
    if (r.approval_step === 'pending_home_head') return { text: 'Awaiting dept endorsement', cls: 'bg-slate-100 text-slate-600' }
    if (isFinalStage(r))                 return { text: 'Awaiting your final approval', cls: 'bg-indigo-100 text-indigo-700' }
    return { text: 'Awaiting final approval', cls: 'bg-slate-100 text-slate-600' }
  }

  const canAct = (r: any) => isHomeStage(r) || isFinalStage(r)

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

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-[var(--border)]">
            {['Student','Title','Description','Stage','Supervisor','Action'].map(h=>(
              <th key={h} className="text-left py-3 px-4 text-[var(--muted)] font-medium">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {requests.map((r:any) => {
              const st = stageLabel(r)
              return (
                <tr key={r.id} className="border-b border-[var(--border)]/50 hover:bg-[var(--bg)]/50">
                  <td className="py-3 px-4 font-medium">{r.student_name}</td>
                  <td className="py-3 px-4 max-w-[180px] truncate font-medium">{r.title}</td>
                  <td className="py-3 px-4 text-[var(--muted)] max-w-[200px] truncate">{r.description ?? '—'}</td>
                  <td className="py-3 px-4"><span className={`badge ${st.cls}`}>{st.text}</span></td>
                  <td className="py-3 px-4 text-[var(--muted)]">{r.assigned_to_name ?? '—'}</td>
                  <td className="py-3 px-4">
                    {canAct(r) && (
                      <button onClick={() => openReview(r)}
                        className="text-xs text-indigo-500 hover:underline font-medium">
                        {isHomeStage(r) && !isOwnDeptDirect(r) ? 'Endorse' : 'Review'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
            {requests.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-[var(--muted)]">No student requests for your department.</td></tr>
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
                    <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Deadline</label>
                    <input type="date" min={today} value={deadline} onChange={e=>setDeadline(e.target.value)} className="input"/>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleResolve('assigned')} disabled={!assignTo}
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
