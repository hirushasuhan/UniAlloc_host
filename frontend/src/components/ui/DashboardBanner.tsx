'use client'
import { getUser, AuthUser } from '@/lib/auth'

export default function DashboardBanner({ user }: { user?: AuthUser }) {
  const currentUser = user || getUser()
  if (!currentUser) return null
  
  const facultyName = currentUser.faculty_name ? currentUser.faculty_name : 'University'
  
  return (
    <div className="relative w-full h-48 md:h-64 rounded-3xl overflow-hidden mb-8 shadow-md">
      {/* Background Image */}
      <img 
        src="/banner.png" 
        alt="University Banner" 
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {/* Dark Gradient Overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />

      {/* Text Content */}
      <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-10">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-2 tracking-tight drop-shadow-lg">
          Welcome back, {currentUser.full_name}
        </h1>
        <p className="text-sm md:text-base text-white/90 drop-shadow-md max-w-xl">
          Here is what's happening in the {facultyName} today.
        </p>
      </div>
    </div>
  )
}
