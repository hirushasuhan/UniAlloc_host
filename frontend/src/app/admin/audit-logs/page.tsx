'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { api } from '@/lib/api'
import { HiOutlineMagnifyingGlass, HiOutlineArrowPath } from 'react-icons/hi2'

export default function AdminAuditLogsPage() {
  const [logs,    setLogs]    = useState<any[]>([])
  const [search,  setSearch]  = useState('')
  const [loading, setLoading] = useState(false)

  const load = () => {
    setLoading(true)
    api.get('/audit-logs?limit=100')
      .then(r => setLogs(r.data.data ?? []))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const filtered = logs.filter(l =>
    !search ||
    l.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.entity?.toLowerCase().includes(search.toLowerCase())
  )

  const actionColor = (action: string) => {
    if (action.startsWith('login'))  return 'bg-blue-100 text-blue-700'
    if (action.startsWith('create')) return 'bg-green-100 text-green-700'
    if (action.startsWith('delete') || action.startsWith('cancel') || action.startsWith('deactivate')) return 'bg-red-100 text-red-700'
    if (action.startsWith('approve'))  return 'bg-emerald-100 text-emerald-700'
    if (action.startsWith('reject'))   return 'bg-rose-100 text-rose-700'
    return 'bg-slate-100 text-slate-700'
  }

  return (
    <DashboardLayout requiredRole="system_admin">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">Audit Logs</h1>
          <p className="text-[var(--muted)] text-sm mt-1">{logs.length} entries (most recent 100)</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary">
          <HiOutlineArrowPath size={15} className={loading ? 'animate-spin' : ''}/> Refresh
        </button>
      </div>

      <div className="relative mb-4 max-w-xs">
        <HiOutlineMagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"/>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          className="input pl-9" placeholder="Filter by user, action, entity…"/>
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {['#','User','Action','Entity','ID','Timestamp'].map(h=>(
                <th key={h} className="text-left py-3 px-4 text-[var(--muted)] font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((l:any) => (
              <tr key={l.id} className="border-b border-[var(--border)]/50 hover:bg-[var(--bg)]/50">
                <td className="py-3 px-4 text-[var(--muted)] text-xs">{l.id}</td>
                <td className="py-3 px-4">
                  <div>{l.user_name ?? <span className="text-[var(--muted)]">System</span>}</div>
                  {l.user_email && <div className="text-xs text-[var(--muted)]">{l.user_email}</div>}
                </td>
                <td className="py-3 px-4">
                  <span className={`badge font-mono text-xs ${actionColor(l.action)}`}>{l.action}</span>
                </td>
                <td className="py-3 px-4 text-[var(--muted)]">{l.entity ?? '—'}</td>
                <td className="py-3 px-4 text-[var(--muted)]">{l.entity_id ?? '—'}</td>
                <td className="py-3 px-4 text-[var(--muted)] whitespace-nowrap">
                  {new Date(l.timestamp).toLocaleString()}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-[var(--muted)]">No log entries found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  )
}
