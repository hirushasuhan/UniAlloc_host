'use client'
import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import QRCode from 'qrcode'
import { api } from '@/lib/api'
import { getUser, getToken, saveAuth, clearAuth, roleHome } from '@/lib/auth'
import { HiOutlineShieldCheck, HiOutlineClipboardDocument, HiOutlineCheck, HiOutlineExclamationCircle, HiOutlineArrowRightOnRectangle, HiOutlineQrCode, HiOutlineKey } from 'react-icons/hi2'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'

export default function SecuritySetupPage() {
  const router = useRouter()
  // Read manually (rather than useSearchParams) so this page never needs a
  // Suspense boundary just to know whether it's a voluntary re-enrollment.
  const [isReenroll, setIsReenroll] = useState(false)

  const [loading, setLoading] = useState(true)
  const [secret, setSecret] = useState('')
  const [otpauthUrl, setOtpauthUrl] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [showManualKey, setShowManualKey] = useState(false)
  const [copied, setCopied] = useState(false)

  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    const reenroll = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('reenroll') === '1'
    setIsReenroll(reenroll)

    const u = getUser()
    const token = getToken()
    if (!u || !token) { router.replace('/login'); return }

    // Already enrolled and not explicitly asking to replace the device → nothing to do here
    if (u.totp_enabled && !reenroll) { router.replace(roleHome(u.role)); return }

    api.post('/auth/totp/setup')
      .then(({ data }) => {
        setSecret(data.data.secret)
        setOtpauthUrl(data.data.otpauth_url)
        return QRCode.toDataURL(data.data.otpauth_url, { width: 220, margin: 1 })
      })
      .then(url => { if (url) setQrDataUrl(url) })
      .catch(() => setError('Could not start authenticator setup. Please refresh and try again.'))
      .finally(() => setLoading(false))
  }, [])

  function copySecret() {
    navigator.clipboard?.writeText(secret).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault()
    setError('')
    setVerifying(true)
    try {
      await api.post('/auth/totp/verify', { code })
      const u = getUser()
      const token = getToken()
      if (u && token) saveAuth(token, { ...u, totp_enabled: true })
      setDone(true)
      setTimeout(() => {
        const updated = getUser()
        router.replace(updated ? roleHome(updated.role) : '/login')
      }, 1200)
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Verification failed. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  function signOut() {
    clearAuth()
    router.replace('/login')
  }

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-[#09090B] text-zinc-100 p-6">
      <div className="fixed top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-[2.5rem] blur-xl opacity-50" />

        <div className="relative bg-[#09090B]/80 border border-white/5 p-8 sm:p-10 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6">
            <HiOutlineShieldCheck className="w-8 h-8" />
          </div>

          <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight text-center mb-2">
            {isReenroll ? 'Replace Your Authenticator' : 'Set Up Password Recovery'}
          </h1>
          <p className="text-sm text-zinc-400 text-center leading-relaxed mb-8">
            {isReenroll
              ? 'Setting up a new authenticator will replace the old one. It will stop accepting codes immediately.'
              : 'Before you continue, link an authenticator app. It lets you reset your own password later without contacting the System Administrator.'}
          </p>

          {loading ? (
            <div className="flex justify-center py-8">
              <AiOutlineLoading3Quarters className="animate-spin h-6 w-6 text-cyan-400" />
            </div>
          ) : done ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
                <HiOutlineCheck className="w-6 h-6" />
              </div>
              <p className="text-sm text-zinc-300">Authenticator enrolled. Redirecting…</p>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">1. Add this account</p>

                {!showManualKey ? (
                  <>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      In Google Authenticator, Microsoft Authenticator, or Authy: tap <span className="text-zinc-300">Add account</span> → <span className="text-zinc-300">Scan a QR code</span>, then point your camera at this.
                    </p>
                    <div className="flex justify-center">
                      {qrDataUrl ? (
                        <div className="bg-white p-3 rounded-2xl shadow-lg">
                          <img src={qrDataUrl} alt="Authenticator QR code" width={180} height={180} />
                        </div>
                      ) : (
                        <div className="w-[180px] h-[180px] rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                          <AiOutlineLoading3Quarters className="animate-spin h-5 w-5 text-zinc-500" />
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowManualKey(true)}
                      className="w-full flex items-center justify-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      <HiOutlineKey className="w-3.5 h-3.5" />
                      Can't scan it? Enter the key manually instead
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      In your authenticator app: tap <span className="text-zinc-300">Add account</span> → <span className="text-zinc-300">Enter a setup key</span>, then paste the key below.
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-cyan-300 tracking-wider break-all font-mono">
                        {secret || '—'}
                      </code>
                      <button
                        type="button"
                        onClick={copySecret}
                        aria-label="Copy setup key"
                        className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors"
                      >
                        {copied ? <HiOutlineCheck className="w-5 h-5 text-green-400" /> : <HiOutlineClipboardDocument className="w-5 h-5" />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowManualKey(false)}
                      className="w-full flex items-center justify-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      <HiOutlineQrCode className="w-3.5 h-3.5" />
                      Show QR code instead
                    </button>
                  </>
                )}
              </div>

              {error && (
                <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 flex items-start gap-3">
                  <HiOutlineExclamationCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">2. Enter the 6-digit code it shows</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-center text-lg tracking-[0.5em] text-white
                               placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                    placeholder="000000"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={verifying || code.length !== 6 || !secret}
                  className="w-full mt-2 relative group overflow-hidden rounded-xl font-medium py-3.5 px-4 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                             bg-cyan-600 hover:bg-cyan-500 shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:shadow-[0_0_30px_rgba(8,145,178,0.5)] text-white border border-white/10"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {verifying ? (
                      <>
                        <AiOutlineLoading3Quarters className="animate-spin h-4 w-4 text-white" />
                        Verifying...
                      </>
                    ) : 'Verify & Continue'}
                  </span>
                </button>
              </form>

              <p className="text-[11px] text-zinc-600 text-center leading-relaxed mt-6">
                Keep your phone somewhere safe — you'll need this app any time you forget your password.
                If you ever lose it, your System Administrator can reset your account so you can enroll again.
              </p>

              <button
                type="button"
                onClick={signOut}
                className="w-full mt-6 flex items-center justify-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <HiOutlineArrowRightOnRectangle className="w-4 h-4" />
                Sign out and finish this later
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
