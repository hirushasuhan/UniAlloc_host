'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { api } from '@/lib/api'
import { getUser } from '@/lib/auth'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import {
  HiOutlineExclamationTriangle,
  HiOutlineCheckCircle,
  HiOutlineArrowRight,
  HiOutlineBriefcase,
  HiOutlineDocumentText
} from 'react-icons/hi2'

const ASSIGNMENT_PALETTE = [
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#14b8a6', // Teal
  '#f97316', // Orange
]

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
  high:   'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  medium: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20',
  low:    'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20',
}

const STATUS_COLOR: Record<string, string> = {
  completed:      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
  in_progress:    'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20',
  pending:        'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  cancelled:      'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
  review_pending: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
}

const STATUS_DOT: Record<string, string> = {
  completed:      'bg-emerald-500',
  in_progress:    'bg-cyan-400 animate-pulse',
  pending:        'bg-amber-400',
  cancelled:      'bg-rose-400',
  review_pending: 'bg-purple-400',
}

const STATUS_LABEL: Record<string, string> = {
  completed:      'Completed',
  in_progress:    'In Progress',
  pending:        'Pending',
  cancelled:      'Cancelled',
  review_pending: 'Under Review',
}

const isOverdue = (deadline: string | null, status: string) => {
  if (!deadline || status === 'completed' || status === 'cancelled') return false
  return new Date(deadline + 'T23:59:59') < new Date()
}

