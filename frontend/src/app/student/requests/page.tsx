'use client'
import { useEffect, useState, FormEvent } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { api } from '@/lib/api'
import { getUser } from '@/lib/auth'
import { validateContact, normaliseContact } from '@/lib/validation'
import { HiOutlinePencil, HiOutlineTrash, HiOutlineXMark, HiOutlineCheck } from 'react-icons/hi2'

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

  const load = () => api.get('/student-requests').then(r => setRequests(r.data.data ?? []))

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
          <h2 className="font-heading font-semibold text-lg mb-4">My Requests</h2>
          {requests.length === 0
            ? <p className="text-[var(--muted)] text-sm">No requests submitted yet.</p>
            : (() => {
              const visibleRequests = showAllRequests ? requests : requests.slice(0, COLLAPSED_REQUEST_COUNT)
              const hasMore = requests.length > COLLAPSED_REQUEST_COUNT
              const list = (
                <div className="space-y-4">
                {visibleRequests.map((r: any) => (
                  <div key={r.id} className="p-4 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
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
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <p className="font-semibold text-sm">{r.title}</p>
                          {(() => { const st = stageLabel(r); return (
                            <span className={`badge flex-shrink-0 ${st.cls}`}>{st.text}</span>
                          )})()}
                        </div>
                        {r.description && <p className="text-xs text-[var(--muted)] line-clamp-2">{r.description}</p>}
                        <p className="text-xs text-[var(--muted)] mt-1.5">
                          {r.faculty_name}{r.dept_name ? ` · ${r.dept_name}` : ''}
                        </p>
                        {r.assigned_to_name && (
                          <p className="text-xs text-indigo-500 mt-1">Supervisor: {r.assigned_to_name}</p>
                        )}
                        <div className="flex items-center justify-between mt-1.5">
                          <p className="text-xs text-[var(--muted)]">
                            Submitted {new Date(r.created_at).toLocaleDateString()}
                          </p>
                          {canModify(r) && (
                            <div className="flex items-center gap-1">
                              <button type="button" onClick={() => startEdit(r)} title="Edit request"
                                className="inline-flex items-center justify-center w-7 h-7 bg-white/5 hover:bg-cyan-500/20 text-cyan-500 rounded-md transition-colors border border-white/5 hover:border-cyan-500/30">
                                <HiOutlinePencil size={14}/>
                              </button>
                              <button type="button" onClick={() => deleteRequest(r.id)} title="Withdraw request"
                                className="inline-flex items-center justify-center w-7 h-7 bg-white/5 hover:bg-red-500/20 text-red-500 rounded-md transition-colors border border-white/5 hover:border-red-500/30">
                                <HiOutlineTrash size={14}/>
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
                </div>
              )
              return hasMore && showAllRequests ? (
                <div className="max-h-[520px] overflow-y-auto pr-1 -mr-1">
                  {list}
                  <button type="button" onClick={() => setShowAllRequests(false)}
                    className="w-full mt-3 text-xs text-center text-[var(--muted)] hover:text-[var(--text)] transition-colors py-1.5">
                    Show fewer
                  </button>
                </div>
              ) : hasMore ? (
                <div className="relative">
                  {list}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--card)] to-transparent" />
                  <button type="button" onClick={() => setShowAllRequests(true)}
                    className="relative w-full -mt-2 text-xs font-medium text-center text-[var(--accent)] hover:opacity-80 transition-opacity py-1.5">
                    See more ({requests.length - COLLAPSED_REQUEST_COUNT} more)
                  </button>
                </div>
              ) : list
            })()
          }
        </div>
      </div>
    </DashboardLayout>
  )
}
