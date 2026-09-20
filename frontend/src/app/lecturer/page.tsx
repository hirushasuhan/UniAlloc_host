'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { api } from '@/lib/api'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { getUser } from '@/lib/auth'
import DashboardBanner from '@/components/ui/DashboardBanner'

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

export default function LecturerDashboard() {
  const [assignments, setAssignments] = useState<any[]>([])
  const [capacity,    setCapacity]    = useState<any>(null)
  const [updating,    setUpdating]    = useState<number | null>(null)
  const [progress,    setProgress]    = useState<Record<number,{pct:number,note:string}>>({})

  const user = getUser()

  useEffect(() => {
    api.get('/assignments').then(r => setAssignments(r.data.data ?? []))
    if (user) api.get(`/capacity/${user.id}`).then(r => setCapacity(r.data.data?.capacity))
  }, [])

  async function updateProgress(id: number) {
    const p = progress[id] ?? { pct: 0, note: '' }
    if (p.pct === 100) {
      const confirmed = window.confirm(
        'Are you sure you want to mark this assignment as 100% completed?'
      )
      if (!confirmed) return
    }
    await api.patch(`/assignments/${id}/progress`, { progress_percent: p.pct, note: p.note })
    setUpdating(null)
    api.get('/assignments').then(r => setAssignments(r.data.data ?? []))
    if (user) api.get(`/capacity/${user.id}`).then(r => setCapacity(r.data.data?.capacity))
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
      deadline: a.deadline,
      progress: a.latest_progress ?? 0,
      isAvailable: false,
    }))
    .filter((s) => s.value > 0)

  const availableHours = capacity ? Math.max(0, Number(capacity.available_hours) || 0) : 0

  // Fallback if there are no estimated hours on individual assignments yet
  const allocatedFallback =
    assignmentSlices.length === 0 && capacity && capacity.allocated_hours > 0
      ? [
          {
            id: 'allocated',
            name: 'Allocated Workload',
            value: Number(capacity.allocated_hours),
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

  // Color lookup map for each assignment
  const assignmentColorMap = new Map(assignmentSlices.map((s) => [s.id, s.color]))

  // Custom rich tooltip for the multi-color workload capacity donut
  const CapacityPieTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null
    const data = payload[0].payload
    const total = Number(capacity?.capacity_hours) || 1
    const pct = Math.round((data.value / total) * 100)

    return (
      <div className="rounded-xl border border-white/10 bg-zinc-900/95 p-3 shadow-2xl backdrop-blur-md text-xs text-white z-50 min-w-[170px]">
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
            <span className="capitalize text-zinc-400">{data.status.replace('_', ' ')}</span>
            <span className="text-indigo-400 font-semibold">{data.progress}% done</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <DashboardLayout requiredRole="lecturer">
      <DashboardBanner />
      <h1 className="text-2xl font-heading font-bold mb-2">My Dashboard</h1>
      <p className="text-[var(--muted)] text-sm mb-8">Track your assignments and workload</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Multi-Color Capacity Donut */}
        {capacity && (
          <div className="glass-card p-6 flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-2">
              <h2 className="font-heading font-semibold text-lg">Workload Capacity</h2>
              <span className={`badge ${capacity.is_overloaded ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'}`}>
                {capacity.is_overloaded ? '⚠ Overloaded' : 'Normal'}
              </span>
            </div>

            {/* Donut Chart with Centered Metric */}
            <div className="relative w-full h-[180px] flex items-center justify-center my-2">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData.length > 0 ? pieData : [{ name: 'Available', value: 1, color: '#334155' }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={54}
                    outerRadius={78}
                    paddingAngle={pieData.length > 1 ? 2 : 0}
                    dataKey="value"
                    stroke="var(--card-solid)"
                    strokeWidth={2}
                  >
                    {(pieData.length > 0 ? pieData : [{ name: 'Available', value: 1, color: '#334155' }]).map((entry, index) => (
                      <Cell
                        key={`cell-${entry.id || index}`}
                        fill={entry.color}
                        className="transition-all duration-300 hover:opacity-85 cursor-pointer"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CapacityPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Center stat in donut hole */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <p className="text-2xl font-heading font-black tracking-tight">{capacity.utilization_pct}%</p>
                <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)]">Utilized</p>
              </div>
            </div>

            {/* Capacity Hours Overview */}
            <div className="w-full text-center mt-1">
              <p className="text-sm font-semibold text-[var(--text)]">
                {capacity.allocated_hours}h <span className="text-[var(--muted)] font-normal">/ {capacity.capacity_hours}h</span>
              </p>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                {availableHours > 0 ? `${availableHours}h available capacity remaining` : 'Capacity fully utilized'}
              </p>
            </div>

            {/* Assignment Color Breakdown Legend */}
            {assignmentSlices.length > 0 && (
              <div className="w-full mt-4 pt-4 border-t border-[var(--border)]/60 space-y-2">
                <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
                  Assignment Allocation ({assignmentSlices.length})
                </p>
                <div className="max-h-[170px] overflow-y-auto custom-scrollbar pr-1 space-y-2">
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
        )}

        {/* Scrollable My Assignments Module Box */}
        <div className={`glass-card p-6 flex flex-col ${capacity ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--border)]/50">
            <div className="flex items-center gap-2.5">
              <h2 className="font-heading font-semibold text-lg">My Assignments</h2>
              {assignments.length > 0 && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 font-semibold">
                  {assignments.length}
                </span>
              )}
            </div>
            {assignments.length > 0 && (
              <span className="text-xs text-[var(--muted)] font-medium">
                {assignments.filter((a) => a.status === 'completed').length} of {assignments.length} completed
              </span>
            )}
          </div>

          {assignments.length === 0 ? (
            <p className="text-[var(--muted)] text-sm py-4">No assignments yet.</p>
          ) : (
            /* Scrollable container inside the module box */
            <div className="max-h-[560px] overflow-y-auto custom-scrollbar pr-2 -mr-1 space-y-3.5">
              {assignments.map((a: any) => {
                const sliceColor = assignmentColorMap.get(a.id)
                return (
                  <div
                    key={a.id}
                    className="group relative p-4 rounded-2xl bg-[var(--bg)] hover:bg-[var(--card-solid)] border border-[var(--border)] hover:border-indigo-500/30 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {sliceColor && (
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                              style={{ backgroundColor: sliceColor }}
                              title="Matches workload chart color"
                            />
                          )}
                          <p className="font-semibold text-sm truncate group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                            {a.title}
                          </p>
                        </div>
                        <p className="text-xs text-[var(--muted)]">
                          Deadline: {a.deadline ?? 'None'} · <span className="font-medium text-[var(--text)]">{a.estimated_hours}h</span> estimated
                        </p>
                      </div>
                      <span className={`badge flex-shrink-0 ${a.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' : a.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'}`}>
                        {a.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1 h-2 rounded-full bg-[var(--border)] overflow-hidden">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${a.latest_progress ?? 0}%`,
                            backgroundColor: sliceColor || 'var(--accent)',
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium text-[var(--muted)] min-w-[32px] text-right">
                        {a.latest_progress ?? 0}%
                      </span>
                    </div>

                    {a.status !== 'cancelled' && (
                      updating === a.id ? (
                        <div className="mt-3 pt-3 border-t border-[var(--border)]/50 space-y-2.5">
                          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                            <span>Update Completion</span>
                            <span className={`font-bold ${progress[a.id]?.pct === 100 ? 'text-green-500' : 'text-indigo-500'}`}>
                              {progress[a.id]?.pct ?? 0}% {progress[a.id]?.pct === 100 && '(Completed)'}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={progress[a.id]?.pct ?? 0}
                            onChange={(e) => setProgress((p) => ({ ...p, [a.id]: { ...p[a.id], pct: +e.target.value } }))}
                            className="w-full accent-indigo-500 cursor-pointer"
                          />
                          <textarea
                            placeholder="Progress note (optional)"
                            rows={2}
                            className="input text-xs"
                            value={progress[a.id]?.note ?? ''}
                            onChange={(e) => setProgress((p) => ({ ...p, [a.id]: { ...p[a.id], note: e.target.value } }))}
                          />
                          <div className="flex gap-2">
                            <button onClick={() => updateProgress(a.id)} className="btn-primary text-xs py-1.5 px-4">Save</button>
                            <button onClick={() => setUpdating(null)} className="btn-secondary text-xs py-1.5 px-4">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setUpdating(a.id)
                            setProgress((p) => ({ ...p, [a.id]: { pct: a.latest_progress ?? (a.status === 'completed' ? 100 : 0), note: '' } }))
                          }}
                          className="text-xs font-semibold text-indigo-500 hover:text-indigo-400 hover:underline mt-1.5 inline-flex items-center gap-1 transition-colors"
                        >
                          {a.status === 'completed' ? 'Adjust progress / status ↺' : 'Update progress →'}
                        </button>
                      )
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
