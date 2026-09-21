'use client'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { api } from '@/lib/api'
import { HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineInbox } from 'react-icons/hi2'

const STEP_LABEL: Record<string, string> = {
  pending_dean:      'Awaiting Dean',
  pending_dept_head: 'Awaiting Dept Head',
  pending_assignee:  'Awaiting Your Decision',
  approved:          'Accepted',
  rejected:          'Rejected',
}
const STEP_COLOR: Record<string, string> = {
  pending_dean:      'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
  pending_dept_head: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20',
  pending_assignee:  'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  approved:          'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
  rejected:          'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
}
const STEP_DOT: Record<string, string> = {
  pending_dean:      'bg-purple-400 animate-pulse',
  pending_dept_head: 'bg-sky-400 animate-pulse',
  pending_assignee:  'bg-amber-400 animate-pulse',
  approved:          'bg-emerald-500',
  rejected:          'bg-rose-500',
}

export default function LecturerRequestsPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [msg,      setMsg]      = useState<{ text: string; ok: boolean } | null>(null)

  const load = () => api.get('/work-requests').then(r => setRequests(r.data.data ?? []))
  useEffect(() => { load() }, [])

  async function act(id: number, action: 'accept' | 'reject') {
    try {
      await api.patch(`/work-requests/${id}`, { action })
      setMsg({ text: action === 'accept' ? 'Request accepted — assignment created.' : 'Request rejected.', ok: action === 'accept' })
      load()
    } catch (e: any) {
      setMsg({ text: e.response?.data?.message ?? 'Error', ok: false })
    }
  }

  // Split: requests I need to act on vs. everything else
  const inbox = requests.filter(r => r.approval_step === 'pending_assignee')
  const other = requests.filter(r => r.approval_step !== 'pending_assignee')

  return (
    <DashboardLayout requiredRole="lecturer">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
          <HiOutlineInbox size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold">Work Requests Inbox</h1>
          <p className="text-[var(--muted)] text-sm">{inbox.length} awaiting your decision</p>
        </div>
      </div>

      {msg && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm ${msg.ok
          ? 'bg-green-500/10 border border-green-500/30 text-green-600'
          : 'bg-red-500/10 border border-red-500/30 text-red-500'}`}>
          {msg.text}
        </div>
      )}

      {/* Awaiting my decision */}
      {inbox.length > 0 && (
        <div className="glass-card mb-6 divide-y divide-[var(--border)]/50">
          {inbox.map((r: any) => (
            <div key={r.id} className="p-5 flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge text-xs bg-indigo-100 text-indigo-700">
                    {r.request_type?.replace(/_/g, '-')}
                  </span>
                  <span className={`badge text-xs ${STEP_COLOR[r.approval_step]}`}>
                    {STEP_LABEL[r.approval_step]}
                  </span>
                </div>
                <p className="font-semibold">{r.title}</p>
                {r.description && (
                  <p className="text-sm text-[var(--muted)] mt-1 line-clamp-2">{r.description}</p>
                )}
                <p className="text-xs text-[var(--muted)] mt-2">
                  Requested by: <strong>{r.requester_name}</strong>
                  {r.dean_approver_name && <> · Dean approved: <strong>{r.dean_approver_name}</strong></>}
                  {r.dept_head_approver_name && <> · Dept Head approved: <strong>{r.dept_head_approver_name}</strong></>}
                  &nbsp;· {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => act(r.id, 'accept')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-700 hover:bg-green-500/20 text-sm font-medium">
                  <HiOutlineCheckCircle size={14} /> Accept
                </button>
                <button onClick={() => act(r.id, 'reject')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-700 hover:bg-red-500/20 text-sm font-medium">
                  <HiOutlineXCircle size={14} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {inbox.length === 0 && other.length === 0 && (
        <div className="glass-card p-10 text-center">
          <HiOutlineInbox size={32} className="mx-auto text-[var(--muted)] mb-3 opacity-40" />
          <p className="text-[var(--muted)]">No work requests at the moment.</p>
        </div>
      )}

      {/* History */}
      {other.length > 0 && (
        <div className="glass-card overflow-x-auto">
          <div className="p-4 border-b border-[var(--border)]">
            <h2 className="font-heading font-semibold">Request History</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {['Title', 'From', 'Type', 'Step / Status', 'Date'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-[var(--muted)] font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {other.map((r: any) => (
                <tr key={r.id} className="border-b border-[var(--border)]/50 hover:bg-[var(--bg)]/50">
                  <td className="py-3 px-4 font-medium">{r.title}</td>
                  <td className="py-3 px-4 text-[var(--muted)] whitespace-nowrap">{r.requester_name}</td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {r.request_type === 'cross_faculty' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-sm">
                        <span className="text-xs">🌐</span>
                        <span>Cross-Faculty</span>
                      </span>
                    ) : r.request_type === 'cross_department' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shadow-sm">
                        <span className="text-xs">🏛️</span>
                        <span>Cross-Dept</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                        {r.request_type?.replace(/_/g, '-')}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${STEP_COLOR[r.approval_step] ?? 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STEP_DOT[r.approval_step] ?? 'bg-zinc-400'}`} />
                      {STEP_LABEL[r.approval_step] ?? r.approval_step}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[var(--muted)] whitespace-nowrap text-xs">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  )
}
