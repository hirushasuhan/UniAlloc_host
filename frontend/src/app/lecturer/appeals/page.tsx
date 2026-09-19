'use client'
import { useEffect, useState, FormEvent } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { api } from '@/lib/api'
import { HiOutlinePlus, HiOutlineXMark } from 'react-icons/hi2'

export default function LecturerAppealsPage() {
  const [appeals,   setAppeals]   = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form,      setForm]      = useState({ assignment_id:'', reason:'' })
  const [saving,    setSaving]    = useState(false)
  const [msg,       setMsg]       = useState<{text:string;ok:boolean}|null>(null)

  const load = () => api.get('/appeals').then(r => setAppeals(r.data.data ?? []))
  useEffect(() => {
    load()
    api.get('/assignments').then(r => setAssignments(r.data.data ?? []))
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(null)
    try {
      await api.post('/appeals', { assignment_id: form.assignment_id || null, reason: form.reason })
      setMsg({ text: 'Appeal submitted. Your department head has been notified.', ok: true })
      setShowModal(false); setForm({ assignment_id:'', reason:'' }); load()
    } catch(e:any) { setMsg({ text: e.response?.data?.message ?? 'Error', ok: false }) }
    finally { setSaving(false) }
  }

  const STATUS_COLOR: Record<string,string> = {
    pending:'bg-amber-100 text-amber-700', reviewed:'bg-blue-100 text-blue-700', resolved:'bg-green-100 text-green-700'
  }

  return (
    <DashboardLayout requiredRole="lecturer">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">Workload Appeals</h1>
          <p className="text-[var(--muted)] text-sm mt-1">Request a workload reduction formally</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary"><HiOutlinePlus size={16}/> New Appeal</button>
      </div>

      {msg && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm ${msg.ok?'bg-green-500/10 border border-green-500/30 text-green-600':'bg-red-500/10 border border-red-500/30 text-red-500'}`}>
          {msg.text}
        </div>
      )}

      <div className="space-y-4">
        {appeals.map((a:any) => (
          <div key={a.id} className="glass-card p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="font-semibold">{a.assignment_title ? `Re: ${a.assignment_title}` : 'General Workload Appeal'}</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">{new Date(a.created_at).toLocaleDateString()}</p>
              </div>
              <span className={`badge flex-shrink-0 ${STATUS_COLOR[a.status]}`}>{a.status}</span>
            </div>
            <p className="text-sm text-[var(--muted)]">{a.reason}</p>
            {a.review_note && (
              <div className="mt-3 bg-[var(--bg)] rounded-xl px-3 py-2 text-sm">
                <p className="text-xs font-medium text-[var(--muted)] mb-1">Reviewer's Note:</p>
                <p>{a.review_note}</p>
              </div>
            )}
          </div>
        ))}
        {appeals.length === 0 && (
          <div className="glass-card p-8 text-center text-[var(--muted)]">No appeals submitted yet.</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-md p-6 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-[var(--muted)]"><HiOutlineXMark size={18}/></button>
            <h2 className="font-heading font-semibold text-lg mb-5">Submit Workload Appeal</h2>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Related Assignment (optional)</label>
                <select value={form.assignment_id} onChange={e=>setForm(f=>({...f,assignment_id:e.target.value}))} className="input">
                  <option value="">— General appeal —</option>
                  {assignments.filter(a=>a.status!=='completed').map((a:any) => (
                    <option key={a.id} value={a.id}>{a.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason *</label>
                <textarea value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))}
                  className="input" rows={4} required placeholder="Explain why you are requesting a workload reduction…"/>
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
                {saving?'Submitting…':'Submit Appeal'}
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
