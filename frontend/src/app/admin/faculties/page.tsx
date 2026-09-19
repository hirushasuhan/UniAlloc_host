'use client'
import { useEffect, useState, FormEvent } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { api } from '@/lib/api'
import { HiOutlinePlus, HiOutlineXMark, HiOutlineChevronDown, HiOutlineChevronUp } from 'react-icons/hi2'

export default function AdminFacultiesPage() {
  const [faculties, setFaculties] = useState<any[]>([])
  const [depts,     setDepts]     = useState<any[]>([])
  const [users,     setUsers]     = useState<any[]>([])
  const [expanded,  setExpanded]  = useState<number[]>([])
  const [showModal, setShowModal] = useState(false)
  const [deptModal, setDeptModal] = useState<number|null>(null)
  const [deanModal, setDeanModal] = useState<number|null>(null)
  const [saving,    setSaving]    = useState(false)
  const [msg,       setMsg]       = useState<{text:string;ok:boolean}|null>(null)

  const [facForm, setFacForm] = useState({ faculty_name:'', dean_id:'' })
  const [deptForm, setDeptForm] = useState({ dept_name:'', head_id:'' })
  const [deanForm, setDeanForm] = useState({ dean_id:'' })

  const load = () => {
    api.get('/faculties').then(r => setFaculties(r.data.data ?? []))
    api.get('/departments').then(r => setDepts(r.data.data ?? []))
    api.get('/users').then(r => setUsers(r.data.data ?? []))
  }
  useEffect(() => { load() }, [])

  const deans = users.filter(u => u.role_name === 'dean')
  const heads  = users.filter(u => u.role_name === 'department_head')

  async function createFaculty(e: FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(null)
    try {
      await api.post('/faculties', { faculty_name: facForm.faculty_name, dean_id: facForm.dean_id || null })
      setMsg({ text: 'Faculty created.', ok: true })
      setShowModal(false); setFacForm({ faculty_name:'', dean_id:'' }); load()
    } catch(err:any) { setMsg({ text: err.response?.data?.message ?? 'Error', ok: false }) }
    finally { setSaving(false) }
  }

  function openDeanModal(f: any) {
    setDeanForm({ dean_id: f.dean_id ? String(f.dean_id) : '' })
    setDeanModal(f.id)
  }

  async function saveDean(e: FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(null)
    try {
      await api.put(`/faculties/${deanModal}`, { dean_id: deanForm.dean_id ? Number(deanForm.dean_id) : null })
      setMsg({ text: 'Dean assignment updated.', ok: true })
      setDeanModal(null); load()
    } catch(err:any) { setMsg({ text: err.response?.data?.message ?? 'Error', ok: false }) }
    finally { setSaving(false) }
  }

  async function createDept(e: FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(null)
    try {
      await api.post('/departments', {
        dept_name: deptForm.dept_name,
        faculty_id: deptModal,
        head_id: deptForm.head_id || null,
      })
      setMsg({ text: 'Department created.', ok: true })
      setDeptModal(null); setDeptForm({ dept_name:'', head_id:'' }); load()
    } catch(err:any) { setMsg({ text: err.response?.data?.message ?? 'Error', ok: false }) }
    finally { setSaving(false) }
  }

  const toggle = (id:number) => setExpanded(e => e.includes(id) ? e.filter(x=>x!==id) : [...e, id])

  return (
    <DashboardLayout requiredRole="system_admin">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">Faculties & Departments</h1>
          <p className="text-[var(--muted)] text-sm mt-1">{faculties.length} faculties · {depts.length} departments</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <HiOutlinePlus size={16}/> Add Faculty
        </button>
      </div>

      {msg && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm ${msg.ok ? 'bg-green-500/10 border border-green-500/30 text-green-600' : 'bg-red-500/10 border border-red-500/30 text-red-500'}`}>
          {msg.text}
        </div>
      )}

      <div className="space-y-4">
        {faculties.map((f:any) => {
          const facDepts = depts.filter((d:any) => d.faculty_id === f.id)
          const open     = expanded.includes(f.id)
          return (
            <div key={f.id} className="glass-card overflow-hidden">
              <div className="flex items-center justify-between p-5 cursor-pointer" onClick={() => toggle(f.id)}>
                <div>
                  <h3 className="font-heading font-semibold">{f.faculty_name}</h3>
                  <p className="text-sm text-[var(--muted)] mt-0.5">
                    Dean: {f.dean_name ?? '—'} · {facDepts.length} department{facDepts.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={e => { e.stopPropagation(); openDeanModal(f) }}
                    className="btn-secondary text-xs py-1.5 px-3" title="Assign / change dean">
                    Edit Dean
                  </button>
                  <button onClick={e => { e.stopPropagation(); setDeptModal(f.id) }}
                    className="btn-secondary text-xs py-1.5 px-3" title="Add department">
                    <HiOutlinePlus size={13}/> Add Dept
                  </button>
                  {open ? <HiOutlineChevronUp size={18} className="text-[var(--muted)]"/> : <HiOutlineChevronDown size={18} className="text-[var(--muted)]"/>}
                </div>
              </div>
              {open && facDepts.length > 0 && (
                <div className="border-t border-[var(--border)] divide-y divide-[var(--border)]/50">
                  {facDepts.map((d:any) => (
                    <div key={d.id} className="flex items-center justify-between px-5 py-3 bg-[var(--bg)]/40">
                      <div>
                        <p className="text-sm font-medium">{d.dept_name}</p>
                        <p className="text-xs text-[var(--muted)]">Head: {d.head_name ?? '—'}</p>
                      </div>
                      <span className="text-xs text-[var(--muted)]">ID #{d.id}</span>
                    </div>
                  ))}
                </div>
              )}
              {open && facDepts.length === 0 && (
                <p className="px-5 pb-4 text-sm text-[var(--muted)] border-t border-[var(--border)]">No departments yet.</p>
              )}
            </div>
          )
        })}
        {faculties.length === 0 && (
          <div className="glass-card p-8 text-center text-[var(--muted)]">No faculties found.</div>
        )}
      </div>

      {/* Add Faculty Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-md p-6 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-[var(--muted)]"><HiOutlineXMark size={18}/></button>
            <h2 className="font-heading font-semibold text-lg mb-5">Create Faculty</h2>
            <form onSubmit={createFaculty} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Faculty Name *</label>
                <input value={facForm.faculty_name} onChange={e=>setFacForm(f=>({...f,faculty_name:e.target.value}))} className="input" required placeholder="e.g. Faculty of Computing"/>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Assign Dean</label>
                <select value={facForm.dean_id} onChange={e=>setFacForm(f=>({...f,dean_id:e.target.value}))} className="input">
                  <option value="">— None —</option>
                  {deans.map((d:any) => <option key={d.id} value={d.id}>{d.position ? `${d.position}. ` : ''}{d.full_name}</option>)}
                </select>
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full justify-center">{saving?'Creating…':'Create Faculty'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Dean Modal */}
      {deanModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-md p-6 relative">
            <button onClick={() => setDeanModal(null)} className="absolute top-4 right-4 text-[var(--muted)]"><HiOutlineXMark size={18}/></button>
            <h2 className="font-heading font-semibold text-lg mb-1">Assign Dean</h2>
            <p className="text-sm text-[var(--muted)] mb-5">
              Faculty: <strong>{faculties.find(f=>f.id===deanModal)?.faculty_name}</strong>
            </p>
            <form onSubmit={saveDean} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Dean</label>
                <select value={deanForm.dean_id} onChange={e=>setDeanForm({dean_id:e.target.value})} className="input">
                  <option value="">— None —</option>
                  {deans.map((d:any) => <option key={d.id} value={d.id}>{d.position ? `${d.position}. ` : ''}{d.full_name}</option>)}
                </select>
                <p className="text-xs text-[var(--muted)] mt-1.5">
                  This links the dean's account to this faculty. Without it, the dean's dashboard (Staff &amp; Workload) will show no data.
                </p>
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full justify-center">{saving?'Saving…':'Save'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Add Department Modal */}
      {deptModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-md p-6 relative">
            <button onClick={() => setDeptModal(null)} className="absolute top-4 right-4 text-[var(--muted)]"><HiOutlineXMark size={18}/></button>
            <h2 className="font-heading font-semibold text-lg mb-1">Add Department</h2>
            <p className="text-sm text-[var(--muted)] mb-5">
              Faculty: <strong>{faculties.find(f=>f.id===deptModal)?.faculty_name}</strong>
            </p>
            <form onSubmit={createDept} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Department Name *</label>
                <input value={deptForm.dept_name} onChange={e=>setDeptForm(f=>({...f,dept_name:e.target.value}))} className="input" required placeholder="e.g. Computer Science"/>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Assign Department Head</label>
                <select value={deptForm.head_id} onChange={e=>setDeptForm(f=>({...f,head_id:e.target.value}))} className="input">
                  <option value="">— None —</option>
                  {heads.map((h:any) => <option key={h.id} value={h.id}>{h.position ? `${h.position}. ` : ''}{h.full_name}</option>)}
                </select>
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full justify-center">{saving?'Creating…':'Add Department'}</button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
