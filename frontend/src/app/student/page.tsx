'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { api } from '@/lib/api'
import DashboardBanner from '@/components/ui/DashboardBanner'
import {
  HiOutlinePaperAirplane, HiOutlineClock, HiOutlineCheckCircle,
  HiOutlineXCircle, HiOutlineAcademicCap, HiOutlinePlus
} from 'react-icons/hi2'

export default function StudentDashboard() {
  const [requests, setRequests] = useState<any[]>([])

  useEffect(() => {
    api.get('/student-requests').then(r => setRequests(r.data.data ?? []))
  }, [])

  const pending  = requests.filter(r => r.status === 'pending')
  const assigned = requests.filter(r => r.status === 'assigned')
  const rejected = requests.filter(r => r.status === 'rejected')

  // Current supervisor(s) from approved requests
  const supervisors = assigned.filter(r => r.assigned_to_name)

  const statusColor: Record<string, string> = {
    pending:  'bg-amber-100 text-amber-700',
    assigned: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }

  return (
    <DashboardLayout requiredRole="student">
      <DashboardBanner />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-heading font-bold mb-2">Student Dashboard</h1>
          <p className="text-[var(--muted)] text-sm">Overview of your supervisor allocation requests</p>
        </div>
        <Link href="/student/requests" className="btn-primary">
          <HiOutlinePlus size={16}/> New Request
        </Link>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Requests', value: requests.length, icon: <HiOutlinePaperAirplane size={18}/>, color: 'from-indigo-500 to-violet-600' },
          { label: 'Pending',        value: pending.length,  icon: <HiOutlineClock size={18}/>,         color: 'from-amber-500 to-orange-600' },
          { label: 'Assigned',       value: assigned.length, icon: <HiOutlineCheckCircle size={18}/>,   color: 'from-emerald-500 to-teal-600' },
          { label: 'Rejected',       value: rejected.length, icon: <HiOutlineXCircle size={18}/>,       color: 'from-red-500 to-rose-600' },
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Supervisor(s) */}
        <div className="glass-card p-6">
          <h2 className="font-heading font-semibold text-lg mb-4">My Supervisor</h2>
          {supervisors.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 flex items-center justify-center mb-3">
                <HiOutlineAcademicCap size={26}/>
              </div>
              <p className="text-sm font-medium">No supervisor assigned yet</p>
              <p className="text-xs text-[var(--muted)] mt-1">
                {pending.length > 0
                  ? 'Your request is being reviewed by the Dean / Department Head.'
                  : 'Submit a supervisor request to get started.'}
              </p>
              {requests.length === 0 && (
                <Link href="/student/requests" className="btn-primary inline-flex mt-4 text-sm">
                  <HiOutlinePlus size={15}/> Submit a Request
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {supervisors.map((r: any) => (
                <div key={r.id} className="p-4 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold font-heading shrink-0">
                    {r.assigned_to_name.replace(/^[^.]+\.\s*/, '').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{r.assigned_to_name}</p>
                    <p className="text-xs text-[var(--muted)] truncate">
                      For: {r.title}{r.dept_name ? ` · ${r.dept_name}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Requests */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold text-lg">Recent Requests</h2>
            <Link href="/student/requests" className="text-xs font-semibold text-indigo-500 hover:underline">
              View all →
            </Link>
          </div>
          {requests.length === 0
            ? <p className="text-[var(--muted)] text-sm">No requests submitted yet.</p>
            : (
              <div className="space-y-3">
                {requests.slice(0, 5).map((r: any) => (
                  <div key={r.id} className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{r.title}</p>
                        <p className="text-xs text-[var(--muted)] mt-0.5">
                          {r.faculty_name}{r.dept_name ? ` · ${r.dept_name}` : ''} · {new Date(r.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`badge flex-shrink-0 ${statusColor[r.status] ?? 'bg-slate-100 text-slate-700'}`}>
                        {r.status}
                      </span>
                    </div>
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
