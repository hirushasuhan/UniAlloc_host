'use client'
import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { saveAuth, roleHome } from '@/lib/auth'

// Icons from react-icons
import { HiOutlineUserGroup, HiOutlineAcademicCap, HiOutlineChevronRight, HiOutlineChevronLeft, HiOutlineExclamationCircle, HiOutlineEye, HiOutlineEyeSlash } from 'react-icons/hi2'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'

type ViewState = 'select' | 'staff-login' | 'student-login' | 'student-register'

export default function LoginPage() {
  const router = useRouter()
  const [view, setView] = useState<ViewState>('select')
  
  // Form states
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [enrollmentNo, setEnrollmentNo] = useState('')
  const [facultyId, setFacultyId] = useState('')
  const [deptId, setDeptId]     = useState('')

  const [departments, setDepartments] = useState<any[]>([])

  // Faculty list derived from the (public) departments payload, which already
  // includes faculty_id + faculty_name. Avoids calling the auth-protected
  // /faculties endpoint from the public registration view.
  const faculties = Array.from(
    new Map(departments.map(d => [d.faculty_id, d.faculty_name])).entries()
  ).map(([id, faculty_name]) => ({ id, faculty_name }))
  
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (view === 'student-register' && departments.length === 0) {
      api.get('/departments')
        .then(res => setDepartments(res.data.data))
        .catch(err => console.error('Failed to load departments', err))
    }
  }, [view, departments.length])

  const clearForm = () => {
    setEmail('')
    setPassword('')
    setFullName('')
    setEnrollmentNo('')
    setFacultyId('')
    setDeptId('')
    setError('')
    setShowPassword(false)
  }

  const changeView = (v: ViewState) => {
    clearForm()
    setView(v)
  }

  async function handleLogin(e: FormEvent, roleType: 'staff' | 'student') {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      const userRole = data.data.user.role

      if (roleType === 'student' && userRole !== 'student') {
        setError('This login is for students only. Please use the Staff login.')
        setLoading(false)
        return
      }
      
      if (roleType === 'staff' && userRole === 'student') {
        setError('This login is for staff members only. Please use the Student login.')
        setLoading(false)
        return
      }

      saveAuth(data.data.token, data.data.user)
      router.replace(roleHome(data.data.user.role))
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = {
        full_name: fullName,
        email,
        password,
        department_id: deptId ? Number(deptId) : null,
        enrollment_number: enrollmentNo
      }
      const { data } = await api.post('/auth/register', payload)
      saveAuth(data.data.token, data.data.user)
      router.replace(roleHome(data.data.user.role))
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Registration failed. Check your inputs.')
    } finally {
      setLoading(false)
    }
  }

  const renderSelectView = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-heading font-extrabold tracking-tight text-white mb-2">Welcome Back</h2>
        <p className="text-zinc-400 text-sm">Select your portal to continue</p>
      </div>

      <button 
        onClick={() => changeView('staff-login')}
        className="relative w-full flex items-center p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-cyan-500/30 transition-all duration-500 group overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10 w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white transition-all duration-500 mr-4 group-hover:scale-105">
          <HiOutlineUserGroup className="w-6 h-6" />
        </div>
        <div className="relative z-10 text-left flex-1">
          <h3 className="text-white font-semibold text-lg group-hover:text-cyan-100 transition-colors">Staff Portal</h3>
          <p className="text-xs text-zinc-400 group-hover:text-cyan-200/70 transition-colors">Lecturers, Heads & Admins</p>
        </div>
        <div className="relative z-10 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-cyan-500/20 group-hover:translate-x-1 transition-all duration-300">
          <HiOutlineChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-cyan-400" />
        </div>
      </button>

      <button 
        onClick={() => changeView('student-login')}
        className="relative w-full flex items-center p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-purple-500/30 transition-all duration-500 group overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10 w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-all duration-500 mr-4 group-hover:scale-105">
          <HiOutlineAcademicCap className="w-6 h-6" />
        </div>
        <div className="relative z-10 text-left flex-1">
          <h3 className="text-white font-semibold text-lg group-hover:text-purple-100 transition-colors">Student Portal</h3>
          <p className="text-xs text-zinc-400 group-hover:text-purple-200/70 transition-colors">Undergraduates</p>
        </div>
        <div className="relative z-10 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-purple-500/20 group-hover:translate-x-1 transition-all duration-300">
          <HiOutlineChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-purple-400" />
        </div>
      </button>

      <div className="mt-8 pt-6">
        <p className="text-xs text-zinc-600 text-center font-medium tracking-wide uppercase">
          © {new Date().getFullYear()} UniAlloc. All rights reserved. <br />
        </p>
      </div>
    </div>
  )

  const renderLoginForm = (roleTitle: string) => {
    const isStudent = roleTitle.toLowerCase() === 'student'
    const colorClass = isStudent ? 'purple' : 'cyan'
    
    return (
      <div className="animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="flex items-center mb-8">
          <button 
            onClick={() => changeView('select')} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all mr-4 border border-white/5 hover:scale-105"
          >
            <HiOutlineChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-heading font-extrabold text-white tracking-tight">{roleTitle} Login</h2>
            <p className="text-xs text-zinc-400 mt-1">Authenticate to access your dashboard</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 flex items-start gap-3 animate-in shake">
            <HiOutlineExclamationCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={(e) => handleLogin(e, isStudent ? 'student' : 'staff')} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">University Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={`w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white
                         placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-${colorClass}-500/50 focus:border-${colorClass}-500 transition-all`}
              placeholder="you@university.edu"
              required
            />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center ml-1">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Password</label>
              <button 
                type="button" 
                onClick={() => router.push('/forgot-password')} 
                className={`text-xs text-${colorClass}-400 hover:text-${colorClass}-300 transition-colors`}
              >
                Forgot?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={`w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 pr-12 text-sm text-white
                           placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-${colorClass}-500/50 focus:border-${colorClass}-500 transition-all`}
                placeholder="••••••••"
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
          
          <button
            type="submit"
            disabled={loading}
            className={`w-full mt-6 relative group overflow-hidden rounded-xl font-medium py-3.5 px-4 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
              ${isStudent 
                ? 'bg-purple-600 hover:bg-purple-500 shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_30px_rgba(147,51,234,0.5)]' 
                : 'bg-cyan-600 hover:bg-cyan-500 shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:shadow-[0_0_30px_rgba(8,145,178,0.5)]'}
              text-white border border-white/10`}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <AiOutlineLoading3Quarters className="animate-spin h-4 w-4 text-white" />
                  Authenticating...
                </>
              ) : 'Sign In'}
            </span>
            <div className="absolute inset-0 h-full w-full bg-gradient-to-t from-black/20 to-transparent"></div>
          </button>
        </form>
        
        {isStudent && (
          <div className="mt-8 text-center text-sm text-zinc-500">
            Don't have an account yet?{' '}
            <button onClick={() => changeView('student-register')} className="text-purple-400 font-medium hover:text-purple-300 transition-colors ml-1 border-b border-purple-400/30 hover:border-purple-300 pb-0.5">
              Create Account
            </button>
          </div>
        )}
      </div>
    )
  }

  const renderRegisterForm = () => (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center mb-6">
        <button 
          onClick={() => changeView('student-login')} 
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all mr-4 shrink-0 border border-white/5 hover:scale-105"
        >
          <HiOutlineChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-heading font-extrabold text-white tracking-tight">Register</h2>
          <p className="text-xs text-zinc-400 mt-1">Join the student portal</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 flex items-start gap-3">
          <HiOutlineExclamationCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider ml-1">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white
                       placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
            placeholder="John Doe"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1 space-y-1">
            <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider ml-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white
                         placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
              placeholder="you@university.edu"
              required
            />
          </div>
          <div className="col-span-2 sm:col-span-1 space-y-1">
            <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider ml-1">Enrollment No.</label>
            <input
              type="text"
              value={enrollmentNo}
              onChange={e => setEnrollmentNo(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white
                         placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
              placeholder="UWU/IIT/23/000"
              required
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider ml-1">Faculty</label>
          <select
            value={facultyId}
            onChange={e => { setFacultyId(e.target.value); setDeptId('') }}
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm text-white
                       outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
            required
          >
            <option value="" disabled>Select your faculty</option>
            {faculties.map(f => (
              <option key={f.id} value={f.id}>{f.faculty_name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider ml-1">Department</label>
          <select
            value={deptId}
            onChange={e => setDeptId(e.target.value)}
            disabled={!facultyId}
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm text-white
                       outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all
                       disabled:opacity-50 disabled:cursor-not-allowed"
            required
          >
            <option value="" disabled>{facultyId ? 'Select your department' : 'Select your faculty first'}</option>
            {departments
              .filter(d => d.faculty_id === parseInt(facultyId))
              .map(d => (
                <option key={d.id} value={d.id}>{d.dept_name}</option>
              ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider ml-1">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 pr-12 text-sm text-white
                         placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
              placeholder="••••••••"
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
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 relative group overflow-hidden rounded-xl font-medium py-3 px-4 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] border border-white/10"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {loading ? (
              <>
                <AiOutlineLoading3Quarters className="animate-spin h-4 w-4 text-white" />
                Creating...
              </>
            ) : 'Create Account'}
          </span>
          <div className="absolute inset-0 h-full w-full bg-gradient-to-t from-black/20 to-transparent"></div>
        </button>
      </form>
    </div>
  )

  return (
    <main className="min-h-screen w-full flex bg-[#09090B] text-zinc-100 overflow-hidden selection:bg-cyan-500/30">
      
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex w-[55%] relative items-center justify-center border-r border-white/5 bg-black/20 backdrop-blur-3xl">
        
        {/* Dynamic Grid Background */}
        <div 
          className="absolute inset-0 opacity-[0.15]" 
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm1 1h38v38H1V1z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E\")" }} 
        />

        {/* Ambient Glows */}
        <div className="absolute top-[20%] left-[20%] w-[400px] h-[400px] rounded-full bg-cyan-600/20 blur-[120px] mix-blend-screen animate-pulse duration-1000" />
        <div className="absolute bottom-[20%] right-[20%] w-[400px] h-[400px] rounded-full bg-purple-600/20 blur-[120px] mix-blend-screen animate-pulse duration-1000 delay-500" />
        
        <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-xl px-12">
          
          {/* Custom Logo Display */}
          <div className="relative flex flex-col items-center justify-center mb-10 animate-in fade-in zoom-in-95 duration-1000">
            {/* Animated rings around logo */}
            <div className="absolute inset-0 rounded-full border border-cyan-500/20 scale-[1.3] animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
            <div className="absolute inset-0 rounded-full border border-purple-500/20 scale-[1.6] animate-[ping_4s_cubic-bezier(0,0,0.2,1)_infinite]" />
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-purple-500/10 blur-2xl rounded-full scale-[1.5]" />
            
            {/* Logo Glass Container */}
            <div className="relative w-36 h-36 rounded-[2rem] bg-zinc-900/40 backdrop-blur-2xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] flex items-center justify-center p-5 overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
               <img 
                 src="/logo.png" 
                 alt="UniAlloc Icon" 
                 className="relative w-full h-full object-cover rounded-2xl drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] group-hover:scale-105 transition-transform duration-500" 
               />
            </div>
          </div>
          
          <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 fill-mode-both">
            <h1 className="text-5xl md:text-6xl font-heading font-black tracking-tighter">
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Uni</span>
              <span className="text-white drop-shadow-md">Alloc</span>
            </h1>
            
            <div className="h-[1px] w-16 bg-gradient-to-r from-transparent via-zinc-500 to-transparent mx-auto"></div>

            <p className="text-lg md:text-xl text-zinc-400 font-light leading-relaxed max-w-md mx-auto">
              The Intelligent <br/>
              <span className="text-zinc-200 font-medium">University HR Allocation</span> Platform
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Forms */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-6 sm:p-12 relative z-10 bg-[#09090B]">
        
        {/* Mobile Header */}
        <div className="absolute top-8 left-8 lg:hidden flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <img src="/logo.png" alt="UniAlloc Logo" className="w-8 h-8 object-cover rounded-md" />
          <span className="font-heading font-extrabold text-xl tracking-tight">UniAlloc</span>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-[420px] mt-16 lg:mt-0 relative">
          
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-[2.5rem] blur-xl opacity-50" />
          
          <div className="relative bg-[#09090B]/80 border border-white/5 p-8 sm:p-10 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl">
            
            {/* Top accent line */}
            <div className="absolute top-0 left-10 right-10 h-[1px] bg-gradient-to-r from-transparent via-zinc-500/50 to-transparent" />
            
            <div className="relative">
              {view === 'select' && renderSelectView()}
              {view === 'staff-login' && renderLoginForm('Staff')}
              {view === 'student-login' && renderLoginForm('Student')}
              {view === 'student-register' && renderRegisterForm()}
            </div>
          </div>

          <div className="mt-8 text-center animate-in fade-in duration-1000 delay-500">
             <p className="text-[11px] font-medium tracking-widest uppercase text-zinc-600">
               Secured by Advanced Encryption • © {new Date().getFullYear()}
             </p>
          </div>
        </div>
      </div>
    </main>
  )
}
