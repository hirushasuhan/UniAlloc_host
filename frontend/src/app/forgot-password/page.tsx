'use client'
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { HiOutlineChevronLeft, HiOutlineExclamationCircle, HiOutlineCheckCircle, HiOutlineEye, HiOutlineEyeSlash } from 'react-icons/hi2'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'

type Step = 'email' | 'unavailable' | 'reset' | 'done'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCheckEmail(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/forgot-password/check', { email })
      setStep(data.data.recoverable ? 'reset' : 'unavailable')
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/forgot-password/reset', { email, code, new_password: newPassword })
      setStep('done')
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Unable to reset your password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-[#09090B] text-zinc-100 p-6">
      <div className="fixed top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-[2.5rem] blur-xl opacity-50" />

        <div className="relative bg-[#09090B]/80 border border-white/5 p-8 sm:p-10 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl">
          <div className="flex items-center mb-8">
            <Link
              href="/login"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all mr-4 border border-white/5 hover:scale-105"
            >
              <HiOutlineChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">Reset Password</h1>
              <p className="text-xs text-zinc-400 mt-1">Using your authenticator app</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 flex items-start gap-3">
              <HiOutlineExclamationCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {step === 'email' && (
            <form onSubmit={handleCheckEmail} className="space-y-5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">University Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white
                             placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                  placeholder="you@university.edu"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 relative overflow-hidden rounded-xl font-medium py-3.5 px-4 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                           bg-cyan-600 hover:bg-cyan-500 shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:shadow-[0_0_30px_rgba(8,145,178,0.5)] text-white border border-white/10"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <AiOutlineLoading3Quarters className="animate-spin h-4 w-4 text-white" />
                      Checking...
                    </>
                  ) : 'Continue'}
                </span>
              </button>
            </form>
          )}

          {step === 'unavailable' && (
            <div className="space-y-5">
              <p className="text-sm text-zinc-400 leading-relaxed">
                We couldn't verify self-service recovery for that email. This can mean the address is incorrect,
                or an authenticator app hasn't been set up on that account yet.
              </p>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Please contact your System Administrator to have your password reset.
              </p>
              <button
                type="button"
                onClick={() => { setStep('email'); setError('') }}
                className="w-full rounded-xl font-medium py-3 px-4 border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200 transition-all"
              >
                Try a different email
              </button>
            </div>
          )}

          {step === 'reset' && (
            <form onSubmit={handleReset} className="space-y-5">
              <p className="text-xs text-zinc-500 -mt-2">
                Enter the current 6-digit code from your authenticator app, then choose a new password.
              </p>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">Authenticator Code</label>
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

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 pr-12 text-sm text-white
                               placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                    placeholder="••••••••"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors"
                  >
                    {showPassword ? <HiOutlineEyeSlash className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">Confirm New Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white
                             placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                  placeholder="••••••••"
                  minLength={8}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full mt-2 relative overflow-hidden rounded-xl font-medium py-3.5 px-4 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                           bg-cyan-600 hover:bg-cyan-500 shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:shadow-[0_0_30px_rgba(8,145,178,0.5)] text-white border border-white/10"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <AiOutlineLoading3Quarters className="animate-spin h-4 w-4 text-white" />
                      Resetting...
                    </>
                  ) : 'Reset Password'}
                </span>
              </button>
            </form>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
                <HiOutlineCheckCircle className="w-7 h-7" />
              </div>
              <p className="text-sm text-zinc-300">Your password has been reset. You can now sign in with it.</p>
              <button
                type="button"
                onClick={() => router.replace('/login')}
                className="w-full mt-2 rounded-xl font-medium py-3 px-4 bg-cyan-600 hover:bg-cyan-500 text-white border border-white/10 transition-all"
              >
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
