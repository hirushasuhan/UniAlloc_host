'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { api } from '@/lib/api'
import { getUser } from '@/lib/auth'
import DashboardBanner from '@/components/ui/DashboardBanner'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts'
import { HiOutlineClipboardDocumentList, HiOutlineUsers, HiOutlinePaperAirplane, HiOutlineExclamationTriangle, HiOutlineMagnifyingGlass, HiOutlineChevronRight as ChevronRight, HiOutlineEnvelope as Mail, HiOutlinePhone as Phone, HiOutlineBookOpen, HiOutlineClock as Clock, HiOutlineBriefcase, HiOutlineTrophy, HiOutlineSparkles, HiOutlineUserPlus } from 'react-icons/hi2'

const POSITIONS = ['Senior Prof', 'Prof', 'Dr', 'Senior Lecturer', 'Lecturer', 'Mr', 'Mrs', 'Ms', 'Miss', 'Rev', 'Thero']

export default function DeanDashboard() {
  const [assignments, setAssignments] = useState<any[]>([])
  const [workload,    setWorkload]    = useState<any[]>([])
  const [studentReqs, setStudentReqs] = useState<any[]>([])
  const [users,       setUsers]       = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  
  // Navigation & Filtering
  const [activeTab, setActiveTab] = useState<'analytics' | 'staff' | 'management'>('analytics')
  const [selectedLecturer, setSelectedLecturer] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  
  // New Staff Management state
  const [newStaffForm, setNewStaffForm] = useState({
    full_name: '',
    position: '',
    email: '',
    password: '',
    role_id: '4', // Default to Lecturer
    department_id: '',
    contact: '',
    capacity_hours: '40'
  })
  const [staffSaving, setStaffSaving] = useState(false)
  const [staffMsg, setStaffMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [promotingId, setPromotingId] = useState<number | null>(null)
  
  const [isDark, setIsDark] = useState(false)
  const [deptsWithoutHead, setDeptsWithoutHead] = useState<any[]>([])

  const loadData = () => {
    api.get('/assignments').then(r => setAssignments(r.data.data ?? []))
    api.get('/capacity').then(r => setWorkload(r.data.data ?? []))
    api.get('/student-requests').then(r => setStudentReqs(r.data.data ?? []))
    api.get('/users').then(r => setUsers(r.data.data ?? []))
    api.get('/vacancies').then(r => setDeptsWithoutHead(r.data.data?.departments_without_head ?? [])).catch(() => {})
  }

  useEffect(() => {
    loadData()
    api.get('/departments').then(r => {
      const depts = r.data.data ?? []
      setDepartments(depts)
      if (depts.length > 0) {
        setNewStaffForm(f => ({ ...f, department_id: depts[0].id.toString() }))
      }
    })
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
  }, [activeTab])

  const pending   = assignments.filter(a => a.status === 'pending').length
  const inProg    = assignments.filter(a => a.status === 'in_progress').length
  const overloaded= workload.filter(w => w.is_overloaded).length

  // Filter staff members (Department Heads and Lecturers)
  const staffMembers = users.filter(
    u => u.role_name === 'department_head' || u.role_name === 'lecturer'
  )

  // The logged-in dean, so their own workload can be shown alongside their staff
  const currentUser = getUser()
  const selfDean = users.find(u => u.role_name === 'dean' && u.id === currentUser?.id)

  // Staff & Workloads directory: staff + the dean themselves (Staff Management stays staff-only)
  const workloadDirectory = selfDean ? [selfDean, ...staffMembers] : staffMembers

  // Capacity chart data: label the dean's own bar as "You" instead of their name
  const workloadChartData = workload.map(w => ({
    ...w,
    full_name: w.user_id === currentUser?.id ? 'You' : w.full_name
  }))

  const displayName = (u: any) => u.title ? `${u.title}. ${u.full_name}` : u.full_name

  const roleBadge = (u: any) =>
    u.role_name === 'dean'
      ? { label: 'Dean', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' }
      : u.role_name === 'department_head'
        ? { label: 'Dept Head', className: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' }
        : { label: 'Lecturer', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' }

  const staffSubtitle = (u: any) =>
    u.role_name === 'dean' ? `${u.faculty_name ?? 'Faculty'} (Faculty-wide)` : (u.dept_name ?? 'No Department')

  // Departments that already have an ACTIVE Department Head. A head who is On
  // Study Leave (or deactivated) leaves the seat effectively vacant, so a
  // replacement can be promoted in their place.
  const deptsWithHead = new Set(
    staffMembers.filter(u => u.role_name === 'department_head' && u.department_id != null
                          && u.is_active && (u.operational_status ?? 'Available') !== 'On Study Leave')
                .map(u => u.department_id)
  )

  const getStaffWorkload = (userId: number) => {
    return workload.find(w => w.user_id === userId)
  }

  const filteredStaff = workloadDirectory.filter(u => {
    const matchesSearch = u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDept = deptFilter === 'all' || u.department_id === parseInt(deptFilter)
    const matchesRole = roleFilter === 'all' || u.role_name === roleFilter
    return matchesSearch && matchesDept && matchesRole
  })

  // Selected Lecturer statistics
  const lecturerAssignments = selectedLecturer 
    ? assignments.filter(a => a.assigned_to === selectedLecturer.id)
    : []
  const activeAssignments = lecturerAssignments.filter(
    a => a.status === 'pending' || a.status === 'in_progress'
  )

  const totalAllocated = activeAssignments.reduce((acc, curr) => acc + parseFloat(curr.estimated_hours), 0)
  const capacity = selectedLecturer ? parseFloat(selectedLecturer.capacity_hours) : 0
  const available = Math.max(0, capacity - totalAllocated)
  const utilizationPct = capacity > 0 ? Math.round((totalAllocated / capacity) * 100) : 0

  // Pie chart data structure
  const pieData = activeAssignments.map((a) => ({
    name: a.title,
    value: parseFloat(a.estimated_hours),
    type: 'assignment'
  }))

  if (available > 0) {
    pieData.push({
      name: 'Available Hours',
      value: available,
      type: 'available'
    })
  }

  // Slice Color mappings
  const COLORS = [
    '#6366f1', // Indigo
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#06b6d4', // Cyan
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#8b5cf6', // Violet
    '#14b8a6', // Teal
    '#f97316', // Orange
    '#ef4444', // Red
  ]

  const getSliceColor = (item: any, index: number) => {
    if (item.type === 'available') {
      return isDark ? '#334155' : '#cbd5e1'
    }
    return COLORS[index % COLORS.length]
  }

  // Staff creation form submit
  async function handleCreateStaff(e: React.FormEvent) {
    e.preventDefault()
    setStaffSaving(true)
    setStaffMsg(null)
    try {
      await api.post('/users', {
        full_name: newStaffForm.full_name,
        position: newStaffForm.position || null,
        email: newStaffForm.email,
        password: newStaffForm.password,
        role_id: parseInt(newStaffForm.role_id),
        department_id: parseInt(newStaffForm.department_id),
        contact: newStaffForm.contact || null,
        capacity_hours: parseFloat(newStaffForm.capacity_hours)
      })
      setStaffMsg({ text: 'Staff member created successfully.', ok: true })
      setNewStaffForm({
        full_name: '',
        position: '',
        email: '',
        password: '',
        role_id: '4',
        department_id: departments[0]?.id.toString() ?? '',
        contact: '',
        capacity_hours: '40'
      })
      loadData()
    } catch (err: any) {
      setStaffMsg({ text: err.response?.data?.message ?? 'Failed to create staff member.', ok: false })
    } finally {
      setStaffSaving(false)
    }
  }

  async function updateStudentReqStatus(id: number, action: string) {
    try {
      await api.patch(`/student-requests/${id}`, { action })
      loadData()
    } catch (err) {
      console.error(err)
    }
  }

  // Lecturer <-> Dept Head promotion handler. When promoting to Department Head
  // the target department is the lecturer's own department (required by the API).
  async function handlePromoteStaff(user: any) {
    setPromotingId(user.id)
    setStaffMsg(null)
    const newRole = user.role_name === 'lecturer' ? 'department_head' : 'lecturer'
    try {
      const payload: any = { user_id: user.id, new_role: newRole }
      if (newRole === 'department_head') payload.department_id = user.department_id
      await api.post('/promotions', payload)
      setStaffMsg({
        text: `Staff member ${newRole === 'department_head' ? 'promoted to Department Head' : 'changed to Lecturer'} successfully.`,
        ok: true
      })
      loadData()
    } catch (err: any) {
      setStaffMsg({ text: err.response?.data?.message ?? 'Failed to initiate promotion.', ok: false })
    } finally {
      setPromotingId(null)
    }
  }

  return (
    <DashboardLayout requiredRole="dean">
      <DashboardBanner />
      <h1 className="text-2xl font-heading font-bold mb-2">Dean Dashboard</h1>
      <p className="text-[var(--muted)] text-sm mb-8">Faculty-wide workload & assignment overview</p>

      {/* Department-head vacancy alert (this faculty) */}
      {deptsWithoutHead.length > 0 && (
        <div className="mb-8 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3">
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-semibold text-sm">
            <HiOutlineExclamationTriangle size={18}/> Departments without an active Head
          </div>
          <ul className="mt-2 space-y-1 text-sm">
            {deptsWithoutHead.map((d: any) => (
              <li key={d.id}>
                <span className="font-medium">{d.dept_name}</span>
                <span className="text-[var(--muted)]"> — no Head assigned. Please assign a Department Head.</span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => { setActiveTab('management'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-orange-600 dark:text-orange-400 hover:underline"
          >
            Go to Staff Management →
          </button>
        </div>
      )}

      {/* KPI Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Assignments',   value: assignments.length,   icon: <HiOutlineClipboardDocumentList size={18}/>, color: 'from-indigo-500 to-violet-600' },
          { label: 'Pending',             value: pending,              icon: <HiOutlineClipboardDocumentList size={18}/>, color: 'from-amber-500 to-orange-600' },
          { label: 'In Progress',         value: inProg,               icon: <HiOutlineClipboardDocumentList size={18}/>, color: 'from-blue-500 to-cyan-600' },
          { label: 'Overloaded Lecturers',value: overloaded,           icon: <HiOutlineExclamationTriangle size={18}/>, color: 'from-red-500 to-rose-600' },
        ].map(k => (
          <div key={k.label} className="glass-card p-5">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${k.color} flex items-center justify-center text-white mb-3`}>
              {k.icon}
            </div>
            <p className="text-3xl font-heading font-bold">{k.value}</p>
            <p className="text-[var(--muted)] text-sm mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Sleek Tab Navigation */}
      <div className="flex border-b border-[var(--border)] mb-8">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-6 py-3 font-medium text-sm border-b-2 transition-all ${
            activeTab === 'analytics'
              ? 'border-indigo-500 text-indigo-500 font-semibold'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          <HiOutlineSparkles size={16} /> Faculty Analytics
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
        <button
          onClick={() => setActiveTab('management')}
          className={`flex items-center gap-2 px-6 py-3 font-medium text-sm border-b-2 transition-all ${
            activeTab === 'management'
              ? 'border-indigo-500 text-indigo-500 font-semibold'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          <HiOutlineUserPlus size={16} /> Staff Management
        </button>
      </div>

      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Capacity Chart */}
          <div className="glass-card p-6">
            <h2 className="font-heading font-semibold text-lg mb-4">Staff Capacity (incl. Dean)</h2>
            {workload.length === 0
              ? <p className="text-[var(--muted)] text-sm">No workload data.</p>
              : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={workloadChartData} margin={{ top: 4, right: 8, bottom: 32, left: 0 }}>
                    <XAxis
                      dataKey="full_name"
                      tick={{ fontSize: 11 }}
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => `${v}%`} />
                    <Bar dataKey="utilization_pct" radius={[6,6,0,0]}>
                      {workloadChartData.map((w, i) => (
                        <Cell key={i} fill={w.is_overloaded ? '#ef4444' : '#6366f1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )
            }
          </div>

          {/* Student Requests */}
          <div className="glass-card p-6">
            <h2 className="font-heading font-semibold text-lg mb-4">Student Supervisor Requests</h2>
            {studentReqs.length === 0
              ? <p className="text-[var(--muted)] text-sm">No student requests yet.</p>
              : (
                <div className="space-y-3">
                  {studentReqs.slice(0, 5).map((r: any) => (
                    <div key={r.id} className="flex items-start justify-between gap-4 p-3 rounded-xl bg-[var(--bg)]">
                      <div>
                        <p className="text-sm font-medium">{r.title}</p>
                        <p className="text-xs text-[var(--muted)]">by {r.student_name} ({r.dept_name ?? 'Faculty-wide'})</p>
                        {r.status === 'pending' && (
                          <div className="flex gap-2 mt-2">
                            <Link href="/dean/student-requests" className="text-[10px] font-semibold bg-green-50 text-green-600 px-2 py-1 rounded hover:bg-green-100">Review & Assign</Link>
                            <button onClick={() => updateStudentReqStatus(r.id, 'reject')} className="text-[10px] font-semibold bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100">Reject</button>
                          </div>
                        )}
                      </div>
                      <span className={`badge ${r.status === 'pending' ? 'bg-amber-100 text-amber-700' : r.status === 'assigned' || r.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        </div>
      )}

      {activeTab === 'staff' && (
        /* Staff & Workloads Tab - Master Detail layout */
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* Left Panel: Directory List */}
          <div className="col-span-12 lg:col-span-4 border-r border-[var(--border)] lg:pr-6 h-[calc(100vh-280px)] flex flex-col">
            {/* Search & Filters */}
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
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={deptFilter}
                  onChange={e => setDeptFilter(e.target.value)}
                  className="input py-2 text-xs"
                >
                  <option value="all">All Departments</option>
                  {departments.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.dept_name}</option>
                  ))}
                </select>
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="input py-2 text-xs"
                >
                  <option value="all">All Roles</option>
                  <option value="department_head">Dept Heads</option>
                  <option value="lecturer">Lecturers</option>
                </select>
              </div>
            </div>

            {/* List of Staff */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {filteredStaff.map((u: any) => {
                const wl = getStaffWorkload(u.id)
                const utilization = wl ? wl.utilization_pct : 0
                const isOverloaded = wl ? wl.is_overloaded : false
                const isSelected = selectedLecturer?.id === u.id

                return (
                  <div
                    key={u.id}
                    onClick={() => setSelectedLecturer(u)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-indigo-50/70 border-indigo-500 shadow-sm dark:bg-indigo-950/20 dark:border-indigo-500'
                        : 'bg-[var(--card)] border-[var(--border)] hover:bg-[var(--bg)]/50'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <h4 className="font-heading font-semibold text-sm truncate">{displayName(u)}{u.role_name === 'dean' ? ' (You)' : ''}</h4>
                        <p className="text-xs text-[var(--muted)] mt-0.5 truncate">{staffSubtitle(u)}</p>
                        <p className="text-[11px] text-[var(--muted)]/80 mt-0.5 truncate flex items-center gap-1">
                          <Mail size={10} className="shrink-0" /> {u.email}
                        </p>
                      </div>
                      <span className={`badge shrink-0 text-[10px] ${roleBadge(u).className}`}>
                        {roleBadge(u).label}
                      </span>
                    </div>
                    
                    {/* Mini Workload Indicator */}
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
          <div className="col-span-12 lg:col-span-8 lg:pl-6 h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {!selectedLecturer ? (
              <div className="glass-card h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 flex items-center justify-center mb-4">
                  <HiOutlineUsers size={32} />
                </div>
                <h3 className="font-heading font-semibold text-lg">No Staff Selected</h3>
                <p className="text-[var(--muted)] text-sm mt-1 max-w-sm">
                  Select a department head or lecturer from the faculty directory to inspect their workloads, pie charts, and active assignments.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Profile Card */}
                <div className="glass-card p-6 bg-gradient-to-br from-[var(--card)] to-[var(--bg)]/30">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xl font-bold font-heading shadow-md">
                        {selectedLecturer.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-heading font-bold text-xl">{displayName(selectedLecturer)}{selectedLecturer.role_name === 'dean' ? ' (You)' : ''}</h2>
                          <span className={`badge text-xs ${roleBadge(selectedLecturer).className}`}>
                            {selectedLecturer.role_name === 'dean' ? 'Dean' : selectedLecturer.role_name === 'department_head' ? 'Department Head' : 'Lecturer'}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--muted)] mt-1 flex items-center gap-1.5">
                          <HiOutlineBriefcase size={14} /> {selectedLecturer.role_name === 'dean' ? staffSubtitle(selectedLecturer) : (selectedLecturer.dept_name ?? 'Unassigned Department')}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col text-xs text-[var(--muted)] md:text-right gap-1 border-t md:border-t-0 border-[var(--border)] pt-3 md:pt-0">
                      <p className="flex items-center md:justify-end gap-1.5"><Mail size={12} /> {selectedLecturer.email}</p>
                      {selectedLecturer.contact && (
                        <p className="flex items-center md:justify-end gap-1.5"><Phone size={12} /> {selectedLecturer.contact}</p>
                      )}
                      <p className="flex items-center md:justify-end gap-1.5"><Clock size={12} /> Capacity: {selectedLecturer.capacity_hours} hrs/week</p>
                      {selectedLecturer.role_name !== 'dean' && (
                        <a
                          href={`mailto:${selectedLecturer.email}`}
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
                                formatter={(value: any, name: any, props: any) => {
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
                          
                          {/* Center Text inside Donut Chart */}
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

                        {/* Custom Color-Coded Legend */}
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

                    {/* Overload Alert Warning */}
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
                          <HiOutlineUserPlus size={16} className="text-emerald-500" />
                          <span className="text-sm font-medium text-[var(--muted)]">Remaining Free Hours</span>
                        </div>
                        <span className={`text-sm font-bold ${available > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                          {available.toFixed(1)} hrs
                        </span>
                      </div>
                    </div>

                    {/* Visual Progress Meter */}
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
                      <h3 className="font-heading font-semibold text-base">Allocated Tasks ({lecturerAssignments.length})</h3>
                      <p className="text-[var(--muted)] text-xs mt-0.5">List of all active, pending, and completed assignments</p>
                    </div>
                  </div>

                  {lecturerAssignments.length === 0 ? (
                    <div className="text-center py-8 text-[var(--muted)] text-sm flex flex-col items-center justify-center">
                      <HiOutlineBookOpen size={24} className="mb-2 text-slate-300" />
                      No assignments found for this staff member.
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--border)]/40 max-h-[300px] overflow-y-auto pr-1">
                      {lecturerAssignments.map((a: any) => {
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
                              {/* Task progress percentage */}
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

      {activeTab === 'management' && (
        /* Staff Management Tab View - Form + Table list */
        <div className="grid grid-cols-12 gap-6 items-start animate-fadeIn">
          {/* Left Column: Create Staff Member Form */}
          <div className="col-span-12 lg:col-span-5 glass-card p-6 bg-gradient-to-br from-[var(--card)] to-[var(--bg)]/10">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <HiOutlineUsers size={18} />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-base">Add Academic Staff</h3>
                <p className="text-[var(--muted)] text-xs mt-0.5">Register new Lecturers and Department Heads</p>
              </div>
            </div>

            {staffMsg && (
              <div className={`mb-6 rounded-xl px-4 py-3 text-xs border ${
                staffMsg.ok 
                  ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400' 
                  : 'bg-red-500/10 border-red-500/30 text-red-500 dark:text-red-400'
              }`}>
                {staffMsg.text}
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newStaffForm.full_name}
                    onChange={e => setNewStaffForm(f => ({ ...f, full_name: e.target.value }))}
                    placeholder="e.g. Samantha Peiris"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">
                    Position
                  </label>
                  <select
                    value={newStaffForm.position}
                    onChange={e => setNewStaffForm(f => ({ ...f, position: e.target.value }))}
                    className="input"
                  >
                    <option value="">— None —</option>
                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={newStaffForm.email}
                    onChange={e => setNewStaffForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="samantha@university.edu"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={newStaffForm.password}
                    onChange={e => setNewStaffForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">
                    Assigned Department *
                  </label>
                  <select
                    required
                    value={newStaffForm.department_id}
                    onChange={e => setNewStaffForm(f => ({ ...f, department_id: e.target.value }))}
                    className="input"
                  >
                    {departments.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.dept_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">
                    Staff Role *
                  </label>
                  <select
                    required
                    value={newStaffForm.role_id}
                    onChange={e => setNewStaffForm(f => ({ ...f, role_id: e.target.value }))}
                    className="input"
                  >
                    <option value="4">Lecturer</option>
                    <option value="3">Department Head</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">
                    Contact Number
                  </label>
                  <input
                    type="text"
                    value={newStaffForm.contact}
                    onChange={e => setNewStaffForm(f => ({ ...f, contact: e.target.value }))}
                    placeholder="e.g. +94 77 123 4567"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">
                    Weekly Capacity Hours
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="168"
                    step="0.5"
                    value={newStaffForm.capacity_hours}
                    onChange={e => setNewStaffForm(f => ({ ...f, capacity_hours: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={staffSaving}
                className="btn-primary w-full justify-center mt-2 shadow-md hover:shadow-lg"
              >
                {staffSaving ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                    Creating Staff...
                  </span>
                ) : (
                  'Create Staff Member'
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Staff List & Promotions */}
          <div className="col-span-12 lg:col-span-7 glass-card p-6 flex flex-col h-[calc(100vh-280px)] overflow-hidden">
            <div className="flex items-center justify-between mb-4 border-b border-[var(--border)]/50 pb-4">
              <div>
                <h3 className="font-heading font-semibold text-base">Faculty Directory & Promotions</h3>
                <p className="text-[var(--muted)] text-xs mt-0.5">View active staff and promote Lecturer roles directly</p>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--muted)] text-xs font-semibold uppercase tracking-wider">
                    <th className="text-left pb-3 font-medium">Name & Email</th>
                    <th className="text-left pb-3 font-medium">Department</th>
                    <th className="text-left pb-3 font-medium">Current Role</th>
                    <th className="text-center pb-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]/30">
                  {staffMembers.map((u: any) => {
                    const isPromoting = promotingId === u.id
                    return (
                      <tr key={u.id} className="hover:bg-[var(--bg)]/35 transition-colors">
                        <td className="py-3.5 pr-2">
                          <div className="font-semibold text-sm text-[var(--text)]">{displayName(u)}</div>
                          <div className="text-xs text-[var(--muted)] mt-0.5">{u.email}</div>
                        </td>
                        <td className="py-3.5 pr-2 text-xs text-[var(--muted)]">{u.dept_name ?? '—'}</td>
                        <td className="py-3.5 pr-2">
                          <span className={`badge text-[10px] ${
                            u.role_name === 'department_head'
                              ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 font-bold'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}>
                            {u.role_name === 'department_head' ? 'Dept Head' : 'Lecturer'}
                          </span>
                        </td>
                        <td className="py-3.5 text-center">
                          {u.role_name === 'lecturer' ? (
                            deptsWithHead.has(u.department_id) ? (
                              <span
                                className="text-xs text-[var(--muted)] font-medium cursor-not-allowed"
                                title="This department already has a Department Head. A department can only have one head."
                              >
                                Dept head exists
                              </span>
                            ) : (
                              <button
                                disabled={isPromoting || staffSaving}
                                onClick={() => handlePromoteStaff(u)}
                                className="btn-secondary text-[11px] py-1.5 px-2.5 rounded-lg border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 active:scale-95 inline-flex items-center gap-1.5"
                              >
                                {isPromoting ? (
                                  <span className="w-3 h-3 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin shrink-0" />
                                ) : (
                                  <HiOutlineTrophy size={13} />
                                )}
                                Promote
                              </button>
                            )
                          ) : (
                            <span className="text-xs text-[var(--muted)] font-medium">Head of Dept</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {staffMembers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-[var(--muted)] text-sm">
                        No academic staff found in your faculty.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
