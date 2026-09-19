'use client'
import { useEffect, useState, FormEvent } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { api } from '@/lib/api'
import { HiOutlineDocumentCheck } from 'react-icons/hi2'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string,string>>({})
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState<{text:string;ok:boolean}|null>(null)

  useEffect(() => {
    api.get('/settings').then(r => {
      const s: Record<string,string> = {}
      ;(r.data.data ?? []).forEach((row:any) => { s[row.setting_key] = row.setting_value })
      setSettings(s)
    })
  }, [])

  const set = (key:string, val:string) => setSettings(s => ({ ...s, [key]: val }))

  async function handleSave(e: FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(null)
    try {
      await api.put('/settings', settings)
      setMsg({ text: 'Settings saved successfully.', ok: true })
    } catch(err:any) {
      setMsg({ text: err.response?.data?.message ?? 'Save failed.', ok: false })
    } finally { setSaving(false) }
  }

  const fields = [
    { key: 'institution_name',       label: 'Institution Name',              type: 'text',   placeholder: 'Uva Wellassa University' },
    { key: 'overload_threshold_pct', label: 'Overload Threshold (%)',        type: 'number', placeholder: '90' },
    { key: 'default_capacity_hours', label: 'Default Capacity (hrs/week)',   type: 'number', placeholder: '40' },
    { key: 'maintenance_mode',       label: 'Maintenance Mode (0=off, 1=on)',type: 'number', placeholder: '0' },
  ]

  return (
    <DashboardLayout requiredRole="system_admin">
      <h1 className="text-2xl font-heading font-bold mb-2">System Settings</h1>
      <p className="text-[var(--muted)] text-sm mb-6">Global configuration for the UniAlloc platform</p>

      {msg && (
        <div className={`mb-5 rounded-xl px-4 py-3 text-sm ${msg.ok ? 'bg-green-500/10 border border-green-500/30 text-green-600' : 'bg-red-500/10 border border-red-500/30 text-red-500'}`}>
          {msg.text}
        </div>
      )}

      <div className="glass-card p-6 max-w-xl">
        <form onSubmit={handleSave} className="space-y-5">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-sm font-medium mb-1.5">{f.label}</label>
              <input
                type={f.type}
                value={settings[f.key] ?? ''}
                onChange={e => set(f.key, e.target.value)}
                className="input"
                placeholder={f.placeholder}
              />
            </div>
          ))}
          <button type="submit" disabled={saving} className="btn-primary">
            <HiOutlineDocumentCheck size={16}/>{saving ? 'Saving…' : 'Save Settings'}
          </button>
        </form>
      </div>
    </DashboardLayout>
  )
}
