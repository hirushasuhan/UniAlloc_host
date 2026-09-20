'use client'
import { useEffect } from 'react'
import { HiOutlineTrash, HiOutlineXMark } from 'react-icons/hi2'

interface ConfirmDeleteModalProps {
  isOpen: boolean
  title?: string
  taskTitle?: string
  description?: string
  confirmText?: string
  cancelText?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDeleteModal({
  isOpen,
  title = 'Delete Cancelled Assignment?',
  taskTitle,
  description = 'Are you sure you want to permanently delete this cancelled assignment? This action cannot be undone.',
  confirmText = 'Delete Permanently',
  cancelText = 'Cancel',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, loading, onCancel])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel()
      }}
    >
      <div
        className="bg-[var(--card-solid)] shadow-2xl rounded-2xl border border-[var(--border)] w-full max-w-md p-6 relative text-center transform transition-all animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onCancel}
          disabled={loading}
          className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--text)] transition-colors p-1 rounded-lg hover:bg-[var(--border)]/50"
          aria-label="Close dialog"
        >
          <HiOutlineXMark size={20} />
        </button>

        {/* Danger Trash Icon with glowing red/rose pulse effect */}
        <div className="flex justify-center mb-4 mt-2">
          <div className="relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-red-500/30 to-rose-500/30 rounded-full blur-lg animate-pulse" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-red-500/25">
              <HiOutlineTrash size={32} className="stroke-[1.75]" />
            </div>
          </div>
        </div>

        <h2 className="font-heading font-bold text-xl text-[var(--text)] mb-2">
          {title}
        </h2>

        {taskTitle && (
          <div className="mx-auto my-3 px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-500/20 max-w-xs text-xs font-semibold text-red-600 dark:text-red-400 truncate">
            {taskTitle}
          </div>
        )}

        <p className="text-sm text-[var(--muted)] leading-relaxed mb-6">
          {description}
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn-secondary flex-1 justify-center py-2.5 text-sm"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 justify-center py-2.5 px-4 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-lg shadow-red-500/25 active:scale-[0.98] transition-all inline-flex items-center gap-2"
          >
            <HiOutlineTrash size={16} />
            {loading ? 'Deleting…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
