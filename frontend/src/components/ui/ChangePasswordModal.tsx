'use client'
import { useState, FormEvent } from 'react'
import { api } from '@/lib/api'
import { getUser, saveAuth } from '@/lib/auth'
import { HiOutlineXMark } from 'react-icons/hi2'

interface Props {
  onClose: () => void
}

export default function ChangePasswordModal({ onClose }: Props) {
  const [form, setForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr('')
    setSuccess('')

    if (form.new_password !== form.confirm_password) {
      setErr('New passwords do not match.')
      setSaving(false)
      return
    }

    try {
      const { data } = await api.post('/users/me/change-password', {
        current_password: form.current_password,
        new_password: form.new_password
      })
      // Changing the password revokes every existing token, including this
      // one, so swap in the freshly issued token the API hands back —
      // otherwise the next request would 401 and sign the user out.
      const freshToken = data?.data?.token
      const user = getUser()
      if (freshToken && user) saveAuth(freshToken, user)
      setSuccess('Password changed successfully. Other devices have been signed out.')
      setForm({ current_password: '', new_password: '', confirm_password: '' })
      setTimeout(() => onClose(), 1500)
    } catch(e: any) {
      setErr(e.response?.data?.message ?? e.message ?? 'An error occurred.')
    } finally {
      setSaving(false)
    }
  }

  const f = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[var(--card-solid)] shadow-2xl rounded-2xl border border-[var(--border)] w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--text)]">
          <HiOutlineXMark size={18}/>
        </button>
        
        <h2 className="font-heading font-semibold text-lg mb-4">Change Password</h2>

        {err && <div className="mb-4 text-sm text-red-500 bg-red-500/10 rounded-xl px-3 py-2 border border-red-500/20">{err}</div>}
        {success && <div className="mb-4 text-sm text-green-500 bg-green-500/10 rounded-xl px-3 py-2 border border-green-500/20">{success}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Current Password *</label>
            <input 
              type="password" 
              value={form.current_password} 
              onChange={e => f('current_password', e.target.value)} 
              className="input" 
              required 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">New Password *</label>
            <input 
              type="password" 
              value={form.new_password} 
              onChange={e => f('new_password', e.target.value)} 
              className="input" 
              required 
              minLength={8}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Confirm New Password *</label>
            <input 
              type="password" 
              value={form.confirm_password} 
              onChange={e => f('confirm_password', e.target.value)} 
              className="input" 
              required 
              minLength={8}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={saving || success !== ''} 
            className="btn-primary w-full justify-center mt-2 shadow-md hover:shadow-lg inline-flex items-center gap-2"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                Saving…
              </span>
            ) : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
