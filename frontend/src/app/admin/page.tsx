'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { api } from '@/lib/api'
import DashboardBanner from '@/components/ui/DashboardBanner'
import { HiOutlineUsers, HiOutlineBookOpen, HiOutlineChartBar, HiOutlineDocumentText, HiOutlineExclamationTriangle } from 'react-icons/hi2'
import Link from 'next/link'

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, faculties: 0, departments: 0, assignments: 0 })
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [vac, setVac] = useState<{ faculties_without_dean: any[]; departments_without_head: any[] }>({ faculties_without_dean: [], departments_without_head: [] })

  useEffect(() => {
    Promise.all([
      api.get('/users').catch(() => ({ data: { data: [] } })),
      api.get('/faculties').catch(() => ({ data: { data: [] } })),
      api.get('/departments').catch(() => ({ data: { data: [] } })),
      api.get('/assignments').catch(() => ({ data: { data: [] } })),
      api.get('/audit-logs?limit=10').catch(() => ({ data: { data: [] } })),
      api.get('/vacancies').catch(() => ({ data: { data: { faculties_without_dean: [], departments_without_head: [] } } })),
    ]).then(([users, facs, depts, asgns, logs, vacRes]) => {
      setStats({
        users:       users.data.data?.length ?? 0,
        faculties:   facs.data.data?.length  ?? 0,
        departments: depts.data.data?.length  ?? 0,
        assignments: asgns.data.data?.length  ?? 0,
      })
      setAuditLogs(logs.data.data ?? [])
      setVac(vacRes.data.data ?? { faculties_without_dean: [], departments_without_head: [] })
    })
  }, [])

  const kpis = [
    { label: 'Total Users',       value: stats.users,       icon: <HiOutlineUsers size={20}/>,   color: 'from-blue-500 to-indigo-600' },
    { label: 'Faculties',         value: stats.faculties,   icon: <HiOutlineBookOpen size={20}/>, color: 'from-violet-500 to-purple-600' },
    { label: 'Departments',       value: stats.departments, icon: <HiOutlineChartBar size={20}/>, color: 'from-emerald-500 to-teal-600' },
    { label: 'Active Assignments',value: stats.assignments, icon: <HiOutlineDocumentText size={20}/>,  color: 'from-orange-500 to-amber-600' },
  ]

  return (
    <DashboardLayout requiredRole="system_admin">
      <DashboardBanner />
      <h1 className="text-2xl font-heading font-bold mb-2">System Admin Dashboard</h1>
      <p className="text-[var(--muted)] text-sm mb-8">Full platform overview and control</p>

      {/* Leadership vacancy alerts */}
      {(vac.faculties_without_dean.length > 0 || vac.departments_without_head.length > 0) && (
        <div className="mb-8 space-y-3">
          {vac.faculties_without_dean.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-sm">
                <HiOutlineExclamationTriangle size={18}/> Faculties without an active Dean
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {vac.faculties_without_dean.map((f: any) => (
                  <li key={f.id}>
                    <span className="font-medium">{f.faculty_name}</span>
                    <span className="text-[var(--muted)]"> — no Dean assigned. Please assign someone.</span>
                  </li>
                ))}
              </ul>
              <Link href="/admin/promotions" className="inline-block mt-2 text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline">
                Go to Role Management →
              </Link>
            </div>
          )}
          {vac.departments_without_head.length > 0 && (
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3">
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-semibold text-sm">
                <HiOutlineExclamationTriangle size={18}/> Departments without an active Head
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {vac.departments_without_head.map((d: any) => (
                  <li key={d.id}>
                    <span className="font-medium">{d.dept_name}</span>
                    <span className="text-[var(--muted)]"> ({d.faculty_name}) — no Head assigned. Please assign someone.</span>
                  </li>
                ))}
              </ul>
              <Link href="/admin/promotions" className="inline-block mt-2 text-xs font-medium text-orange-600 dark:text-orange-400 hover:underline">
                Go to Role Management →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map(k => (
          <div key={k.label} className="glass-card p-5">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${k.color} flex items-center justify-center text-white mb-3`}>
              {k.icon}
            </div>
            <p className="text-3xl font-heading font-bold">{k.value}</p>
            <p className="text-[var(--muted)] text-sm mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Audit Log */}
      <div className="glass-card p-6">
        <h2 className="font-heading font-semibold text-lg mb-4">Recent Audit Log</h2>
        {auditLogs.length === 0
          ? <p className="text-[var(--muted)] text-sm">No audit entries yet.</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    {['User','Action','Entity','Time'].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-[var(--muted)] font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log: any) => (
                    <tr key={log.id} className="border-b border-[var(--border)]/50 hover:bg-[var(--bg)]/50">
                      <td className="py-2 px-3">{log.user_name ?? '—'}</td>
                      <td className="py-2 px-3 font-mono text-xs">{log.action}</td>
                      <td className="py-2 px-3 text-[var(--muted)]">{log.entity} #{log.entity_id}</td>
                      <td className="py-2 px-3 text-[var(--muted)]">{new Date(log.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    </DashboardLayout>
  )
}
