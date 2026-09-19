'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { purgeAllClientData } from '@/lib/auth'
import { HiOutlineShieldExclamation } from 'react-icons/hi2'

export default function NoAccessPage() {
  const router = useRouter()
  const [seconds, setSeconds] = useState(5)

  useEffect(() => {
    // Invalidate EVERYTHING immediately — storage, cookies, caches
    purgeAllClientData()

    const tick = setInterval(() => setSeconds(s => (s > 0 ? s - 1 : 0)), 1000)
    const redirect = setTimeout(() => {
      // replace() so the back button can't return to the protected page
      router.replace('/login')
    }, 5000)

    return () => { clearInterval(tick); clearTimeout(redirect) }
  }, [router])

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-[#09090B] text-zinc-100 p-6">
      {/* Ambient glow */}
      <div className="fixed top-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-red-600/10 blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md text-center">
        <div className="absolute -inset-1 bg-gradient-to-r from-red-500/20 to-rose-500/20 rounded-[2.5rem] blur-xl opacity-60" />

        <div className="relative bg-[#09090B]/80 border border-white/5 p-10 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-6">
            <HiOutlineShieldExclamation className="w-10 h-10" />
          </div>

          <h1 className="text-2xl font-heading font-extrabold tracking-tight text-white mb-2">
            Access Denied
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed mb-8">
            You are not authorized to view this page.
            Your session has been terminated and all local data has been cleared for security.
          </p>

          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full border-2 border-red-500/30 flex items-center justify-center text-red-400 font-bold font-heading text-lg">
              {seconds}
            </div>
            <p className="text-xs text-zinc-500 text-left leading-tight">
              Redirecting to the<br />login screen…
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden mt-6">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-rose-500 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${(seconds / 5) * 100}%` }}
            />
          </div>

          <button
            onClick={() => router.replace('/login')}
            className="mt-8 text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-4 transition-colors"
          >
            Go to login now
          </button>
        </div>
      </div>
    </main>
  )
}
