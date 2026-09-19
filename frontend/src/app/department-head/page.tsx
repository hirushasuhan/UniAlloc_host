'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { api } from '@/lib/api'
import { getUser } from '@/lib/auth'
import DashboardBanner from '@/components/ui/DashboardBanner'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts'
import {
  HiOutlineExclamationTriangle, HiOutlineSparkles, HiOutlineUsers,
  HiOutlineMagnifyingGlass,
  HiOutlineEnvelope as Mail, HiOutlinePhone as Phone, HiOutlineBriefcase,
  HiOutlineClock as Clock, HiOutlineBookOpen
} from 'react-icons/hi2'

export default function DeptHeadDashboard() {
  const [workload,     setWorkload]     = useState<any[]>([])
  const [assignments,  setAssignments]  = useState<any[]>([])
  const [inboxReqs,    setInboxReqs]    = useState<any[]>([])
  const [users,        setUsers]        = useState<any[]>([])

  const [activeTab, setActiveTab] = useState<'overview' | 'staff'>('overview')
  const [selectedStaff, setSelectedStaff] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [isDark, setIsDark] = useState(false)

  const currentUser = getUser()

  useEffect(() => {
    load()
    api.get('/users').then(r => setUsers(r.data.data ?? []))
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
  }, [activeTab])

  const load = () => {
    api.get('/capacity').then(r => setWorkload(r.data.data ?? []))
    api.get('/assignments').then(r => setAssignments(r.data.data ?? []))
    api.get('/work-requests').then(r => setInboxReqs(r.data.data ?? []))
  }

  async function updateWorkReqStatus(id: number, action: string) {
    try {
      await api.patch(`/work-requests/${id}`, { action })
      load()
    } catch (err) {
      console.error(err)
    }
  }

  const overloaded = workload.filter(w => w.is_overloaded)

  // Capacity chart data: label the department head's own bar as "You"
  const workloadChartData = workload.map(w => ({
    ...w,
    full_name: w.user_id === currentUser?.id ? 'You' : w.full_name
  }))

  // Staff of this department (Department Head + Lecturers)
  const staffMembers = users.filter(
    u => u.role_name === 'department_head' || u.role_name === 'lecturer'
  )

  const displayName = (u: any) => u.position ? `${u.position}. ${u.full_name}` : u.full_name

  const roleBadge = (u: any) =>
    u.role_name === 'department_head'
      ? { label: 'Dept Head', className: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' }
      : { label: 'Lecturer', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' }

  const getStaffWorkload = (userId: number) => workload.find(w => w.user_id === userId)

  const filteredStaff = staffMembers.filter(u => {
    const matchesSearch = u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === 'all' || u.role_name === roleFilter
    return matchesSearch && matchesRole
  })

  // Selected staff statistics
  const staffAssignments = selectedStaff
    ? assignments.filter(a => a.assigned_to === selectedStaff.id)
    : []
  const activeAssignments = staffAssignments.filter(
    a => a.status === 'pending' || a.status === 'in_progress'
  )

  const totalAllocated = activeAssignments.reduce((acc, curr) => acc + parseFloat(curr.estimated_hours), 0)
  const capacity = selectedStaff ? parseFloat(selectedStaff.capacity_hours) : 0
  const available = Math.max(0, capacity - totalAllocated)
  const utilizationPct = capacity > 0 ? Math.round((totalAllocated / capacity) * 100) : 0

  const pieData = activeAssignments.map((a) => ({
    name: a.title,
    value: parseFloat(a.estimated_hours),
    type: 'assignment'
  }))
  if (available > 0) {
    pieData.push({ name: 'Available Hours', value: available, type: 'available' })
  }

  const COLORS = [
    '#6366f1', '#3b82f6', '#10b981', '#06b6d4', '#f59e0b',
    '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#ef4444',
  ]
  const getSliceColor = (item: any, index: number) => {
    if (item.type === 'available') return isDark ? '#334155' : '#cbd5e1'
    return COLORS[index % COLORS.length]
  }

  return (
    <DashboardLayout requiredRole="department_head">
      <DashboardBanner />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-heading font-bold mb-1">Department Head Dashboard</h1>
          <p className="text-[var(--muted)] text-sm">Manage your department's assignments and workload</p>
        </div>
      </div>

      {overloaded.length > 0 && (
        <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 flex items-start gap-3">
          <HiOutlineExclamationTriangle size={18} className="text-red-500 mt-0.5 flex-shrink-0"/>
          <div>
            <p className="text-sm font-semibold text-red-600">Overload Alert</p>
            <p className="text-sm text-red-500">{overloaded.map(w => w.full_name).join(', ')} exceeded capacity threshold.</p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-[var(--border)] mb-8">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-6 py-3 font-medium text-sm border-b-2 transition-all ${
            activeTab === 'overview'
              ? 'border-indigo-500 text-indigo-500 font-semibold'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          <HiOutlineSparkles size={16} /> Overview
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 px-6 py-3 font-medium text-sm border-b-2 transition-all ${
            activeTab === 'staff'
              ? 'border-indigo-500 text-indigo-500 font-semibold'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          <HiOutlineUsers size={16} /> Staff & Workloads
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Workload Chart */}
          <div className="glass-card p-6">
            <h2 className="font-heading font-semibold text-lg mb-4">Department Workload</h2>
            {workload.length === 0
              ? <p className="text-[var(--muted)] text-sm">No data available.</p>
              : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={workloadChartData} margin={{ top: 4, right: 8, bottom: 32, left: 0 }}>
                    <XAxis dataKey="full_name" tick={{ fontSize: 11 }} interval={0} angle={-35} textAnchor="end" height={60} />
                    <YAxis domain={[0,100]} unit="%" tick={{ fontSize: 11 }}/>
                    <Tooltip formatter={(v: number) => `${v}%`}/>
                    <Bar dataKey="utilization_pct" radius={[6,6,0,0]}>
                      {workloadChartData.map((w, i) => (
                        <Cell key={i} fill={w.is_overloaded ? '#ef4444' : '#10b981'}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )
            }
          </div>

          {/* Cross-dept Request Inbox */}
          <div className="glass-card p-6">
            <h2 className="font-heading font-semibold text-lg mb-4">Incoming Requests</h2>
            {inboxReqs.length === 0
              ? <p className="text-[var(--muted)] text-sm">No pending requests.</p>
              : (
                <div className="space-y-3">
                  {inboxReqs.filter(r => r.status === 'pending').slice(0, 5).map((r: any) => (
                    <div key={r.id} className="p-3 rounded-xl bg-[var(--bg)] flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">{r.title}</p>
                        <p className="text-xs text-[var(--muted)]">from {r.requester_name}</p>
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => updateWorkReqStatus(r.id, 'approve')} className="text-[10px] font-semibold bg-green-50 text-green-600 px-2 py-1 rounded hover:bg-green-100">Approve</button>
                          <button onClick={() => updateWorkReqStatus(r.id, 'reject')} className="text-[10px] font-semibold bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100">Reject</button>
                        </div>
                      </div>
                      <span className="badge bg-amber-100 text-amber-700">pending</span>
                    </div>
                  ))}
                </div>
              )
            }
          </div>

          {/* Recent Assignments */}
          <div className="glass-card p-6 lg:col-span-2">
            <h2 className="font-heading font-semibold text-lg mb-4">Recent Assignments</h2>
            {assignments.length === 0
              ? <p className="text-[var(--muted)] text-sm">No assignments found.</p>
              : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        {['Title','Assigned To','Priority','Deadline','Status'].map(h => (
                          <th key={h} className="text-left py-2 px-3 text-[var(--muted)] font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.slice(0, 10).map((a: any) => (
                        <tr key={a.id} className="border-b border-[var(--border)]/50 hover:bg-[var(--bg)]/50">
                          <td className="py-2 px-3 font-medium">{a.title}</td>
                          <td className="py-2 px-3 text-[var(--muted)]">{a.assigned_to_name}</td>
                          <td className="py-2 px-3">
                            <span className={`badge ${a.priority === 'urgent' ? 'bg-red-100 text-red-700' : a.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}>
                              {a.priority}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-[var(--muted)]">{a.deadline ?? '—'}</td>
                          <td className="py-2 px-3">
                            <span className={`badge ${a.status === 'completed' ? 'bg-green-100 text-green-700' : a.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
          </div>
        </div>
      )}

      {activeTab === 'staff' && (
        /* Staff & Workloads - Master Detail layout, scoped to this department */
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* Left Panel: Directory List */}
          <div className="col-span-12 lg:col-span-4 border-r border-[var(--border)] lg:pr-6 h-[calc(100vh-320px)] flex flex-col">
            <div className="space-y-3 mb-4">
              <div className="relative">
                <HiOutlineMagnifyingGlass className="absolute left-3 top-2.5 text-[var(--muted)]" size={16} />
                <input
                  type="text"
                  placeholder="Search staff by name/email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="input pl-9"
                />
              </div>
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="input py-2 text-xs"
              >
                <option value="all">All Roles</option>
                <option value="department_head">Dept Head</option>
                <option value="lecturer">Lecturers</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {filteredStaff.map((u: any) => {
                const wl = getStaffWorkload(u.id)
                const utilization = wl ? wl.utilization_pct : 0
                const isOverloaded = wl ? wl.is_overloaded : false
                const isSelected = selectedStaff?.id === u.id

                return (
                  <div
                    key={u.id}
                    onClick={() => setSelectedStaff(u)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-indigo-50/70 border-indigo-500 shadow-sm dark:bg-indigo-950/20 dark:border-indigo-500'
                        : 'bg-[var(--card)] border-[var(--border)] hover:bg-[var(--bg)]/50'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <h4 className="font-heading font-semibold text-sm truncate">
                          {displayName(u)}{u.id === currentUser?.id ? ' (You)' : ''}
                        </h4>
                        <p className="text-xs text-[var(--muted)] mt-0.5 truncate">{u.dept_name ?? 'No Department'}</p>
                        <p className="text-[11px] text-[var(--muted)]/80 mt-0.5 truncate flex items-center gap-1">
                          <Mail size={10} className="shrink-0" /> {u.email}
                        </p>
                      </div>
                      <span className={`badge shrink-0 text-[10px] ${roleBadge(u).className}`}>
                        {roleBadge(u).label}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="w-full h-1 rounded-full bg-[var(--border)]">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isOverloaded ? 'bg-red-500' : utilization < 50 ? 'bg-emerald-500' : 'bg-indigo-500'
                            }`}
                            style={{ width: `${Math.min(utilization, 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className={`text-xs font-semibold shrink-0 ${
                        isOverloaded ? 'text-red-500' : utilization < 50 ? 'text-emerald-500' : 'text-indigo-500'
                      }`}>
                        {utilization}%
                      </span>
                    </div>
                  </div>
                )
              })}

              {filteredStaff.length === 0 && (
                <div className="text-center py-8 text-[var(--muted)] text-sm">
                  No matching staff found.
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Staff Detail */}
          <div className="col-span-12 lg:col-span-8 lg:pl-6 h-[calc(100vh-320px)] overflow-y-auto pr-1">
            {!selectedStaff ? (
              <div className="glass-card h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 flex items-center justify-center mb-4">
                  <HiOutlineUsers size={32} />
                </div>
                <h3 className="font-heading font-semibold text-lg">No Staff Selected</h3>
                <p className="text-[var(--muted)] text-sm mt-1 max-w-sm">
                  Select a lecturer (or yourself) from the department directory to inspect workloads, pie charts, and active assignments.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Profile Card */}
                <div className="glass-card p-6 bg-gradient-to-br from-[var(--card)] to-[var(--bg)]/30">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xl font-bold font-heading shadow-md">
                        {selectedStaff.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-heading font-bold text-xl">
                            {displayName(selectedStaff)}{selectedStaff.id === currentUser?.id ? ' (You)' : ''}
                          </h2>
                          <span className={`badge text-xs ${roleBadge(selectedStaff).className}`}>
                            {roleBadge(selectedStaff).label === 'Dept Head' ? 'Department Head' : 'Lecturer'}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--muted)] mt-1 flex items-center gap-1.5">
                          <HiOutlineBriefcase size={14} /> {selectedStaff.dept_name ?? 'Unassigned Department'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col text-xs text-[var(--muted)] md:text-right gap-1 border-t md:border-t-0 border-[var(--border)] pt-3 md:pt-0">
                      <p className="flex items-center md:justify-end gap-1.5"><Mail size={12} /> {selectedStaff.email}</p>
                      {selectedStaff.contact && (
                        <p className="flex items-center md:justify-end gap-1.5"><Phone size={12} /> {selectedStaff.contact}</p>
                      )}
                      <p className="flex items-center md:justify-end gap-1.5"><Clock size={12} /> Capacity: {selectedStaff.capacity_hours} hrs/week</p>
                      {selectedStaff.id !== currentUser?.id && (
                        <a
                          href={`mailto:${selectedStaff.email}`}
                          className="btn-secondary text-[11px] py-1.5 px-2.5 mt-2 rounded-lg inline-flex items-center gap-1.5 self-start md:self-end"
                        >
                          <Mail size={12} /> Send Mail
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Workload Analysis Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Pie Chart Card */}
                  <div className="glass-card p-6 flex flex-col justify-between">
                    <div>
                      <h3 className="font-heading font-semibold text-base mb-1">Workload Allocation</h3>
                      <p className="text-[var(--muted)] text-xs mb-4">Pie chart representing task time estimates vs remaining capacity</p>
                    </div>

                    {activeAssignments.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center py-6">
                        <div className="w-24 h-24 rounded-full border-8 border-emerald-500/10 flex items-center justify-center text-emerald-500 text-xs font-bold mb-3">
                          100% Free
                        </div>
                        <p className="text-sm font-medium">All Available</p>
                        <p className="text-xs text-[var(--muted)] text-center mt-0.5">No tasks assigned for this week.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center flex-1">
                        <div className="w-full h-[180px] relative flex justify-center items-center">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={75}
                                paddingAngle={2}
                                dataKey="value"
                              >
                                {pieData.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={getSliceColor(entry, index)} />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value: any, name: any) => {
                                  const hours = parseFloat(value)
                                  const percentage = Math.round((hours / capacity) * 100)
                                  return [`${hours} hrs (${percentage}%)`, name]
                                }}
                                contentStyle={{
                                  background: isDark ? '#1e1e2e' : '#ffffff',
                                  border: '1px solid var(--border)',
                                  borderRadius: '12px',
                                  fontSize: '12px',
                                  color: 'var(--text)'
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>

                          <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none">
                            <span className={`text-xl font-heading font-bold ${
                              utilizationPct >= 90 ? 'text-red-500' : 'text-indigo-500'
                            }`}>
                              {utilizationPct}%
                            </span>
                            <span className="text-[10px] text-[var(--muted)] uppercase font-semibold tracking-wider">
                              Utilised
                            </span>
                          </div>
                        </div>

                        <div className="w-full mt-4 space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                          {pieData.map((entry: any, index: number) => {
                            const pct = Math.round((entry.value / capacity) * 100)
                            return (
                              <div key={index} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getSliceColor(entry, index) }} />
                                  <span className="font-medium truncate text-[var(--text)]">{entry.name}</span>
                                </div>
                                <span className="text-[var(--muted)] font-semibold shrink-0">{entry.value} hrs ({pct}%)</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {totalAllocated > capacity && (
                      <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-2.5 flex items-start gap-2">
                        <HiOutlineExclamationTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-red-600">Capacity Exceeded</p>
                          <p className="text-[10px] text-red-500 mt-0.5">
                            This member is overloaded by <strong className="font-bold">{(totalAllocated - capacity).toFixed(1)} hours</strong>. Suggest rescheduling or delegating.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Capacity Summary Stats Card */}
                  <div className="glass-card p-6 flex flex-col justify-between">
                    <div>
                      <h3 className="font-heading font-semibold text-base mb-1">Hours Breakdown</h3>
                      <p className="text-[var(--muted)] text-xs mb-6">Summary of allocated and remaining weekly hours</p>
                    </div>

                    <div className="space-y-4 flex-1 justify-center flex flex-col">
                      <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]/50">
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-slate-400" />
                          <span className="text-sm font-medium text-[var(--muted)]">Total Weekly Capacity</span>
                        </div>
                        <span className="text-sm font-bold">{capacity} hrs</span>
                      </div>

                      <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]/50">
                        <div className="flex items-center gap-2">
                          <HiOutlineBriefcase size={16} className="text-indigo-500" />
                          <span className="text-sm font-medium text-[var(--muted)]">Allocated Task Hours</span>
                        </div>
                        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{totalAllocated.toFixed(1)} hrs</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <HiOutlineUsers size={16} className="text-emerald-500" />
                          <span className="text-sm font-medium text-[var(--muted)]">Remaining Free Hours</span>
                        </div>
                        <span className={`text-sm font-bold ${available > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                          {available.toFixed(1)} hrs
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-[var(--border)]/50">
                      <div className="flex justify-between items-center mb-1.5 text-xs font-semibold">
                        <span className="text-[var(--muted)]">Allocation Ratio</span>
                        <span className={totalAllocated > capacity ? 'text-red-500' : 'text-indigo-500'}>
                          {totalAllocated.toFixed(1)} / {capacity} hrs
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[var(--border)] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            totalAllocated > capacity
                              ? 'bg-gradient-to-r from-red-500 to-rose-600'
                              : 'bg-gradient-to-r from-indigo-500 to-violet-600'
                          }`}
                          style={{ width: `${Math.min(utilizationPct, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Task Details List */}
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-heading font-semibold text-base">Allocated Tasks ({staffAssignments.length})</h3>
                      <p className="text-[var(--muted)] text-xs mt-0.5">List of all active, pending, and completed assignments</p>
                    </div>
                  </div>

                  {staffAssignments.length === 0 ? (
                    <div className="text-center py-8 text-[var(--muted)] text-sm flex flex-col items-center justify-center">
                      <HiOutlineBookOpen size={24} className="mb-2 text-slate-300" />
                      No assignments found for this staff member.
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--border)]/40 max-h-[300px] overflow-y-auto pr-1">
                      {staffAssignments.map((a: any) => {
                        const progress = a.latest_progress ?? 0
                        return (
                          <div key={a.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-medium text-sm text-[var(--text)] truncate">{a.title}</h4>
                                <span className={`badge text-[10px] uppercase font-bold tracking-wider ${
                                  a.priority === 'urgent'
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                                    : a.priority === 'high'
                                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                }`}>
                                  {a.priority}
                                </span>
                                <span className={`badge text-[10px] ${
                                  a.status === 'completed'
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                                    : a.status === 'in_progress'
                                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                                }`}>
                                  {a.status.replace('_', ' ')}
                                </span>
                              </div>
                              {a.description && (
                                <p className="text-xs text-[var(--muted)] mt-1 line-clamp-1">{a.description}</p>
                              )}
                              {a.deadline && (
                                <p className="text-[10px] text-[var(--muted)] mt-1 font-semibold">
                                  Deadline: {new Date(a.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                              <div className="flex flex-col items-end gap-1 min-w-[80px]">
                                <span className="text-xs font-semibold text-[var(--text)]">{progress}%</span>
                                <div className="w-16 h-1 rounded-full bg-[var(--border)]">
                                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress}%` }} />
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block">{a.estimated_hours} hrs</span>
                                <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider font-semibold">Estimate</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
