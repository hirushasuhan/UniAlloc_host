'use client'
import { useState, FormEvent } from 'react'
import { api } from '@/lib/api'
import { AuthUser, saveAuth, getToken, clearAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { HiOutlineXMark, HiOutlineKey, HiOutlineArrowRightOnRectangle, HiOutlineDevicePhoneMobile } from 'react-icons/hi2'
import ThemeToggle from '@/components/ui/ThemeToggle'

const TITLES = ['Prof', 'Dr', 'Mr', 'Mrs', 'Ms', 'Miss', 'Rev', 'Thero']
const POSITIONS = ['Senior Professor', 'Professor', 'Associate Professor', 'Senior Lecturer', 'Senior Lecturer (Grade I)', 'Senior Lecturer (Grade II)', 'Lecturer', 'Lecturer (Grade I)', 'Lecturer (Grade II)', 'Probationary Lecturer', 'Assistant Lecturer', 'Temporary Lecturer', 'Visiting Lecturer', 'Instructor', 'Demonstrator', 'Research Assistant']

interface Props {
  user: AuthUser
  onClose: () => void
  onChangePasswordClick: () => void
  onUpdateUser: (updated: AuthUser) => void
}

export default function SettingsModal({ user, onClose, onChangePasswordClick, onUpdateUser }: Props) {
  const [form, setForm] = useState({
    full_name: user.full_name,
    title: user.title ?? '',
    position: user.position ?? '',
    email: user.email,
    contact: user.contact ?? ''
  })
  
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [err, setErr] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  function logout() {
    clearAuth()
    router.push('/login')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr('')
    setSuccess('')

    try {
      const payload = { ...form, title: form.title || null, position: form.position || null }
      await api.put(`/users/${user.id}`, payload)

      const updatedUser = { ...user, ...payload }
      
      // Update local storage via saveAuth
      const token = getToken()
      if (token) {
        saveAuth(token, updatedUser)
      }
      
      onUpdateUser(updatedUser)
      
      setSuccess('Profile updated successfully.')
      setTimeout(() => setSuccess(''), 3000)
    } catch(e: any) {
      setErr(e.response?.data?.message ?? e.message ?? 'An error occurred.')
    } finally {
      setSaving(false)
      setIsEditing(false)
    }
  }

  const f = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[var(--card-solid)] shadow-2xl rounded-2xl border border-[var(--border)] w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--text)] transition-colors">
          <HiOutlineXMark size={20}/>
        </button>
        
        <h2 className="font-heading font-semibold text-xl mb-6">Settings</h2>

        <div className="space-y-8">
          
          {/* Profile Section */}
          <section>
            <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-4 border-b border-[var(--border)] pb-2">Profile Information</h3>
            
            {err && <div className="mb-4 text-sm text-red-500 bg-red-500/10 rounded-xl px-3 py-2 border border-red-500/20">{err}</div>}
            {success && <div className="mb-4 text-sm text-green-500 bg-green-500/10 rounded-xl px-3 py-2 border border-green-500/20">{success}</div>}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Title</label>
                  <select
                    value={form.title}
                    onChange={e => f('title', e.target.value)}
                    className="input disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!isEditing}
                  >
                    <option value="">— None —</option>
                    {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Position</label>
                  <select
                    value={form.position}
                    onChange={e => f('position', e.target.value)}
                    className="input disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!isEditing}
                  >
                    <option value="">— None —</option>
                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Full Name *</label>
                <input 
                  type="text" 
                  value={form.full_name} 
                  onChange={e => f('full_name', e.target.value)} 
                  className="input disabled:opacity-50 disabled:cursor-not-allowed" 
                  required 
                  disabled={!isEditing}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Email *</label>
                <input 
                  type="email" 
                  value={form.email} 
                  onChange={e => f('email', e.target.value)} 
                  className="input disabled:opacity-50 disabled:cursor-not-allowed" 
                  required 
                  disabled={!isEditing}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Contact Number</label>
                <input 
                  type="text" 
                  value={form.contact} 
                  onChange={e => f('contact', e.target.value)} 
                  className="input disabled:opacity-50 disabled:cursor-not-allowed" 
                  placeholder="+94 77 123 4567"
                  disabled={!isEditing}
                />
              </div>
              
              {!isEditing ? (
                <button 
                  type="button" 
                  onClick={() => setIsEditing(true)}
                  className="btn-secondary w-full justify-center mt-2 inline-flex items-center gap-2"
                >
                  Edit Profile
                </button>
              ) : (
                <div className="flex gap-2 mt-2">
                  <button 
                    type="submit" 
                    disabled={saving} 
                    className="btn-primary flex-1 justify-center shadow-md hover:shadow-lg inline-flex items-center gap-2"
                  >
                    {saving ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                        Saving…
                      </span>
                    ) : 'Update'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsEditing(false)
                      setForm({ full_name: user.full_name, title: user.title ?? '', position: user.position ?? '', email: user.email, contact: user.contact ?? '' })
                    }}
                    disabled={saving}
                    className="btn-secondary flex-1 justify-center"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </form>
          </section>

          {/* Preferences Section */}
          <section>
            <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-4 border-b border-[var(--border)] pb-2">Preferences</h3>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
              <div>
                <p className="font-medium text-sm">Theme Appearance</p>
                <p className="text-xs text-[var(--muted)]">Toggle dark mode or light mode</p>
              </div>
              <div className="w-48">
                <ThemeToggle />
              </div>
            </div>
          </section>

          {/* Security Section */}
          <section>
            <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-4 border-b border-[var(--border)] pb-2">Security</h3>
            <button 
              onClick={onChangePasswordClick}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--card)] flex items-center justify-center border border-[var(--border)] group-hover:border-[var(--accent)]">
                  <HiOutlineKey size={16} />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm transition-colors">Change Password</p>
                  <p className="text-xs text-[var(--muted)]">Update your account password</p>
                </div>
              </div>
            </button>

            <button 
              onClick={() => { onClose(); router.push('/security-setup?reenroll=1') }}
              className="w-full flex items-center justify-between p-4 mt-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--card)] flex items-center justify-center border border-[var(--border)] group-hover:border-[var(--accent)]">
                  <HiOutlineDevicePhoneMobile size={16} />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm transition-colors">
                    Authenticator App {user.totp_enabled ? '' : '— Not Set Up'}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {user.totp_enabled ? 'Replace it if you got a new phone' : 'Needed to reset your password without an admin'}
                  </p>
                </div>
              </div>
            </button>
            
            <button 
              onClick={logout}
              className="w-full flex items-center justify-between p-4 mt-3 rounded-xl bg-red-500/10 border border-red-500/20 hover:border-red-500/50 hover:bg-red-500/20 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 group-hover:border-red-500/50 text-red-500">
                  <HiOutlineArrowRightOnRectangle size={16} />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm text-red-500 transition-colors">Sign Out</p>
                  <p className="text-xs text-red-500/70">Log out of your account</p>
                </div>
              </div>
            </button>
          </section>

        </div>
      </div>
    </div>
  )
}
