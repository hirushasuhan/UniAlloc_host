'use client'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface TruncatedTitleProps {
  title: string
  subtitle?: string
  className?: string
  maxWidthClass?: string
}

export default function TruncatedTitle({
  title,
  subtitle,
  className = 'font-medium',
  maxWidthClass = 'max-w-[200px] lg:max-w-[280px]',
}: TruncatedTitleProps) {
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [coords, setCoords] = useState<{
    left: number
    top: number
    showBelow: boolean
  }>({ left: 0, top: 0, showBelow: false })
  const spanRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!visible) return

    const handleScrollOrResize = () => {
      setVisible(false)
    }

    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [visible])

  const handleMouseEnter = () => {
    if (!spanRef.current) return
    const rect = spanRef.current.getBoundingClientRect()
    const spaceAbove = rect.top
    const showBelow = spaceAbove < 80

    setCoords({
      left: Math.max(16, Math.min(rect.left, window.innerWidth - 360)),
      top: showBelow ? rect.bottom + 8 : rect.top - 8,
      showBelow,
    })
    setVisible(true)
  }

  const handleMouseLeave = () => {
    setVisible(false)
  }

  return (
    <>
      <span
        ref={spanRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title={title}
        className={`block truncate cursor-default transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 ${maxWidthClass} ${className}`}
      >
        {title}
      </span>

      {mounted && visible && createPortal(
        <div
          role="tooltip"
          style={{
            position: 'fixed',
            top: coords.showBelow ? coords.top : undefined,
            bottom: !coords.showBelow ? window.innerHeight - coords.top : undefined,
            left: coords.left,
          }}
          className="z-50 pointer-events-none max-w-sm sm:max-w-md px-3.5 py-2 rounded-xl bg-slate-900/95 dark:bg-slate-950/95 text-white text-xs shadow-2xl border border-slate-700/60 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 select-none"
        >
          <p className="font-medium leading-relaxed break-words whitespace-normal text-slate-100">
            {title}
          </p>
          {subtitle && (
            <p className="text-[11px] text-slate-400 mt-1 leading-normal border-t border-slate-800 pt-1">
              {subtitle}
            </p>
          )}
        </div>,
        document.body
      )}
    </>
  )
}
