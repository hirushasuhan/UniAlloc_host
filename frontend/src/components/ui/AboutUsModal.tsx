'use client'
import { HiOutlineXMark } from 'react-icons/hi2'

interface Props {
  onClose: () => void
}

export default function AboutUsModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[var(--card-solid)] shadow-2xl rounded-2xl border border-[var(--border)] w-full max-w-md p-6 relative text-center">
        <button onClick={onClose} className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--text)] transition-colors">
          <HiOutlineXMark size={20}/>
        </button>
        
        <div className="flex justify-center mb-6 mt-4">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center bg-[var(--card)] border border-[var(--border-strong)] shadow-lg overflow-hidden"
               style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}>
            <img src="/logo.png" alt="UniAlloc" className="w-16 h-16 object-contain" />
          </div>
        </div>

        <h2 className="font-heading font-extrabold text-2xl tracking-tight mb-2">
          <span className="text-gradient">Uni</span>Alloc
        </h2>
        
        <p className="text-[var(--muted)] text-sm mb-6">Version 1.0.0</p>
        
        <div className="text-sm text-[var(--text)] space-y-4 mb-8">
          <p>
            UniAlloc is an advanced academic workload management and assignment allocation system. 
            It is designed to streamline operations across faculties and departments by providing tools for efficient allocation and seamless cross-faculty collaboration.
          </p>
          <p>
            Developed with a focus on usability, transparency, and fairness in academic workload distribution.
          </p>
        </div>

        <div className="border-t border-[var(--border)] pt-4 text-xs text-[var(--muted)]">
          &copy; {new Date().getFullYear()} UniAlloc System. All rights reserved.
        </div>
      </div>
    </div>
  )
}
