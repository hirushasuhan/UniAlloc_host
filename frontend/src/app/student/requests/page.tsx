'use client'
import { useEffect, useState, FormEvent } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { api } from '@/lib/api'
import { getUser } from '@/lib/auth'
import { validateContact, normaliseContact } from '@/lib/validation'
import { HiOutlinePencil, HiOutlineTrash, HiOutlineXMark, HiOutlineCheck, HiOutlineChevronDown } from 'react-icons/hi2'

export default function StudentRequestsPage() {
  const [requests,   setRequests]   = useState<any[]>([])
  const [faculties,  setFaculties]  = useState<any[]>([])
  const [departments,setDepartments]= useState<any[]>([])
  const [name,       setName]       = useState('')
  const [enrollment, setEnrollment] = useState('')
  const [contact,    setContact]    = useState('')
  const [facultyId,  setFacultyId]  = useState('')
  const [deptId,     setDeptId]     = useState('')
  const [title,      setTitle]      = useState('')
  const [desc,       setDesc]       = useState('')
  const [msg,        setMsg]        = useState<{ text: string; ok: boolean } | null>(null)
  const [loading,    setLoading]    = useState(false)
  // True once the profile already has a contact number — that field then
  // becomes read-only here, same as name and enrollment number always are.
  // Changing an existing number happens in Settings, not on this form.
  const [hasContact, setHasContact] = useState(true)

  // Editing/deleting a request the student already submitted — only ever
  // allowed while it's still awaiting the home head's decision (see
  // canModify below). Kept separate from the New Request form state above.
  const [editingId,      setEditingId]      = useState<number | null>(null)
  const [editForm,       setEditForm]       = useState({ title: '', description: '', faculty_id: '', department_id: '' })
  const [editDepartments,setEditDepartments]= useState<any[]>([])
  const [editSaving,     setEditSaving]     = useState(false)

  // "My Requests" only shows the newest few by default (the list is already
  // newest-first from the backend) so the page doesn't grow taller with
  // every request ever submitted — "See more" expands it into its own
  // scroll area instead.
  const COLLAPSED_REQUEST_COUNT = 3
  const [showAllRequests, setShowAllRequests] = useState(false)

  const load = () => api.get('/student-requests')
    .then(r => setRequests(r.data.data ?? []))
    .catch((err: any) => {
      // A silent failure here used to just leave the list empty with no
      // explanation — indistinguishable from "you have no requests". Surface
      // whatever the backend said instead.
      setMsg({ text: err.response?.data?.message ?? 'Could not load your requests.', ok: false })
    })

  useEffect(() => {
    load()
    api.get('/faculties').then(r => setFaculties(r.data.data ?? []))
    const u = getUser()
    if (u) {
      setName(u.full_name || '')
      setEnrollment((u as any).enrollment_number || '')
      const profileContact = (u as any).contact || ''
      setContact(profileContact)
      setHasContact(profileContact.trim() !== '')
    }
  }, [])

  // Load departments of the selected faculty; reset the department choice
  useEffect(() => {
    setDeptId('')
    setDepartments([])
    if (facultyId) {
      api.get(`/departments?faculty_id=${facultyId}`).then(r => setDepartments(r.data.data ?? []))
    }
  }, [facultyId])

  async function submit(e: FormEvent) {
    e.preventDefault()

    // The supervisor who picks this up needs a number that actually reaches
    // the student. Only checked when the field is editable — once a real
    // number is on file this form can't touch it (see hasContact below).
    if (!hasContact) {
      const contactError = validateContact(contact)
      if (contactError) {
        setMsg({ text: contactError, ok: false })
        return
      }
    }

    setLoading(true)
    setMsg(null)
    try {
      await api.post('/student-requests', {
        title,
        description: desc,
        faculty_id: parseInt(facultyId),
        department_id: deptId ? parseInt(deptId) : null,
        // Only meaningful the first time: the backend uses this to fill in a
        // missing contact number and otherwise ignores it entirely, so it's
        // never how an existing number changes.
        ...(hasContact ? {} : { contact: normaliseContact(contact) })
      })
      setMsg({ text: 'Request submitted! Your own department head will endorse it first, then it goes to the final approver (Dean or the target department head).', ok: true })
      setTitle(''); setDesc(''); setFacultyId(''); setDeptId('')
      // The number just submitted (if any) is now on file — lock the field
      // the same way it would show after a page reload.
      if (!hasContact) setHasContact(true)
      load()
    } catch (err: any) {
      setMsg({ text: err.response?.data?.message ?? 'Submission failed.', ok: false })
    } finally {
      setLoading(false)
    }
  }

  const statusColor: Record<string, string> = {
    pending:  'bg-amber-100 text-amber-700',
    assigned: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }

  // Two-step approval chain, shown from the student's perspective
  const stageLabel = (r: any): { text: string; cls: string } => {
    switch (r.approval_step) {
      case 'approved':          return { text: 'Approved',  cls: statusColor.assigned }
      case 'rejected':          return { text: 'Rejected',  cls: statusColor.rejected }
      case 'pending_final':     return { text: 'Endorsed · awaiting final approval', cls: 'bg-indigo-100 text-indigo-700' }
      case 'pending_home_head': return { text: 'Awaiting dept endorsement', cls: statusColor.pending }
      default:                  return { text: r.status, cls: statusColor[r.status] ?? 'bg-slate-100 text-slate-700' }
    }
  }

  // Editing/withdrawing only makes sense before anyone has acted on the
  // request — once the home head has endorsed or rejected it, the backend
  // rejects both, so the buttons don't even show past that point.
  const canModify = (r: any) => r.approval_step === 'pending_home_head'

  function startEdit(r: any) {
    setMsg(null)
    setEditingId(r.id)
    setEditForm({
      title: r.title ?? '',
      description: r.description ?? '',
      faculty_id: r.faculty_id ? String(r.faculty_id) : '',
      department_id: r.department_id ? String(r.department_id) : '',
    })
    setEditDepartments([])
    if (r.faculty_id) {
      api.get(`/departments?faculty_id=${r.faculty_id}`).then(res => setEditDepartments(res.data.data ?? []))
    }
  }

  function cancelEdit() {
    setEditingId(null)
  }

  function changeEditFaculty(facultyId: string) {
    setEditForm(f => ({ ...f, faculty_id: facultyId, department_id: '' }))
    setEditDepartments([])
    if (facultyId) {
      api.get(`/departments?faculty_id=${facultyId}`).then(res => setEditDepartments(res.data.data ?? []))
    }
  }

  async function saveEdit(id: number) {
    if (!editForm.title.trim()) {
      setMsg({ text: 'Request title is required.', ok: false })
      return
    }
    setEditSaving(true)
    setMsg(null)
    try {
      await api.patch(`/student-requests/${id}`, {
        title: editForm.title,
        description: editForm.description,
        faculty_id: editForm.faculty_id ? parseInt(editForm.faculty_id) : undefined,
        department_id: editForm.department_id ? parseInt(editForm.department_id) : null,
      })
      setMsg({ text: 'Request updated.', ok: true })
      setEditingId(null)
      load()
    } catch (err: any) {
      setMsg({ text: err.response?.data?.message ?? 'Failed to update request.', ok: false })
    } finally {
      setEditSaving(false)
    }
  }

  async function deleteRequest(id: number) {
    if (!confirm('Withdraw this supervisor request? This cannot be undone.')) return
    setMsg(null)
    try {
      await api.delete(`/student-requests/${id}`)
      setMsg({ text: 'Request withdrawn.', ok: true })
      load()
    } catch (err: any) {
      setMsg({ text: err.response?.data?.message ?? 'Failed to withdraw request.', ok: false })
    }
  }

  return (
    <DashboardLayout requiredRole="student">
      <h1 className="text-2xl font-heading font-bold mb-2">My Requests</h1>
      <p className="text-[var(--muted)] text-sm mb-8">Submit and track supervisor allocation requests</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submission Form */}
        <div className="glass-card p-6">
          <h2 className="font-heading font-semibold text-lg mb-4">New Supervisor Request</h2>

          {msg && (
            <div className={`mb-4 rounded-xl px-4 py-3 text-sm ${msg.ok ? 'bg-green-500/10 border border-green-500/30 text-green-600' : 'bg-red-500/10 border border-red-500/30 text-red-500'}`}>
              {msg.text}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Full Name</label>
              <input value={name} className="input opacity-70 cursor-not-allowed" readOnly disabled
                title="From your profile — change it in Settings" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Enrollment Number</label>
                <input value={enrollment} className="input opacity-70 cursor-not-allowed" readOnly disabled
                  title="From your profile — contact your System Administrator to correct this" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Contact Number {!hasContact && '*'}
                </label>
                <input value={contact} onChange={e => setContact(e.target.value)}
                  className={`input ${hasContact ? 'opacity-70 cursor-not-allowed' : ''}`}
                  readOnly={hasContact} disabled={hasContact} required={!hasContact}
                  type="tel" inputMode="tel" maxLength={20}
                  placeholder="e.g. +94771234567"
                  title={hasContact ? 'From your profile — change it in Settings' : undefined} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Faculty *</label>
                <select value={facultyId} onChange={e => setFacultyId(e.target.value)} className="input" required>
                  <option value="">— Select Faculty —</option>
                  {faculties.map((f: any) => (
                    <option key={f.id} value={f.id}>{f.faculty_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Department (optional)</label>
                <select value={deptId} onChange={e => setDeptId(e.target.value)} className="input" disabled={!facultyId}>
                  <option value="">{facultyId ? '— Any Department (Faculty-wide) —' : 'Select faculty first'}</option>
                  {departments.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.dept_name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-[var(--muted)] mt-1">
                  Leave blank to let the Dean assign any suitable supervisor in the faculty.
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Request Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className="input" required
                placeholder="e.g. Final Year Project Supervision — Machine Learning" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Description</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} className="input" rows={4}
                placeholder="Briefly describe your project, preferred expertise, and any specific requirements…" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? 'Submitting…' : 'Submit Request'}
            </button>
          </form>
        </div>

        {/* My Requests */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <h2 className="font-heading font-semibold text-lg">My Requests</h2>
              {requests.length > 0 && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 font-semibold">
                  {requests.length}
                </span>
              )}
            </div>
            {requests.length > COLLAPSED_REQUEST_COUNT && (
              <span className="text-xs text-[var(--muted)] font-medium hidden sm:inline-block">
                {showAllRequests ? `Showing all ${requests.length}` : `Showing latest 3 of ${requests.length}`}
              </span>
            )}
          </div>

          {requests.length === 0
            ? <p className="text-[var(--muted)] text-sm">No requests submitted yet.</p>
            : (() => {
              const visibleRequests = showAllRequests ? requests : requests.slice(0, COLLAPSED_REQUEST_COUNT)
              const hasMore = requests.length > COLLAPSED_REQUEST_COUNT
              return (
                <div className="relative">
                  <div className={showAllRequests ? "max-h-[580px] overflow-y-auto space-y-3.5 pr-1.5 -mr-1.5" : "space-y-3.5"}>
                    {visibleRequests.map((r: any) => (
                      <div
                        key={r.id}
                        className="group relative p-4 rounded-2xl bg-[var(--bg)] hover:bg-[var(--card-solid)] border border-[var(--border)] hover:border-indigo-500/30 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                      >
                        {editingId === r.id ? (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium mb-1">Request Title *</label>
                              <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                                className="input text-sm" required />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1">Description</label>
                              <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                                className="input text-sm" rows={3} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium mb-1">Faculty *</label>
                                <select value={editForm.faculty_id} onChange={e => changeEditFaculty(e.target.value)} className="input text-sm" required>
                                  <option value="">— Select Faculty —</option>
                                  {faculties.map((f: any) => (
                                    <option key={f.id} value={f.id}>{f.faculty_name}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1">Department</label>
                                <select value={editForm.department_id} onChange={e => setEditForm(f => ({ ...f, department_id: e.target.value }))}
                                  className="input text-sm" disabled={!editForm.faculty_id}>
                                  <option value="">{editForm.faculty_id ? '— Any Department —' : 'Select faculty first'}</option>
                                  {editDepartments.map((d: any) => (
                                    <option key={d.id} value={d.id}>{d.dept_name}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => saveEdit(r.id)} disabled={editSaving}
                                className="btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1">
                                <HiOutlineCheck size={14}/> {editSaving ? 'Saving…' : 'Save'}
                              </button>
                              <button type="button" onClick={cancelEdit} disabled={editSaving}
                                className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1">
                                <HiOutlineXMark size={14}/> Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-3 mb-1.5">
                              <p className="font-semibold text-sm group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                                {r.title}
                              </p>
                              {(() => { const st = stageLabel(r); return (
                                <span className={`badge flex-shrink-0 ${st.cls}`}>{st.text}</span>
                              )})()}
                            </div>
                            {r.description && (
                              <p className="text-xs text-[var(--muted)] line-clamp-2 leading-relaxed mb-2">
                                {r.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-[var(--muted)] flex-wrap">
                              <span>{r.faculty_name}{r.dept_name ? ` · ${r.dept_name}` : ''}</span>
                              {r.assigned_to_name && (
                                <>
                                  <span className="text-[var(--muted)]/40">•</span>
                                  <span className="font-medium text-indigo-500 dark:text-indigo-400">
                                    Supervisor: {r.assigned_to_name}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Supervision Progress Bar for Approved Requests */}
                            {(r.status === 'assigned' || r.approval_step === 'approved') && (
                              <div className="mt-3 p-3 rounded-xl bg-[var(--card-solid,#161a26)]/60 border border-[var(--border)] space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-1.5 font-medium text-[var(--text)]">
                                    <span className={`w-2 h-2 rounded-full ${
                                      (r.progress_percent ?? 0) >= 100
                                        ? 'bg-emerald-500'
                                        : 'bg-emerald-500 animate-pulse'
                                    }`} />
                                    <span>Supervision Progress</span>
                                    {r.assignment_status && (
                                      <span className="text-[10px] text-[var(--muted)] font-normal">
                                        ({r.assignment_status === 'completed' ? 'Completed' : r.assignment_status === 'in_progress' ? 'In Progress' : 'Pending'})
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-bold text-xs text-indigo-500 dark:text-indigo-400">
                                    {Math.round(r.progress_percent ?? 0)}%
                                  </span>
                                </div>

                                {/* Progress Bar Track */}
                                <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-800/80 overflow-hidden relative">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      (r.progress_percent ?? 0) >= 100
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                        : (r.progress_percent ?? 0) >= 50
                                        ? 'bg-gradient-to-r from-indigo-500 to-cyan-400'
                                        : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(0, r.progress_percent ?? 0))}%` }}
                                  />
                                </div>

                                {r.assignment_deadline && (
                                  <div className="flex items-center justify-between text-[11px] text-[var(--muted)] pt-0.5">
                                    <span>Target Deadline:</span>
                                    <span className="font-medium text-[var(--text)]">{r.assignment_deadline}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[var(--border)]/50">
                              <p className="text-[11px] text-[var(--muted)]">
                                Submitted {new Date(r.created_at).toLocaleDateString()}
                              </p>
                              {canModify(r) && (
                                <div className="flex items-center gap-1.5">
                                  <button type="button" onClick={() => startEdit(r)} title="Edit request"
                                    className="inline-flex items-center justify-center w-7 h-7 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 rounded-lg transition-colors border border-indigo-500/20 hover:border-indigo-500/35 active:scale-95">
                                    <HiOutlinePencil size={13}/>
                                  </button>
                                  <button type="button" onClick={() => deleteRequest(r.id)} title="Withdraw request"
                                    className="inline-flex items-center justify-center w-7 h-7 bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 rounded-lg transition-colors border border-red-500/20 hover:border-red-500/35 active:scale-95">
                                    <HiOutlineTrash size={13}/>
                                  </button>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Smooth multi-stop bottom fade gradient when collapsed */}
                  {!showAllRequests && hasMore && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-[#ffffff] via-[#ffffff]/75 to-transparent dark:from-[#171b26] dark:via-[#171b26]/75 rounded-b-2xl"
                    />
                  )}

                  {/* See more / Show less toggle button */}
                  {hasMore && (
                    <div className="mt-4 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setShowAllRequests(!showAllRequests)}
                        className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 active:scale-95 border border-indigo-500/25 transition-all shadow-sm hover:shadow cursor-pointer backdrop-blur-sm"
                      >
                        <span>
                          {showAllRequests
                            ? 'Show less'
                            : `See more (${requests.length - COLLAPSED_REQUEST_COUNT} older request${requests.length - COLLAPSED_REQUEST_COUNT === 1 ? '' : 's'})`}
                        </span>
                        <HiOutlineChevronDown
                          size={14}
                          className={`transition-transform duration-300 ${
                            showAllRequests ? 'rotate-180' : 'group-hover:translate-y-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  )}
                </div>
              )
            })()
          }
        </div>
      </div>
    </DashboardLayout>
  )
}
