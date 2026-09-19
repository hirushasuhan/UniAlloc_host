'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import AssignmentModal from '@/components/ui/AssignmentModal'
import DeadlineAlerts from '@/components/ui/DeadlineAlerts'
import { api } from '@/lib/api'
import { getUser } from '@/lib/auth'
import { HiOutlinePlus, HiOutlineMagnifyingGlass } from 'react-icons/hi2'

const PRIORITY_COLOR: Record<string,string> = {
  urgent: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700', low: 'bg-slate-100 text-slate-700'
}
const STATUS_COLOR: Record<string,string> = {
  completed: 'bg-green-100 text-green-700', in_progress: 'bg-blue-100 text-blue-700',
  pending: 'bg-amber-100 text-amber-700', cancelled: 'bg-red-100 text-red-700',
  review_pending: 'bg-purple-100 text-purple-700'
}

export default function DeanAssignmentsPage() {
  const user = getUser()
  const [assignments, setAssignments] = useState<any[]>([])
  const [users,       setUsers]       = useState<any[]>([])
  const [depts,       setDepts]       = useState<any[]>([])
  const [search,      setSearch]      = useState('')
  const [statusF,     setStatusF]     = useState('')
  const [showModal,   setShowModal]   = useState(false)

  const load = () => api.get('/assignments').then(r => setAssignments(r.data.data ?? []))

  useEffect(() => {
    load()
    api.get('/users').then(r => setUsers(r.data.data ?? []))
    api.get('/departments').then(r => setDepts(r.data.data ?? []))
  }, [])

  const filtered = assignments.filter(a => {
    const matchS = !search  || a.title.toLowerCase().includes(search.toLowerCase()) || a.assigned_to_name?.toLowerCase().includes(search.toLowerCase())
    const matchSt = !statusF || a.status === statusF
    return matchS && matchSt
  })

  async function updateStatus(id:number, status:string) {
    await api.put(`/assignments/${id}`, { status }); load()
  }

  return (
    <DashboardLayout requiredRole="dean">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">Assignments</h1>
          <p className="text-[var(--muted)] text-sm mt-1">{assignments.length} total assignments in your faculty</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary"><HiOutlinePlus size={16}/> New Assignment</button>
      </div>

      {/* Overdue & approaching-deadline assignments */}
      <DeadlineAlerts assignments={assignments} onChanged={load} />

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <HiOutlineMagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} className="input pl-9" placeholder="Search assignments…"/>
        </div>
        <select value={statusF} onChange={e=>setStatusF(e.target.value)} className="input max-w-[160px]">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {['Title','Assigned To','Priority','Est. Hours','Deadline','Progress','Status','Action'].map(h=>(
                <th key={h} className="text-left py-3 px-4 text-[var(--muted)] font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((a:any) => (
              <tr key={a.id} className="border-b border-[var(--border)]/50 hover:bg-[var(--bg)]/50">
                <td className="py-3 px-4 font-medium max-w-[200px] truncate">{a.title}</td>
                <td className="py-3 px-4 text-[var(--muted)]">{a.assigned_to_name}</td>
                <td className="py-3 px-4"><span className={`badge ${PRIORITY_COLOR[a.priority]}`}>{a.priority}</span></td>
                <td className="py-3 px-4 text-[var(--muted)]">{a.estimated_hours}h</td>
                <td className="py-3 px-4 text-[var(--muted)]">{a.deadline ?? '—'}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-[var(--border)]">
                      <div className="h-1.5 rounded-full bg-indigo-500" style={{width:`${a.latest_progress??0}%`}}/>
                    </div>
                    <span className="text-xs text-[var(--muted)]">{a.latest_progress??0}%</span>
                  </div>
                </td>
                <td className="py-3 px-4"><span className={`badge ${STATUS_COLOR[a.status] || 'bg-slate-100 text-slate-700'}`}>{a.status.replace('_',' ')}</span></td>
                <td className="py-3 px-4 flex gap-2">
                  {a.status === 'review_pending' && (
                    <button onClick={() => updateStatus(a.id, 'completed')} className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded hover:bg-green-100">Approve</button>
                  )}
                  {a.status === 'pending' && (
                    <button onClick={() => updateStatus(a.id, 'cancelled')}
                      className="text-xs text-red-500 hover:underline">Cancel</button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="py-8 text-center text-[var(--muted)]">No assignments found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && user && (
        <AssignmentModal users={users} depts={depts} assignedBy={user.id}
          onClose={() => setShowModal(false)} onCreated={load}/>
      )}
    </DashboardLayout>
  )
}