export default function LecturerWorkloadPage() {
  const user = getUser()
  const [cap, setCap] = useState<any>(null)
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      api.get(`/capacity/${user.id}`).then((r) => r.data.data?.capacity),
      api.get('/assignments').then((r) => r.data.data ?? []),
    ])
      .then(([capacityData, assignmentData]) => {
        setCap(capacityData)
        setAssignments(assignmentData)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading || !cap) {
    return (
      <DashboardLayout requiredRole="lecturer">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  // Active assignments that contribute to workload capacity
  const activeAssignments = assignments.filter(
    (a) => a.status === 'pending' || a.status === 'in_progress'
  )

  // Map each active assignment to its own unique color slice
  const assignmentSlices = activeAssignments
    .map((a, idx) => ({
      id: a.id,
      name: a.title,
      value: Number(a.estimated_hours) || 0,
      color: ASSIGNMENT_PALETTE[idx % ASSIGNMENT_PALETTE.length],
      status: a.status,
      priority: a.priority,
      deadline: a.deadline,
      progress: a.latest_progress ?? 0,
      assigned_by_name: a.assigned_by_name,
      department_name: a.department_name,
      isAvailable: false,
    }))
    .filter((s) => s.value > 0)

  const availableHours = cap ? Math.max(0, Number(cap.available_hours) || 0) : 0

  const allocatedFallback =
    assignmentSlices.length === 0 && cap && cap.allocated_hours > 0
      ? [
          {
            id: 'allocated',
            name: 'Allocated Workload',
            value: Number(cap.allocated_hours),
            color: '#6366f1',
            isAvailable: false,
            status: 'allocated',
            progress: 0,
          },
        ]
      : []

  const pieData = [
    ...assignmentSlices,
    ...allocatedFallback,
    ...(availableHours > 0
      ? [
          {
            id: 'available',
            name: 'Available Capacity',
            value: availableHours,
            color: '#334155',
            isAvailable: true,
            status: 'available',
            progress: 0,
          },
        ]
      : []),
  ]

  // Custom rich tooltip for the multi-color workload capacity donut
  const CapacityPieTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null
    const data = payload[0].payload
    const total = Number(cap?.capacity_hours) || 1
    const pct = Math.round((data.value / total) * 100)

    return (
      <div className="rounded-xl border border-white/10 bg-zinc-900/95 p-3 shadow-2xl backdrop-blur-md text-xs text-white z-50 min-w-[180px]">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: data.color }}
          />
          <span className="font-semibold truncate max-w-[190px]">{data.name}</span>
        </div>
        <div className="flex items-center justify-between text-zinc-400 text-[11px] gap-3">
          <span>Workload:</span>
          <span className="font-bold text-zinc-200">{data.value}h</span>
        </div>
        <div className="flex items-center justify-between text-zinc-400 text-[11px] gap-3 mt-0.5">
          <span>Share of Capacity:</span>
          <span className="font-medium text-zinc-300">{pct}%</span>
        </div>
        {!data.isAvailable && (
          <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px]">
            <span className="capitalize text-zinc-400">{data.status?.replace('_', ' ')}</span>
            <span className="text-indigo-400 font-semibold">{data.progress}% done</span>
          </div>
        )}
      </div>
    )
  }

  const utilizationNum = Number(cap.utilization_pct) || 0

  return (
    <DashboardLayout requiredRole="lecturer">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">My Workload</h1>
          <p className="text-[var(--muted)] text-sm mt-0.5">Comprehensive capacity utilization and task distribution</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/lecturer/appeals"
            className="btn-secondary text-xs py-2 px-3.5 inline-flex items-center gap-1.5"
          >
            <HiOutlineDocumentText size={15} />
            <span>Workload Appeals</span>
          </Link>
          <Link
            href="/lecturer/assignments"
            className="btn-primary text-xs py-2 px-3.5 inline-flex items-center gap-1.5"
          >
            <HiOutlineBriefcase size={15} />
            <span>My Assignments</span>
          </Link>
        </div>
      </div>

      {/* Top 2-Column Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Left Column: Multi-Color Donut Chart Card */}
        <div className="lg:col-span-5 glass-card p-6 flex flex-col items-center justify-between">
          <div className="w-full flex items-center justify-between mb-2">
            <div>
              <h2 className="font-heading font-semibold text-lg">Capacity Overview</h2>
              <p className="text-xs text-[var(--muted)] mt-0.5">Live allocation across active tasks</p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
                cap.is_overloaded
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                  : utilizationNum > 85
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  cap.is_overloaded
                    ? 'bg-rose-500 animate-ping'
                    : utilizationNum > 85
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-emerald-500'
                }`}
              />
              {cap.is_overloaded
                ? '⚠ Overloaded'
                : utilizationNum > 85
                ? 'Near Capacity'
                : 'Optimal'}
            </span>
          </div>

          {/* Donut Chart with Centered Metric */}
          <div className="relative w-full h-[210px] flex items-center justify-center my-3">
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={pieData.length > 0 ? pieData : [{ name: 'Available', value: 1, color: '#334155' }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={92}
                  paddingAngle={pieData.length > 1 ? 2 : 0}
                  dataKey="value"
                  stroke="var(--card-solid)"
                  strokeWidth={2}
                >
                  {(pieData.length > 0 ? pieData : [{ name: 'Available', value: 1, color: '#334155' }]).map(
                    (entry, index) => (
                      <Cell
                        key={`cell-${entry.id || index}`}
                        fill={entry.color}
                        className="transition-all duration-300 hover:opacity-85 cursor-pointer"
                      />
                    )
                  )}
                </Pie>
                <Tooltip content={<CapacityPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Center stat in donut hole */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <p
                className={`text-3xl font-heading font-black tracking-tight ${
                  cap.is_overloaded
                    ? 'text-rose-500'
                    : utilizationNum > 85
                    ? 'text-amber-500'
                    : 'text-[var(--text)]'
                }`}
              >
                {cap.utilization_pct}%
              </p>
              <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)]">
                {cap.is_overloaded ? 'Overloaded' : 'Utilized'}
              </p>
            </div>
          </div>

          {/* Capacity Summary text */}
          <div className="w-full text-center mt-1">
            <p className="text-base font-bold text-[var(--text)]">
              {cap.allocated_hours}h{' '}
              <span className="text-[var(--muted)] font-normal text-sm">/ {cap.capacity_hours}h total</span>
            </p>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {availableHours > 0
                ? `${availableHours}h available capacity remaining`
                : 'Maximum weekly capacity fully utilized'}
            </p>
          </div>

          {/* Mini slice color legend */}
          {assignmentSlices.length > 0 && (
            <div className="w-full mt-4 pt-3.5 border-t border-[var(--border)]/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
                  Active Tasks Breakdown ({assignmentSlices.length})
                </span>
                <span className="text-[10px] text-[var(--muted)] font-medium">Hours</span>
              </div>
              <div className="max-h-[140px] overflow-y-auto custom-scrollbar pr-1 space-y-1.5">
                {assignmentSlices.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-[var(--bg)] transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="truncate font-medium text-[var(--text)]">{s.name}</span>
                    </div>
                    <span className="text-[var(--muted)] font-semibold shrink-0 ml-2">{s.value}h</span>
                  </div>
                ))}
                {availableHours > 0 && (
                  <div className="flex items-center justify-between text-xs p-1.5 rounded-lg text-[var(--muted)]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-slate-400/60 dark:bg-slate-600" />
                      <span className="truncate">Available Capacity</span>
                    </div>
                    <span className="font-semibold shrink-0 ml-2">{availableHours}h</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: In-Depth Metrics & Health Advisory */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* 4 KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="glass-card p-4 flex flex-col justify-between">
              <span className="text-xs text-[var(--muted)] font-medium">Weekly Capacity</span>
              <div className="mt-2">
                <p className="text-2xl font-bold font-heading">{cap.capacity_hours}h</p>
                <p className="text-[11px] text-[var(--muted)] mt-0.5">Base Allowance</p>
              </div>
            </div>

            <div className="glass-card p-4 flex flex-col justify-between">
              <span className="text-xs text-[var(--muted)] font-medium">Allocated Hours</span>
              <div className="mt-2">
                <p className="text-2xl font-bold font-heading text-indigo-500">{cap.allocated_hours}h</p>
                <p className="text-[11px] text-[var(--muted)] mt-0.5">{activeAssignments.length} active tasks</p>
              </div>
            </div>

            <div className="glass-card p-4 flex flex-col justify-between">
              <span className="text-xs text-[var(--muted)] font-medium">Available Capacity</span>
              <div className="mt-2">
                <p className={`text-2xl font-bold font-heading ${availableHours > 0 ? 'text-emerald-500' : 'text-zinc-400'}`}>
                  {availableHours}h
                </p>
                <p className="text-[11px] text-[var(--muted)] mt-0.5">Unallocated time</p>
              </div>
            </div>

            <div className="glass-card p-4 flex flex-col justify-between">
              <span className="text-xs text-[var(--muted)] font-medium">Safety Threshold</span>
              <div className="mt-2">
                <p className="text-2xl font-bold font-heading text-zinc-400">{cap.threshold_pct}%</p>
                <p className="text-[11px] text-[var(--muted)] mt-0.5">Overload limit</p>
              </div>
            </div>
          </div>

          {/* Utilization Progress Gauge Card */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-heading font-semibold text-sm">Capacity Utilization Level</h3>
              <span className="text-sm font-bold text-[var(--text)]">{cap.utilization_pct}%</span>
            </div>

            {/* Gauge progress bar */}
            <div className="relative w-full h-3 rounded-full bg-[var(--border)] overflow-hidden my-3">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  cap.is_overloaded
                    ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-red-600'
                    : utilizationNum > 85
                    ? 'bg-gradient-to-r from-indigo-500 to-amber-500'
                    : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, utilizationNum))}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[var(--muted)] font-medium">
              <span>0% (Empty)</span>
              <span>50% (Moderate)</span>
              <span>{cap.threshold_pct}% (Max Limit)</span>
            </div>
          </div>

          {/* Health & Advisory Card */}
          <div
            className={`glass-card p-5 rounded-2xl border ${
              cap.is_overloaded
                ? 'bg-rose-500/5 border-rose-500/25'
                : 'bg-emerald-500/5 border-emerald-500/25'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  cap.is_overloaded
                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {cap.is_overloaded ? (
                  <HiOutlineExclamationTriangle size={20} />
                ) : (
                  <HiOutlineCheckCircle size={20} />
                )}
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-[var(--text)]">
                  {cap.is_overloaded ? 'Workload Capacity Warning' : 'Optimal Workload Capacity'}
                </h4>
                <p className="text-xs text-[var(--muted)] leading-relaxed mt-1">
                  {cap.is_overloaded
                    ? `You are currently overloaded at ${cap.utilization_pct}% of your designated weekly threshold (${cap.threshold_pct}%). You can formally request a workload adjustment or rebalance by submitting an appeal to your Department Head.`
                    : `Your allocated workload (${cap.allocated_hours}h) is within institutional standards. You have ${availableHours}h of available weekly capacity to accept student supervision or additional tasks.`}
                </p>
                <div className="mt-3">
                  {cap.is_overloaded ? (
                    <Link
                      href="/lecturer/appeals"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-500/20 transition-all"
                    >
                      <span>Submit Workload Appeal</span>
                      <HiOutlineArrowRight size={13} />
                    </Link>
                  ) : (
                    <Link
                      href="/lecturer/assignments"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      <span>Manage Your Active Assignments</span>
                      <HiOutlineArrowRight size={13} />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Tasks Breakdown Section */}
      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading font-semibold text-lg">Active Workload Task Breakdown</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Specific assignments directly contributing to your {cap.allocated_hours}h allocated workload
            </p>
          </div>
          <span className="badge bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            {activeAssignments.length} Active Assignments
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg)]/30">
                {['Assignment', 'Assigned By', 'Priority', 'Workload (Hours / Share)', 'Deadline', 'Progress', 'Status'].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left py-3 px-4 text-[var(--muted)] font-medium whitespace-nowrap text-xs uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {activeAssignments.map((a: any, idx: number) => {
                const sliceColor = ASSIGNMENT_PALETTE[idx % ASSIGNMENT_PALETTE.length]
                const sharePct =
                  cap.capacity_hours > 0
                    ? Math.round((Number(a.estimated_hours || 0) / Number(cap.capacity_hours)) * 100)
                    : 0

                return (
                  <tr
                    key={a.id}
                    className="border-b border-[var(--border)]/50 hover:bg-[var(--bg)]/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: sliceColor }}
                          title="Donut chart slice color"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-[var(--text)] truncate max-w-[240px]">{a.title}</p>
                          {a.description && (
                            <p className="text-xs text-[var(--muted)] truncate max-w-[240px] mt-0.5">
                              {a.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[var(--muted)] whitespace-nowrap text-xs">
                      {a.assigned_by_name ?? 'Department Head'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`badge uppercase tracking-wider text-[10px] font-bold ${
                          PRIORITY_COLOR[a.priority] || 'bg-zinc-500/10 text-zinc-400'
                        }`}
                      >
                        {a.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-bold text-[var(--text)]">{a.estimated_hours}h</span>
                        <span className="text-xs text-[var(--muted)] font-medium">({sharePct}% of cap)</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {a.deadline ? (
                        isOverdue(a.deadline, a.status) ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-500 dark:text-rose-400 whitespace-nowrap text-xs">
                            <span className="font-semibold tracking-tight">{a.deadline}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-600 dark:text-rose-300">
                              Overdue
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--muted)] font-medium">{a.deadline}</span>
                        )
                      ) : (
                        <span className="text-[var(--muted)]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="flex-1 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                            style={{ width: `${a.latest_progress ?? 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-[var(--muted)] font-medium w-8 text-right">
                          {a.latest_progress ?? 0}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
                          STATUS_COLOR[a.status] || 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[a.status] || 'bg-zinc-400'}`} />
                        {STATUS_LABEL[a.status] || a.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {activeAssignments.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[var(--muted)]">
                    No active assignments contributing to current workload.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  )
}
