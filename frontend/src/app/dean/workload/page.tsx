'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { api } from '@/lib/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts'
import { HiOutlineExclamationTriangle, HiOutlineArrowPath } from 'react-icons/hi2'

export default function DeanWorkloadPage() {
  const [workload, setWorkload] = useState<any[]>([])
  const [loading,  setLoading]  = useState(false)
  const [selected, setSelected] = useState<any>(null)

  const load = () => {
    setLoading(true)
    api.get('/capacity').then(r => setWorkload(r.data.data ?? [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const overloaded    = workload.filter(w => w.is_overloaded)
  const underutilized = workload.filter(w => w.utilization_pct < 50)

  return (
    <DashboardLayout requiredRole="dean">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">Workload Overview</h1>
          <p className="text-[var(--muted)] text-sm mt-1">Faculty-wide capacity utilisation</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary">
          <HiOutlineArrowPath size={15} className={loading?'animate-spin':''}/> Refresh
        </button>
      </div>

      {overloaded.length > 0 && (
        <div className="mb-5 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 flex items-start gap-3">
          <HiOutlineExclamationTriangle size={18} className="text-red-500 mt-0.5 flex-shrink-0"/>
          <div>
            <p className="text-sm font-semibold text-red-600">⚠ Overloaded Staff</p>
            <p className="text-sm text-red-500">{overloaded.map(w=>w.full_name).join(', ')} have exceeded the overload threshold.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Staff',    value: workload.length,       color: 'from-indigo-500 to-violet-600' },
          { label: 'Overloaded',     value: overloaded.length,     color: 'from-red-500 to-rose-600' },
          { label: 'Under 50% Load', value: underutilized.length,  color: 'from-emerald-500 to-teal-600' },
        ].map(k => (
          <div key={k.label} className="glass-card p-4">
            <p className="text-2xl font-heading font-bold">{k.value}</p>
            <p className="text-[var(--muted)] text-sm">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="glass-card p-6 mb-6">
        <h2 className="font-heading font-semibold mb-4">Capacity Utilisation Chart</h2>
        {workload.length === 0
          ? <p className="text-[var(--muted)] text-sm">No data.</p>
          : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={workload} margin={{ top:4, right:8, bottom:20, left:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                <XAxis dataKey="full_name" tick={{ fontSize:11 }} angle={-20} textAnchor="end"/>
                <YAxis domain={[0,100]} unit="%" tick={{ fontSize:11 }}/>
                <Tooltip formatter={(v:number) => [`${v}%`, 'Utilisation']}/>
                <Bar dataKey="utilization_pct" radius={[6,6,0,0]} cursor="pointer" onClick={setSelected}>
                  {workload.map((w,i) => (
                    <Cell key={i} fill={w.is_overloaded ? '#ef4444' : w.utilization_pct < 50 ? '#10b981' : '#6366f1'}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )
        }
      </div>

      {/* Detail table */}
      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {['Staff Member','Capacity (h)','Allocated (h)','Available (h)','Utilisation','Status'].map(h=>(
                <th key={h} className="text-left py-3 px-4 text-[var(--muted)] font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {workload.map((w:any) => (
              <tr key={w.user_id} className={`border-b border-[var(--border)]/50 hover:bg-[var(--bg)]/50 ${w.is_overloaded?'bg-red-500/5':''}`}>
                <td className="py-3 px-4 font-medium">{w.full_name}</td>
                <td className="py-3 px-4">{w.capacity_hours}h</td>
                <td className="py-3 px-4">{w.allocated_hours}h</td>
                <td className="py-3 px-4">{w.available_hours}h</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 rounded-full bg-[var(--border)]">
                      <div className={`h-1.5 rounded-full ${w.is_overloaded?'bg-red-500':w.utilization_pct<50?'bg-emerald-500':'bg-indigo-500'}`}
                        style={{width:`${Math.min(w.utilization_pct,100)}%`}}/>
                    </div>
                    <span className="text-xs">{w.utilization_pct}%</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className={`badge ${w.is_overloaded?'bg-red-100 text-red-700':w.utilization_pct<50?'bg-green-100 text-green-700':'bg-blue-100 text-blue-700'}`}>
                    {w.is_overloaded ? 'Overloaded' : w.utilization_pct < 50 ? 'Available' : 'Moderate'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  )
}
