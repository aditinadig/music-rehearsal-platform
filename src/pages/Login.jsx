import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '../components/auth/AuthShell'
import { supabase } from '../supabase/client'

const fieldClass = 'w-full rounded-xl border border-[#F0D7C8] bg-[#FFFDFC] px-4 py-3 text-sm text-[#12100A] outline-none transition placeholder:text-[#B1A39C] focus:border-[#E35336] focus:ring-4 focus:ring-[#E35336]/10'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(event) {
    event?.preventDefault()
    if (!email.trim() || !password) return
    setError('')
    setLoading(true)
    const { error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (loginError) {
      setError(loginError.message)
      setLoading(false)
      return
    }
    navigate('/app')
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Continue to your rehearsal workspace."
      alternate={<>New to Cue? <Link to="/register" className="font-bold text-[#E35336] no-underline">Create an account</Link></>}
    >
      {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <form onSubmit={handleLogin} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-[#5F5550]">Email</span>
          <input autoFocus required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" className={fieldClass} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-[#5F5550]">Password</span>
          <input required type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your password" className={fieldClass} />
        </label>
        <button type="submit" disabled={loading || !email.trim() || !password} className="w-full rounded-xl bg-[#12100A] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-[#2B261B] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45">
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <div className="mt-5 flex items-center justify-center gap-2 text-xs text-[#9988A1]">
        <span className="h-px flex-1 bg-[#F0D7C8]" /><Link to="/" className="text-[#9988A1] no-underline hover:text-[#5F5550]">Back home</Link><span className="h-px flex-1 bg-[#F0D7C8]" />
      </div>
    </AuthShell>
  )
}
