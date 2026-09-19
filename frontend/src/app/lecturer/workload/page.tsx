'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { api } from '@/lib/api'
import { getUser } from '@/lib/auth'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function LecturerWorkloadPage() {
  const user = getUser()
  const [cap, setCap] = useState<any>(null)

  useEffect(() => {
    if (user) api.get(`/capacity/${user.id}`).then(r => setCap(r.data.data?.capacity))
  }, [])

  if (!cap) return (
    <DashboardLayout requiredRole="lecturer">
      <div className="flex items-center justify-center h-40">
        <div className="w-7 h-7 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"/>
      </div>
    </DashboardLayout>
  )

  const pieData = [
    { name: 'Allocated Hours', value: cap.allocated_hours },
    { name: 'Available Hours', value: cap.available_hours },
  ]
  const COLORS = ['#6366f1', '#e2e8f0']

  return (
    <DashboardLayout requiredRole="lecturer">
      <h1 className="text-2xl font-heading font-bold mb-2">My Workload</h1>
      <p className="text-[var(--muted)] text-sm mb-6">Your current capacity utilisation</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut chart */}
        <div className="glass-card p-6 flex flex-col items-center">
          <h2 className="font-heading font-semibold text-lg mb-4 self-start">Capacity Overview</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={90} paddingAngle={3} dataKey="value">
                {pieData.map((_,i) => <Cell key={i} fill={COLORS[i]}/>)}
              </Pie>
              <Tooltip formatter={(v:number) => `${v}h`}/>
              <Legend/>
            </PieChart>
          </ResponsiveContainer>
          <p className="text-4xl font-heading font-bold mt-2">{cap.utilization_pct}%</p>
          <p className="text-[var(--muted)] text-sm">utilisation</p>
          {cap.is_overloaded && (
            <div className="mt-4 w-full rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm text-red-600 text-center font-medium">
              ⚠ You are currently overloaded ({cap.utilization_pct}% ≥ {cap.threshold_pct}%)
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="glass-card p-6">
          <h2 className="font-heading font-semibold text-lg mb-5">Details</h2>
          <div className="space-y-4">
            {[
              { label: 'Weekly Capacity',    value: `${cap.capacity_hours}h`,  color: 'text-[var(--text)]' },
              { label: 'Allocated Hours',    value: `${cap.allocated_hours}h`, color: 'text-indigo-500' },
              { label: 'Available Hours',    value: `${cap.available_hours}h`, color: 'text-emerald-500' },
              { label: 'Utilisation',        value: `${cap.utilization_pct}%`, color: cap.is_overloaded ? 'text-red-500' : 'text-indigo-500' },
              { label: 'Overload Threshold', value: `${cap.threshold_pct}%`,   color: 'text-[var(--muted)]' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between py-2 border-b border-[var(--border)]/50">
                <span className="text-sm text-[var(--muted)]">{s.label}</span>
                <span className={`text-sm font-semibold ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
