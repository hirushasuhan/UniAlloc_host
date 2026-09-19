'use client'
import { useEffect, useState } from 'react'
import { HiOutlineSun, HiOutlineMoon } from 'react-icons/hi2'

type Theme = 'dark' | 'light'

function applyTheme(t: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', t === 'dark')
  try { localStorage.setItem('theme', t) } catch {}
}

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const stored = (typeof localStorage !== 'undefined' && localStorage.getItem('theme')) as Theme | null
    const initial: Theme = stored ?? (document.documentElement.classList.contains('dark') ? 'dark' : 'light')
    setTheme(initial)
  }, [])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
  }

  const isDark = theme === 'dark'

  if (compact) {
    return (
      <button
        onClick={toggle}
        aria-label="Toggle theme"
        className="w-10 h-10 flex items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--card)] backdrop-blur-md text-[var(--text)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all active:scale-95"
      >
        {isDark ? <HiOutlineSun size={18} /> : <HiOutlineMoon size={18} />}
      </button>
    )
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="group relative flex items-center w-full rounded-xl border border-[var(--border)] bg-[var(--card)] backdrop-blur-md px-1.5 py-1.5 transition-colors hover:border-[var(--border-strong)]"
    >
      {/* sliding pill */}
      <span
        className="absolute top-1.5 bottom-1.5 w-[calc(50%-0.375rem)] rounded-lg transition-transform duration-300 ease-out"
        style={{
          background: 'linear-gradient(120deg, var(--accent), var(--accent-2))',
          transform: isDark ? 'translateX(0)' : 'translateX(100%)',
        }}
      />
      <span className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold transition-colors ${isDark ? 'text-white' : 'text-[var(--muted)]'}`}>
        <HiOutlineMoon size={14} /> Dark
      </span>
      <span className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold transition-colors ${!isDark ? 'text-white' : 'text-[var(--muted)]'}`}>
        <HiOutlineSun size={14} /> Light
      </span>
    </button>
  )
}
