'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { api } from '@/lib/api'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { getUser } from '@/lib/auth'
import DashboardBanner from '@/components/ui/DashboardBanner'

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
    await api.patch(`/assignments/${id}/progress`, { progress_percent: p.pct, note: p.note })
    setUpdating(null)
    api.get('/assignments').then(r => setAssignments(r.data.data ?? []))
  }

  const pieData = capacity
    ? [
        { name: 'Allocated', value: capacity.allocated_hours },
        { name: 'Available', value: capacity.available_hours },
      ]
    : []

  return (
    <DashboardLayout requiredRole="lecturer">
      <DashboardBanner />
      <h1 className="text-2xl font-heading font-bold mb-2">My Dashboard</h1>
      <p className="text-[var(--muted)] text-sm mb-8">Track your assignments and workload</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Capacity Donut */}
        {capacity && (
          <div className="glass-card p-6 flex flex-col items-center">
            <h2 className="font-heading font-semibold text-lg mb-2 self-start">Workload Capacity</h2>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value">
                  <Cell fill="#6366f1"/>
                  <Cell fill="#e2e8f0"/>
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <p className="text-2xl font-heading font-bold">{capacity.utilization_pct}%</p>
            <p className="text-[var(--muted)] text-sm">{capacity.allocated_hours}h / {capacity.capacity_hours}h</p>
            {capacity.is_overloaded && (
              <span className="mt-2 badge bg-red-100 text-red-700">⚠ Overloaded</span>
            )}
          </div>
        )}

        {/* Assignment List */}
        <div className={`glass-card p-6 ${capacity ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <h2 className="font-heading font-semibold text-lg mb-4">My Assignments</h2>
          {assignments.length === 0
            ? <p className="text-[var(--muted)] text-sm">No assignments yet.</p>
            : (
              <div className="space-y-4">
                {assignments.map((a: any) => (
                  <div key={a.id} className="p-4 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <p className="font-semibold text-sm">{a.title}</p>
                        <p className="text-xs text-[var(--muted)]">Deadline: {a.deadline ?? 'None'} · {a.estimated_hours}h estimated</p>
                      </div>
                      <span className={`badge flex-shrink-0 ${a.status === 'completed' ? 'bg-green-100 text-green-700' : a.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                        {a.status}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1 h-2 rounded-full bg-[var(--border)]">
                        <div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600"
                          style={{ width: `${a.latest_progress ?? 0}%` }}/>
                      </div>
                      <span className="text-xs text-[var(--muted)]">{a.latest_progress ?? 0}%</span>
                    </div>

                    {a.status !== 'completed' && (
                      updating === a.id ? (
                        <div className="mt-2 space-y-2">
                          <input type="range" min={0} max={100} step={5}
                            value={progress[a.id]?.pct ?? 0}
                            onChange={e => setProgress(p => ({ ...p, [a.id]: { ...p[a.id], pct: +e.target.value } }))}
                            className="w-full accent-indigo-500"/>
                          <p className="text-xs text-center text-[var(--muted)]">{progress[a.id]?.pct ?? 0}%</p>
                          <textarea
                            placeholder="Progress note (optional)"
                            rows={2}
                            className="input text-xs"
                            value={progress[a.id]?.note ?? ''}
                            onChange={e => setProgress(p => ({ ...p, [a.id]: { ...p[a.id], note: e.target.value } }))}
                          />
                          <div className="flex gap-2">
                            <button onClick={() => updateProgress(a.id)} className="btn-primary text-xs py-1.5 px-4">Save</button>
                            <button onClick={() => setUpdating(null)} className="btn-secondary text-xs py-1.5 px-4">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { setUpdating(a.id); setProgress(p => ({ ...p, [a.id]: { pct: a.latest_progress ?? 0, note: '' } })) }}
                          className="text-xs text-indigo-500 hover:underline mt-1">
                          Update progress
                        </button>
                      )
                    )}
                  </div>
                ))}
              </div>
            )
          }
        </div>
      </div>
    </DashboardLayout>
  )
}
