'use client'
import { useState, FormEvent, useEffect } from 'react'
import { api } from '@/lib/api'
import { getUser } from '@/lib/auth'
import { HiOutlineXMark, HiOutlineSparkles, HiOutlinePaperAirplane } from 'react-icons/hi2'

interface Props {
  users: any[]
  depts: any[]
  assignedBy: number
  defaultDeptId?: number | null
  onClose: () => void
  onCreated: () => void
}

export default function AssignmentModal({ users, depts, assignedBy, defaultDeptId, onClose, onCreated }: Props) {
  const [mode, setMode] = useState<'direct' | 'request'>('direct')
  
  // Direct Assignment Form
  const [form, setForm] = useState({
    title: '', description: '', assigned_to: '', department_id: String(defaultDeptId ?? ''),
    priority: 'medium', estimated_hours: '4', deadline: ''
  })
  
  // Cross-Faculty Request Form
  const [requestForm, setRequestForm] = useState({
    title: '', description: '', target_faculty_id: '', target_role: 'dean', target_user_id: ''
  })

  const [allFaculties, setAllFaculties] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')

  // Display helper: prefix academic position (e.g. "Dr. ", "Prof. ") before the name
  const displayName = (u: any) => u.position ? `${u.position}. ${u.full_name}` : u.full_name

  // Today's date (local) in YYYY-MM-DD — used to block past deadlines
  const today = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()

  // Staff selectable only AFTER a department is chosen — filtered by that department
  const lecturers = form.department_id
    ? users.filter(u =>
        ['lecturer', 'department_head'].includes(u.role_name) &&
        u.department_id === parseInt(form.department_id)
      )
    : []

  useEffect(() => {
    api.get('/faculties').then(r => {
      const list = r.data.data ?? []
      setAllFaculties(list)
      
      // Pre-select first external faculty
      const currentUser = getUser()
      const ext = list.filter((f: any) => f.id !== currentUser?.faculty_id)
      if (ext.length > 0) {
        setRequestForm(f => ({ ...f, target_faculty_id: ext[0].id.toString() }))
      }
    })
    api.get('/users?all_faculties=true').then(r => setAllUsers(r.data.data ?? []))
  }, [])

  // Auto-reset target user when faculty or role changes
  useEffect(() => {
    setRequestForm(f => ({ ...f, target_user_id: '' }))
  }, [requestForm.target_faculty_id, requestForm.target_role])

  const currentUser = getUser()
  const currentFacultyId = currentUser?.faculty_id
  const externalFaculties = allFaculties.filter(f => f.id !== currentFacultyId)

  // Department heads can only assign within their own department
  const availableDepts = currentUser?.role === 'department_head'
    ? depts.filter((d: any) => d.id === currentUser?.dept_id)
    : depts

  // Filter external users by target faculty and target role
  const filteredTargetUsers = allUsers.filter(u => {
    const matchesFaculty = u.faculty_id === parseInt(requestForm.target_faculty_id)
    const matchesRole = u.role_name === requestForm.target_role
    return matchesFaculty && matchesRole
  })

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setSaving(true); setErr('')
    try {
      if (mode === 'direct') {
        if (form.deadline && form.deadline < today) {
          throw new Error('Deadline cannot be a past date.')
        }
        await api.post('/assignments', {
          title:           form.title,
          description:     form.description || null,
          assigned_to:     parseInt(form.assigned_to),
          department_id:   form.department_id ? parseInt(form.department_id) : null,
          priority:        form.priority,
          estimated_hours: parseFloat(form.estimated_hours),
          deadline:        form.deadline || null,
        })
      } else {
        if (!requestForm.target_user_id) {
          throw new Error('Please select a target staff member.')
        }
        await api.post('/work-requests', {
          request_type:      'cross_faculty',
          title:             requestForm.title,
          description:       requestForm.description || null,
          target_faculty_id: parseInt(requestForm.target_faculty_id),
          target_user_id:    parseInt(requestForm.target_user_id)
        })
      }
      onCreated()
      onClose()
    } catch(e:any) {
      setErr(e.response?.data?.message ?? e.message ?? 'An error occurred.')
    } finally { setSaving(false) }
  }

  const f = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }))
  const rf = (key: string, val: string) => setRequestForm(p => ({ ...p, [key]: val }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[var(--card-solid)] shadow-2xl rounded-2xl border border-[var(--border)] w-full max-w-lg p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--text)]"><HiOutlineXMark size={18}/></button>
        
        <h2 className="font-heading font-semibold text-lg mb-4">Allocate Work</h2>

        {/* Tab Switcher */}
        <div className="flex border-b border-[var(--border)] mb-5">
          <button
            type="button"
            onClick={() => setMode('direct')}
            className={`flex-1 text-center pb-2.5 text-sm font-semibold border-b-2 transition-all ${
              mode === 'direct'
                ? 'border-indigo-500 text-indigo-500 font-semibold'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            Direct Assign (Internal)
          </button>
          <button
            type="button"
            onClick={() => setMode('request')}
            className={`flex-1 text-center pb-2.5 text-sm font-semibold border-b-2 transition-all ${
              mode === 'request'
                ? 'border-indigo-500 text-indigo-500 font-semibold'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            Cross-Faculty Request
          </button>
        </div>

        {err && <div className="mb-4 text-sm text-red-500 bg-red-500/10 rounded-xl px-3 py-2 border border-red-500/20">{err}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'direct' ? (
            /* Direct Assignment Form */
            <>
              <div>
                <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Title *</label>
                <input value={form.title} onChange={e=>f('title',e.target.value)} className="input" required placeholder="e.g. CS101 Lecturing"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Description</label>
                <textarea value={form.description} onChange={e=>f('description',e.target.value)} className="input" rows={2} placeholder="Optional details…"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Department *</label>
                  <select
                    value={form.department_id}
                    onChange={e => setForm(p => ({ ...p, department_id: e.target.value, assigned_to: '' }))}
                    className="input"
                    required
                  >
                    <option value="">— Select Department —</option>
                    {availableDepts.map((d:any) => <option key={d.id} value={d.id}>{d.dept_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Assign To *</label>
                  <select
                    value={form.assigned_to}
                    onChange={e=>f('assigned_to',e.target.value)}
                    className="input"
                    required
                    disabled={!form.department_id}
                  >
                    <option value="">{form.department_id ? '— Select Staff —' : 'Select department first'}</option>
                    {lecturers.map((u:any) => (
                      <option key={u.id} value={u.id}>{displayName(u)} ({u.role_name.replace('_',' ')})</option>
                    ))}
                  </select>
                  {form.department_id && lecturers.length === 0 && (
                    <p className="text-[10px] text-amber-500 mt-1 font-semibold">
                      ⚠ No staff found in this department.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Priority</label>
                  <select value={form.priority} onChange={e=>f('priority',e.target.value)} className="input">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Est. Hours</label>
                  <input type="number" value={form.estimated_hours} onChange={e=>f('estimated_hours',e.target.value)} className="input" min="0.5" step="0.5"/>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Deadline</label>
                  <input type="date" min={today} value={form.deadline} onChange={e=>f('deadline',e.target.value)} className="input"/>
                </div>
              </div>
            </>
          ) : (
            /* Cross Faculty Request Form */
            <>
              <div>
                <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Title *</label>
                <input value={requestForm.title} onChange={e=>rf('title',e.target.value)} className="input" required placeholder="e.g. Cross-Faculty Software Curriculum Peer Review"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Description</label>
                <textarea value={requestForm.description} onChange={e=>rf('description',e.target.value)} className="input" rows={2} placeholder="Explain the tasks, expected outputs, or context…"/>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Target Faculty *</label>
                  <select 
                    required 
                    value={requestForm.target_faculty_id} 
                    onChange={e=>rf('target_faculty_id',e.target.value)} 
                    className="input"
                  >
                    {externalFaculties.map((f:any) => (
                      <option key={f.id} value={f.id}>{f.faculty_name}</option>
                    ))}
                    {externalFaculties.length === 0 && (
                      <option value="">No other faculties found</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Target Role *</label>
                  <select 
                    required 
                    value={requestForm.target_role} 
                    onChange={e=>rf('target_role',e.target.value)} 
                    className="input"
                  >
                    <option value="dean">Faculty Dean</option>
                    <option value="department_head">Department Head</option>
                    <option value="lecturer">Lecturer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Target Member *</label>
                <select 
                  required 
                  value={requestForm.target_user_id} 
                  onChange={e=>rf('target_user_id',e.target.value)} 
                  className="input"
                  disabled={!requestForm.target_faculty_id}
                >
                  <option value="">— Select Target Staff —</option>
                  {filteredTargetUsers.map((u:any) => (
                    <option key={u.id} value={u.id}>
                      {displayName(u)} ({u.dept_name ?? 'Dean'})
                    </option>
                  ))}
                </select>
                {requestForm.target_faculty_id && filteredTargetUsers.length === 0 && (
                  <p className="text-[10px] text-amber-500 mt-1 font-semibold">
                    ⚠ No academic staff found with this role in the selected faculty.
                  </p>
                )}
              </div>
            </>
          )}
          
          <button 
            type="submit" 
            disabled={saving} 
            className="btn-primary w-full justify-center mt-2 shadow-md hover:shadow-lg inline-flex items-center gap-2"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                {mode === 'direct' ? 'Creating Assignment…' : 'Submitting Request…'}
              </span>
            ) : (
              mode === 'direct' ? 'Create Assignment' : (
                <span className="inline-flex items-center gap-1.5">
                  <HiOutlinePaperAirplane size={14} /> Send Cross-Faculty Request
                </span>
              )
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
