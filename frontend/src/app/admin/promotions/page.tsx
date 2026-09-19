'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { api } from '@/lib/api'
import { HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineShieldExclamation, HiOutlineXMark, HiOutlineExclamationTriangle } from 'react-icons/hi2'

const ROLES = ['system_admin', 'dean', 'department_head', 'lecturer']
const OPERATIONAL_STATUSES = ['Available', 'On Study Leave', 'Temporarily Not Available', 'On Vacation']

export default function AdminPromotionsPage() {
  const [users,      setUsers]      = useState<any[]>([])
  const [promotions, setPromotions] = useState<any[]>([])
  const [faculties,  setFaculties]  = useState<any[]>([])
  const [depts,      setDepts]      = useState<any[]>([])
  const [loading,    setLoading]    = useState(false)
  const [msg,        setMsg]        = useState<{text:string;ok:boolean}|null>(null)

  // Confirmation dialog state
  const [ask,      setAsk]      = useState<{kind:'role'|'status'; user:any; value:string}|null>(null)
  const [cFaculty, setCFaculty] = useState('')
  const [cDept,    setCDept]    = useState('')
  const [cErr,     setCErr]     = useState('')
  const [cBusy,    setCBusy]    = useState(false)

  const loadData = () => {
    setLoading(true)
    Promise.all([
      api.get('/users').catch(() => ({ data: { data: [] } })),
      api.get('/promotions').catch(() => ({ data: { data: [] } })),
      api.get('/faculties').catch(() => ({ data: { data: [] } })),
      api.get('/departments').catch(() => ({ data: { data: [] } }))
    ]).then(([uRes, pRes, fRes, dRes]) => {
      setUsers(uRes.data.data ?? [])
      setPromotions(pRes.data.data ?? [])
      setFaculties(fRes.data.data ?? [])
      setDepts(dRes.data.data ?? [])
    }).catch(err => {
      console.error(err)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  // Open confirmation instead of applying immediately (the select reverts on cancel
  // because its value stays bound to the unchanged user record)
  function openRoleConfirm(u: any, newRole: string) {
    if (newRole === u.role_name) return
    setCErr(''); setCFaculty(''); setCDept('')
    setAsk({ kind: 'role', user: u, value: newRole })
  }

  function openStatusConfirm(u: any, newStatus: string) {
    if ((u.operational_status ?? 'Available') === newStatus) return
    setCErr('')
    setAsk({ kind: 'status', user: u, value: newStatus })
  }

  async function confirmChange() {
    if (!ask) return
    const u = ask.user
    setCBusy(true); setCErr('')
    try {
      if (ask.kind === 'role') {
        const payload: any = { user_id: u.id, new_role: ask.value }
        if (ask.value === 'dean') {
          if (!cFaculty) { setCErr('Please select the faculty this Dean will lead.'); setCBusy(false); return }
          payload.faculty_id = parseInt(cFaculty)
        }
        if (ask.value === 'department_head') {
          if (!cDept) { setCErr('Please select the department this Head will lead.'); setCBusy(false); return }
          payload.department_id = parseInt(cDept)
        }
        await api.post('/promotions', payload)
        setMsg({ text: `${u.full_name}'s role changed to ${ask.value.replace(/_/g, ' ')}.`, ok: true })
      } else {
        await api.put(`/users/${u.id}`, { operational_status: ask.value })
        setMsg({ text: `${u.full_name}'s operational status set to "${ask.value}".`, ok: true })
      }
      setAsk(null); loadData()
    } catch(err:any) {
      setCErr(err.response?.data?.message ?? 'Action failed. Please try again.')
    } finally { setCBusy(false) }
  }

  // Best-effort client-side occupancy check (backend enforces authoritatively).
  // A seat counts as "taken" only if the current holder is active AND not On Study Leave.
  const occupancyBlock = (): string => {
    if (!ask || ask.kind !== 'role') return ''
    if (ask.value === 'dean' && cFaculty) {
      const d = users.find((x:any) => x.role_name === 'dean' && String(x.faculty_id) === String(cFaculty)
        && x.is_active && x.id !== ask.user.id && (x.operational_status ?? 'Available') !== 'On Study Leave')
      if (d) return `${d.title ? d.title + '. ' : ''}${d.full_name} is already the active Dean of this faculty. Set them On Study Leave first, or choose another faculty.`
    }
    if (ask.value === 'department_head' && cDept) {
      const h = users.find((x:any) => x.role_name === 'department_head' && String(x.department_id) === String(cDept)
        && x.is_active && x.id !== ask.user.id && (x.operational_status ?? 'Available') !== 'On Study Leave')
      if (h) return `${h.title ? h.title + '. ' : ''}${h.full_name} is already the active Head of this department. Set them On Study Leave first, or choose another department.`
    }
    return ''
  }

  async function resolve(id: number, action: 'approve'|'reject') {
    setLoading(true); setMsg(null)
    try {
      await api.patch(`/promotions/${id}`, { action })
      setMsg({ text: `Promotion ${action}d successfully.`, ok: true })
      loadData()
    } catch(err:any) {
      setMsg({ text: err.response?.data?.message ?? 'Action failed.', ok: false })
    } finally { setLoading(false) }
  }

  const statusBadge = (s:string) => {
    const map: Record<string,string> = {
      pending:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    }
    return map[s] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400'
  }

  const roleBadgeColor = (r: string) => {
    const map: Record<string, string> = {
      system_admin:    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      dean:            'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
      department_head: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      lecturer:        'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
      on_study_leave:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    }
    return map[r] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400'
  }

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      'Available':                 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'On Study Leave':            'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      'Temporarily Not Available': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      'On Vacation':               'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    }
    return map[s] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400'
  }

  const nonStudents = users.filter(u => u.role_name !== 'student')
  const pending     = promotions.filter(p => p.status === 'pending')
  const resolved    = promotions.filter(p => p.status !== 'pending')

  return (
    <DashboardLayout requiredRole="system_admin">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">Role Management & Promotions</h1>
          <p className="text-[var(--muted)] text-sm mt-1">Change user roles and manage promotion workflows</p>
        </div>
      </div>

      {msg && (
        <div className={`mb-6 rounded-xl px-4 py-3 text-sm border ${msg.ok ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
          {msg.text}
        </div>
      )}

      {/* Active User Roles Table */}
      <div className="glass-card mb-8">
        <div className="p-5 border-b border-[var(--border)]">
          <h2 className="font-heading font-semibold text-lg">Active User Roles</h2>
          <p className="text-xs text-[var(--muted)] mt-0.5">Change roles for deans, heads and lecturers, and set their operational availability</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {['Name', 'Department', 'Current Role', 'Change Role', 'Operational Status'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-[var(--muted)] font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {nonStudents.map((u: any) => (
                <tr key={u.id} className="border-b border-[var(--border)]/50 hover:bg-[var(--bg)]/50 transition-colors align-middle">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold whitespace-nowrap">{u.title ? `${u.title}. ` : ''}{u.full_name}</div>
                    <div className="text-xs text-[var(--muted)] whitespace-nowrap">{u.email}</div>
                  </td>
                  <td className="py-3.5 px-4 text-[var(--muted)] whitespace-nowrap">{u.dept_name ?? '—'}</td>

                  {/* Current Role — read-only badge */}
                  <td className="py-3.5 px-4">
                    <span className={`badge whitespace-nowrap ${roleBadgeColor(u.role_name)}`}>
                      {(u.role_name ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </span>
                  </td>

                  {/* Change Role — editable select */}
                  <td className="py-3.5 px-4">
                    <select
                      value={u.role_name}
                      disabled={loading}
                      onChange={e => openRoleConfirm(u, e.target.value)}
                      className="input py-1.5 px-3 w-[170px] text-xs outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {ROLES.map(r => (
                        <option key={r} value={r}>
                          {r.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Operational Status — colored selector (all roles except System Admin) */}
                  <td className="py-3.5 px-4">
                    {u.role_name === 'system_admin' ? (
                      <span className="text-[var(--muted)] text-xs">— N/A —</span>
                    ) : (
                      <select
                        value={u.operational_status ?? 'Available'}
                        disabled={loading}
                        onChange={e => openStatusConfirm(u, e.target.value)}
                        title="Set availability"
                        className={`rounded-lg py-1.5 px-3 w-[185px] text-xs font-semibold border border-transparent outline-none focus:ring-2 focus:ring-offset-0 focus:ring-indigo-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${statusColor(u.operational_status ?? 'Available')}`}
                      >
                        {OPERATIONAL_STATUSES.map(s => (
                          <option key={s} value={s} className="bg-[var(--card-solid)] text-[var(--text)] font-normal">{s}</option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
              {nonStudents.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[var(--muted)]">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Approvals (Dean Initiated) */}
      {pending.length > 0 && (
        <div className="glass-card mb-8">
          <div className="p-5 border-b border-[var(--border)] flex items-center gap-2">
            <HiOutlineShieldExclamation className="text-amber-500" size={20}/>
            <h2 className="font-heading font-semibold text-lg">Pending Dean Approvals</h2>
          </div>
          <div className="divide-y divide-[var(--border)]/50">
            {pending.map((p:any) => (
              <div key={p.id} className="flex items-center justify-between gap-4 p-5">
                <div>
                  <p className="font-medium">{p.user_name}</p>
                  <p className="text-sm text-[var(--muted)] mt-0.5">
                    <span className="line-through">{(p.old_role ?? '').replace(/_/g,' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</span>
                    {' → '}
                    <strong className="text-indigo-500">{(p.new_role ?? '').replace(/_/g,' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</strong>
                  </p>
                  <p className="text-xs text-[var(--muted)] mt-1">Initiated by: {p.promoted_by_name ?? '—'} · {new Date(p.promoted_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <button disabled={loading} onClick={() => resolve(p.id, 'approve')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 text-sm font-medium transition-colors">
                    <HiOutlineCheckCircle size={15}/> Approve
                  </button>
                  <button disabled={loading} onClick={() => resolve(p.id, 'reject')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-medium transition-colors">
                    <HiOutlineXCircle size={15}/> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {resolved.length > 0 && (
        <div className="glass-card">
          <div className="p-5 border-b border-[var(--border)]">
            <h2 className="font-heading font-semibold text-lg">Promotion & Role Change History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {['User','Old Role','New Role','Changed By','Status','Date'].map(h=>(
                    <th key={h} className="text-left py-3 px-4 text-[var(--muted)] font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resolved.map((p:any) => (
                  <tr key={p.id} className="border-b border-[var(--border)]/50 hover:bg-[var(--bg)]/50 transition-colors">
                    <td className="py-3 px-4 font-medium">{p.user_name}</td>
                    <td className="py-3 px-4 text-[var(--muted)]">{(p.old_role ?? '').replace(/_/g,' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</td>
                    <td className="py-3 px-4 text-indigo-400 font-medium">{(p.new_role ?? '').replace(/_/g,' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</td>
                    <td className="py-3 px-4 text-[var(--muted)]">{p.promoted_by_name ?? '—'}</td>
                    <td className="py-3 px-4"><span className={`badge ${statusBadge(p.status)}`}>{p.status}</span></td>
                    <td className="py-3 px-4 text-[var(--muted)]">{new Date(p.promoted_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Confirmation dialog for role / status changes */}
      {ask && (() => {
        const roleLabel = (r: string) => r.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
        const needFaculty = ask.kind === 'role' && ask.value === 'dean'
        const needDept    = ask.kind === 'role' && ask.value === 'department_head'
        const block       = occupancyBlock()
        const confirmDisabled = cBusy || (needFaculty && !cFaculty) || (needDept && !cDept) || !!block
        const u = ask.user

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-[var(--card-solid)] shadow-2xl rounded-2xl border border-[var(--border)] w-full max-w-md p-6 relative">
              <button onClick={() => setAsk(null)} className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--text)]">
                <HiOutlineXMark size={20}/>
              </button>

              <h2 className="font-heading font-semibold text-lg mb-1">
                {ask.kind === 'role' ? 'Confirm role change' : 'Confirm status change'}
              </h2>
              <p className="text-sm text-[var(--muted)] mb-5">
                {u.title ? `${u.title}. ` : ''}<span className="font-medium text-[var(--text)]">{u.full_name}</span>
              </p>

              {ask.kind === 'role' ? (
                <div className="text-sm mb-4">
                  <span className={`badge ${roleBadgeColor(u.role_name)}`}>{roleLabel(u.role_name)}</span>
                  <span className="mx-2 text-[var(--muted)]">→</span>
                  <span className={`badge ${roleBadgeColor(ask.value)}`}>{roleLabel(ask.value)}</span>
                </div>
              ) : (
                <div className="text-sm mb-4">
                  Set availability to{' '}
                  <span className={`badge ${statusColor(ask.value)}`}>{ask.value}</span>
                </div>
              )}

              {/* Dean → pick faculty */}
              {needFaculty && (
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Faculty to lead *</label>
                  <select value={cFaculty} onChange={e => setCFaculty(e.target.value)} className="input">
                    <option value="">— Select faculty —</option>
                    {faculties.map((f:any) => <option key={f.id} value={f.id}>{f.faculty_name}</option>)}
                  </select>
                </div>
              )}

              {/* Department Head → pick faculty then department */}
              {needDept && (
                <div className="grid grid-cols-1 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Faculty *</label>
                    <select value={cFaculty} onChange={e => { setCFaculty(e.target.value); setCDept('') }} className="input">
                      <option value="">— Select faculty —</option>
                      {faculties.map((f:any) => <option key={f.id} value={f.id}>{f.faculty_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Department to lead *</label>
                    <select value={cDept} onChange={e => setCDept(e.target.value)} className="input" disabled={!cFaculty}>
                      <option value="">{cFaculty ? '— Select department —' : '— Select faculty first —'}</option>
                      {depts.filter((d:any) => String(d.faculty_id) === String(cFaculty))
                            .map((d:any) => <option key={d.id} value={d.id}>{d.dept_name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Occupancy warning */}
              {block && (
                <div className="mb-4 flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
                  <HiOutlineExclamationTriangle size={18} className="shrink-0 mt-0.5"/>
                  <span>{block}</span>
                </div>
              )}

              {/* Server / validation error */}
              {cErr && (
                <div className="mb-4 text-sm text-red-500 bg-red-500/10 rounded-xl px-3 py-2 border border-red-500/20">{cErr}</div>
              )}

              <div className="flex gap-2 mt-2">
                <button
                  onClick={confirmChange}
                  disabled={confirmDisabled}
                  className="btn-primary flex-1 justify-center inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cBusy ? 'Saving…' : 'Confirm'}
                </button>
                <button onClick={() => setAsk(null)} disabled={cBusy} className="btn-secondary flex-1 justify-center">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </DashboardLayout>
  )
}
