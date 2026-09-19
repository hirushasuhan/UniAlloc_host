'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { api } from '@/lib/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, ReferenceLine } from 'recharts'
import { HiOutlineExclamationTriangle, HiOutlineArrowPath, HiOutlineChartBar } from 'react-icons/hi2'

function WorkloadBarTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null
  const data = payload[0].payload
  const isOver = data.is_overloaded || data.utilization_pct >= 100
  const isLow = data.utilization_pct < 50
  return (
    <div className="rounded-2xl p-3.5 bg-[var(--card-solid,#1a1e29)]/95 backdrop-blur-xl border border-[var(--border-strong)] shadow-2xl min-w-[200px] text-xs select-none">
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[var(--border)]">
        <span className="font-bold text-sm text-[var(--text)] truncate max-w-[130px]">{data.full_name}</span>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            isOver
              ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
              : isLow
              ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
          }`}
        >
          {isOver ? 'Overloaded' : isLow ? 'Available' : 'Optimal'}
        </span>
      </div>
      <div className="space-y-1.5 text-[var(--muted)]">
        <div className="flex justify-between items-center">
          <span>Utilisation:</span>
          <span className={`font-bold text-sm ${isOver ? 'text-rose-500' : 'text-[var(--text)]'}`}>
            {data.utilization_pct}%
          </span>
        </div>
        {data.capacity_hours !== undefined && (
          <>
            <div className="flex justify-between items-center text-[11px]">
              <span>Allocated:</span>
              <span className="font-semibold text-[var(--text)]">{data.allocated_hours ?? 0} hrs</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span>Max Capacity:</span>
              <span className="font-semibold text-[var(--text)]">{data.capacity_hours ?? 0} hrs</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span>Available:</span>
              <span className={`font-semibold ${data.available_hours < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                {data.available_hours ?? 0} hrs
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function DeptHeadWorkloadPage() {
  const [workload, setWorkload] = useState<any[]>([])
  const [loading,  setLoading]  = useState(false)

  const load = () => {
    setLoading(true)
    api.get('/capacity').then(r => setWorkload(r.data.data ?? [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const overloaded = workload.filter(w => w.is_overloaded)

  return (
    <DashboardLayout requiredRole="department_head">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">Workload Overview</h1>
          <p className="text-[var(--muted)] text-sm mt-1">Department capacity utilisation</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary">
          <HiOutlineArrowPath size={15} className={loading?'animate-spin':''}/> Refresh
        </button>
      </div>

      {overloaded.length > 0 && (
        <div className="mb-5 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 flex items-start gap-3">
          <HiOutlineExclamationTriangle size={18} className="text-red-500 mt-0.5"/>
          <div>
            <p className="text-sm font-semibold text-red-600">Overload Alert</p>
            <p className="text-sm text-red-500">{overloaded.map(w=>w.full_name).join(', ')} have exceeded the overload threshold.</p>
          </div>
        </div>
      )}

      <div className="glass-card p-6 mb-6 relative overflow-hidden">
        {/* Header with Title, Icon badge, and Status Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 ring-1 ring-emerald-500/20 shadow-inner">
              <HiOutlineChartBar size={18} />
            </div>
            <div>
              <h2 className="font-heading font-semibold text-base text-[var(--text)] tracking-tight">
                Capacity Utilisation Chart
              </h2>
              <p className="text-[11px] text-[var(--muted)]">Department lecturer workload vs allocated limits</p>
            </div>
          </div>

          {/* Mini Legend */}
          <div className="flex items-center gap-3 text-[11px] font-medium text-[var(--muted)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
              <span>Normal</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-sm shadow-teal-400/50" />
              <span>&lt;50%</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50 animate-pulse" />
              <span>Overloaded</span>
            </span>
          </div>
        </div>

        {workload.length === 0 ? <p className="text-[var(--muted)] text-sm py-12 text-center">No data.</p> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={workload} margin={{ top: 12, right: 12, bottom: 28, left: -10 }}>
              <defs>
                <linearGradient id="dhWkBarNormal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.85} />
                </linearGradient>
                <linearGradient id="dhWkBarAvailable" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2dd4bf" stopOpacity={1} />
                  <stop offset="100%" stopColor="#0d9488" stopOpacity={0.85} />
                </linearGradient>
                <linearGradient id="dhWkBarOverloaded" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f87171" stopOpacity={1} />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity={0.9} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.6} />

              <XAxis
                dataKey="full_name"
                tick={{ fontSize: 11, fill: 'var(--muted)' }}
                angle={-18}
                textAnchor="end"
                tickLine={false}
                axisLine={{ stroke: 'var(--border)' }}
                height={45}
              />
              <YAxis
                domain={[0, (dataMax: number) => Math.max(100, Math.ceil((dataMax + 10) / 20) * 20)]}
                unit="%"
                tick={{ fontSize: 11, fill: 'var(--muted)' }}
                tickLine={false}
                axisLine={false}
              />

              <ReferenceLine
                y={100}
                stroke="#ef4444"
                strokeDasharray="4 4"
                strokeOpacity={0.7}
                label={{
                  value: '100% Threshold',
                  position: 'top',
                  fill: '#ef4444',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />

              <Tooltip
                cursor={{ fill: 'rgba(16, 185, 129, 0.06)' }}
                content={<WorkloadBarTooltip />}
              />

              <Bar
                dataKey="utilization_pct"
                radius={[8, 8, 2, 2]}
                animationDuration={800}
              >
                {workload.map((w, i) => {
                  const isOver = w.is_overloaded || w.utilization_pct >= 100
                  const isLow = w.utilization_pct < 50
                  const fill = isOver
                    ? 'url(#dhWkBarOverloaded)'
                    : isLow
                    ? 'url(#dhWkBarAvailable)'
                    : 'url(#dhWkBarNormal)'
                  return <Cell key={i} fill={fill} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-[var(--border)]">
            {['Lecturer','Capacity','Allocated','Available','%','Status'].map(h=>(
              <th key={h} className="text-left py-3 px-4 text-[var(--muted)] font-medium">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {workload.map((w:any) => (
              <tr key={w.user_id} className={`border-b border-[var(--border)]/50 ${w.is_overloaded?'bg-red-500/5':''}`}>
                <td className="py-3 px-4 font-medium">{w.full_name}</td>
                <td className="py-3 px-4">{w.capacity_hours}h</td>
                <td className="py-3 px-4">{w.allocated_hours}h</td>
                <td className="py-3 px-4">{w.available_hours}h</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-[var(--border)]">
                      <div className={`h-1.5 rounded-full ${w.is_overloaded?'bg-red-500':'bg-indigo-500'}`}
                        style={{width:`${Math.min(w.utilization_pct,100)}%`}}/>
                    </div>
                    <span className="text-xs">{w.utilization_pct}%</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className={`badge ${w.is_overloaded?'bg-red-100 text-red-700':w.utilization_pct<50?'bg-green-100 text-green-700':'bg-blue-100 text-blue-700'}`}>
                    {w.is_overloaded?'Overloaded':w.utilization_pct<50?'Available':'Moderate'}
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
