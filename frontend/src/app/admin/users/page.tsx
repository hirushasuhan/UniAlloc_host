'use client'
import { useEffect, useState, FormEvent } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { api } from '@/lib/api'
import { HiOutlinePlus, HiOutlineMagnifyingGlass, HiOutlineUserPlus, HiOutlineUserMinus, HiOutlineXMark, HiOutlineKey, HiOutlineTrash } from 'react-icons/hi2'

const ROLES = ['system_admin','dean','department_head','lecturer','student']
const TITLES = ['Prof', 'Dr', 'Mr', 'Mrs', 'Ms', 'Miss', 'Rev', 'Thero']
const POSITIONS = ['Senior Professor', 'Professor', 'Associate Professor', 'Senior Lecturer', 'Senior Lecturer (Grade I)', 'Senior Lecturer (Grade II)', 'Lecturer', 'Lecturer (Grade I)', 'Lecturer (Grade II)', 'Probationary Lecturer', 'Assistant Lecturer', 'Temporary Lecturer', 'Visiting Lecturer', 'Instructor', 'Demonstrator', 'Research Assistant']

export default function AdminUsersPage() {
  const [users,   setUsers]   = useState<any[]>([])
  const [depts,   setDepts]   = useState<any[]>([])
  const [faculties, setFaculties] = useState<any[]>([])
  const [search,  setSearch]  = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState<{text:string;ok:boolean}|null>(null)

  // Faculty select state inside creation modal
  const [selectedFaculty, setSelectedFaculty] = useState<string>('')

  const [form, setForm] = useState({
    full_name:'', title:'', position:'', email:'', password:'', role_id:'4',
    department_id:'', contact:'', capacity_hours:'40'
  })

  const load = () => {
    // include_inactive → deactivated accounts stay visible so they can be reactivated/deleted
    api.get('/users?include_inactive=1').then(r => setUsers(r.data.data ?? []))
    api.get('/departments').then(r => setDepts(r.data.data ?? []))
    api.get('/faculties').then(r => setFaculties(r.data.data ?? []))
  }
  useEffect(() => { load() }, [])

  // Listen to role changes to dynamically clean up selection states
  useEffect(() => {
    if (form.role_id === '1') {
      // System Admin: Reset both faculty and department
      setSelectedFaculty('')
      setForm(f => ({ ...f, department_id: '' }))
    } else if (form.role_id === '2') {
      // Dean: Reset department only
      setForm(f => ({ ...f, department_id: '' }))
    }
  }, [form.role_id])

  const filtered = users.filter(u => {
    const matchSearch = u.full_name.toLowerCase().includes(search.toLowerCase()) ||
                        u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole   = roleFilter ? u.role_name === roleFilter : true
    const matchStatus = statusFilter === '' ? true : (statusFilter === 'active' ? !!u.is_active : !u.is_active)
    return matchSearch && matchRole && matchStatus
  })

  async function handleCreate(e: FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(null)
    try {
      await api.post('/users', {
        ...form,
        title:          form.title || null,
        position:       form.position || null,
        role_id:        parseInt(form.role_id),
        department_id:  form.department_id ? parseInt(form.department_id) : null,
        capacity_hours: parseFloat(form.capacity_hours),
      })
      setMsg({ text: 'User created successfully.', ok: true })
      setShowModal(false)
      setForm({ full_name:'', title:'', position:'', email:'', password:'', role_id:'4', department_id:'', contact:'', capacity_hours:'40' })
      setSelectedFaculty('')
      load()
    } catch(err:any) {
      setMsg({ text: err.response?.data?.message ?? 'Failed to create user.', ok: false })
    } finally { setSaving(false) }
  }

  async function toggleActive(id:number, current:number) {
    try {
      await api.put(`/users/${id}`, { is_active: current ? 0 : 1 })
      setMsg({ text: current ? 'User deactivated. You can reactivate them anytime.' : 'User reactivated successfully.', ok: true })
      load()
    } catch(err:any) {
      setMsg({ text: err.response?.data?.message ?? 'Failed to update user status.', ok: false })
    }
  }

  async function deleteUser(u: any) {
    const warning =
      `PERMANENTLY DELETE "${u.full_name}"?\n\n` +
      `This will remove the user AND all their data from the system:\n` +
      `• Assignments & progress logs\n• Work requests & appeals\n` +
      `• Student requests & notifications\n• Promotion & audit history\n\n` +
      `This CANNOT be undone. Continue?`
    if (!confirm(warning)) return
    try {
      await api.delete(`/users/${u.id}?permanent=1`)
      setMsg({ text: `"${u.full_name}" and all related data were permanently deleted.`, ok: true })
      load()
    } catch(err:any) {
      setMsg({ text: err.response?.data?.message ?? 'Failed to delete user.', ok: false })
    }
  }

  async function updateTitle(id:number, title:string) {
    try {
      await api.put(`/users/${id}`, { title: title || null })
      load()
    } catch(err:any) {
      setMsg({ text: err.response?.data?.message ?? 'Failed to update title.', ok: false })
    }
  }

  async function updatePosition(id:number, position:string) {
    try {
      await api.put(`/users/${id}`, { position: position || null })
      load()
    } catch(err:any) {
      setMsg({ text: err.response?.data?.message ?? 'Failed to update position.', ok: false })
    }
  }

  async function resetPassword(id: number) {
    if (!confirm('Are you sure you want to reset this user\'s password? They will also need to re-enroll their authenticator app on next login.')) return;
    try {
      const res = await api.post(`/users/${id}/reset-password`, {})
      alert(`Success! The new password for this user is: ${res.data.data.new_password}\n\nThey will be asked to set up their authenticator app again the next time they log in.`)
    } catch(err:any) {
      alert(err.response?.data?.message ?? 'Failed to reset password.')
    }
  }

  const roleColor: Record<string,string> = {
    system_admin:'bg-purple-100 text-purple-700',
    dean:'bg-indigo-100 text-indigo-700',
    department_head:'bg-blue-100 text-blue-700',
    lecturer:'bg-teal-100 text-teal-700',
    student:'bg-slate-100 text-slate-700',
    on_study_leave: 'bg-amber-100 text-amber-700',
  }

  return (
    <DashboardLayout requiredRole="system_admin">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">User Management</h1>
          <p className="text-[var(--muted)] text-sm mt-1">{users.length} total users</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <HiOutlinePlus size={16}/> Add User
        </button>
      </div>

      {msg && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm ${msg.ok ? 'bg-green-500/10 border border-green-500/30 text-green-600' : 'bg-red-500/10 border border-red-500/30 text-red-500'}`}>
          {msg.text}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <HiOutlineMagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            className="input pl-9" placeholder="Search by name or email…"/>
        </div>
        <select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)} className="input max-w-[180px]">
          <option value="">All Roles</option>
          {ROLES.map(r => (
            <option key={r} value={r}>
              {r.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
            </option>
          ))}
        </select>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="input max-w-[150px]">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {['User','Title / Position','Role','Department','Capacity','Status','Actions'].map(h=>(
                <th key={h} className="text-left py-3 px-4 text-[var(--muted)] font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u:any) => (
              <tr key={u.id} className="border-b border-[var(--border)]/50 hover:bg-[var(--bg)]/50 align-top">
                {/* User: display name (title + name) + email underneath */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3 min-w-[180px]">
                    <div className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}>
                      {(u.full_name?.[0] ?? '?').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{u.title ? `${u.title}. ` : ''}{u.full_name}</div>
                      <div className="text-xs text-[var(--muted)] truncate">{u.email}</div>
                    </div>
                  </div>
                </td>

                {/* Title / Position: two compact stacked quick-edit dropdowns */}
                <td className="py-3 px-4">
                  <div className="flex flex-col gap-1.5 min-w-[185px]">
                    <select
                      value={u.title ?? ''}
                      onChange={e => updateTitle(u.id, e.target.value)}
                      className="input py-1 px-2 text-xs"
                    >
                      <option value="">— Title —</option>
                      {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select
                      value={u.position ?? ''}
                      onChange={e => updatePosition(u.id, e.target.value)}
                      className="input py-1 px-2 text-xs"
                    >
                      <option value="">— Position —</option>
                      {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </td>

                <td className="py-3 px-4">
                  <span className={`badge whitespace-nowrap ${roleColor[u.role_name] ?? 'bg-slate-100 text-slate-700'}`}>
                    {(u.role_name ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                  </span>
                </td>
                <td className="py-3 px-4 text-[var(--muted)] whitespace-nowrap">{u.dept_name ?? '—'}</td>
                <td className="py-3 px-4 text-[var(--muted)] whitespace-nowrap">{u.capacity_hours}h</td>
                <td className="py-3 px-4">
                  <div className="flex flex-col gap-1 items-start">
                    <span className={`badge whitespace-nowrap ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className={`badge whitespace-nowrap ${u.totp_enabled ? 'bg-cyan-100 text-cyan-700' : 'bg-amber-100 text-amber-700'}`} title="Self-service password recovery via authenticator app">
                      {u.totp_enabled ? '2FA Enrolled' : '2FA Not Set'}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => resetPassword(u.id)} title="Reset Password"
                      className="inline-flex items-center justify-center w-7 h-7 bg-white/5 hover:bg-cyan-500/20 text-cyan-500 rounded-md transition-colors border border-white/5 hover:border-cyan-500/30">
                      <HiOutlineKey size={14} />
                    </button>
                    <button onClick={() => toggleActive(u.id, u.is_active)} title={u.is_active ? 'Deactivate' : 'Activate'}
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-md border transition-colors
                        ${u.is_active
                          ? 'text-red-500 bg-white/5 hover:bg-red-500/20 border-white/5 hover:border-red-500/30'
                          : 'text-green-500 bg-white/5 hover:bg-green-500/20 border-white/5 hover:border-green-500/30'}`}>
                      {u.is_active ? <HiOutlineUserMinus size={14}/> : <HiOutlineUserPlus size={14}/>}
                    </button>
                    <button onClick={() => deleteUser(u)} title="Permanently delete this user and all their data"
                      className="inline-flex items-center justify-center w-7 h-7 bg-white/5 hover:bg-red-500/20 text-red-500 rounded-md transition-colors border border-white/5 hover:border-red-500/30">
                      <HiOutlineTrash size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-[var(--muted)]">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-md p-6 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--text)]">
              <HiOutlineXMark size={18}/>
            </button>
            <h2 className="font-heading font-semibold text-lg mb-5">Create New User</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Full Name *</label>
                  <input value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} className="input" required placeholder="John Smith"/>
                </div>
                <div className="col-span-2 md:col-span-1 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Title</label>
                    <select value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} className="input">
                      <option value="">— None —</option>
                      {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Position</label>
                    <select value={form.position} onChange={e=>setForm(f=>({...f,position:e.target.value}))} className="input">
                      <option value="">— None —</option>
                      {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} className="input" required placeholder="john@university.edu"/>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Password *</label>
                  <input type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} className="input" required placeholder="Minimum 8 characters"/>
                </div>
                
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Role *</label>
                  <select value={form.role_id} onChange={e=>setForm(f=>({...f,role_id:e.target.value}))} className="input">
                    <option value="1">System Admin</option>
                    <option value="2">Dean</option>
                    <option value="3">Department Head</option>
                    <option value="4">Lecturer</option>
                    <option value="5">Student</option>
                  </select>
                </div>
                
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Faculty</label>
                  <select 
                    value={selectedFaculty} 
                    onChange={e => {
                      setSelectedFaculty(e.target.value)
                      setForm(f => ({ ...f, department_id: '' }))
                    }} 
                    className="input"
                    disabled={form.role_id === '1'}
                  >
                    <option value="">— Select Faculty —</option>
                    {faculties.map((f: any) => (
                      <option key={f.id} value={f.id}>{f.faculty_name}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Department</label>
                  <select 
                    value={form.department_id} 
                    onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))} 
                    className="input"
                    disabled={['1', '2'].includes(form.role_id) || !selectedFaculty}
                  >
                    <option value="">
                      {['1', '2'].includes(form.role_id) 
                        ? '— N/A for this Role —' 
                        : !selectedFaculty 
                          ? '— Select Faculty first —' 
                          : '— None —'
                      }
                    </option>
                    {depts
                      .filter((d: any) => d.faculty_id === parseInt(selectedFaculty))
                      .map((d: any) => {
                        const hasHead = d.head_id !== null && d.head_id !== undefined && d.head_id !== '';
                        const isHeadRole = form.role_id === '3';
                        const shouldDisable = isHeadRole && hasHead;
                        
                        return (
                          <option 
                            key={d.id} 
                            value={d.id}
                            disabled={shouldDisable}
                          >
                            {d.dept_name} {shouldDisable ? ' (Already has Head)' : ''}
                          </option>
                        );
                      })
                    }
                  </select>
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Contact</label>
                  <input value={form.contact} onChange={e=>setForm(f=>({...f,contact:e.target.value}))} className="input" placeholder="+94 77 000 0000"/>
                </div>
                
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Capacity (hrs/week)</label>
                  <input type="number" value={form.capacity_hours} onChange={e=>setForm(f=>({...f,capacity_hours:e.target.value}))} className="input" min="0" max="80"/>
                </div>
              </div>
              
              <button type="submit" disabled={saving} className="btn-primary w-full justify-center mt-2">
                {saving ? 'Creating…' : 'Create User'}
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
