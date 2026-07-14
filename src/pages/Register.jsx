import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '../components/auth/AuthShell'
import { supabase } from '../supabase/client'

const fieldClass = 'w-full rounded-xl border border-[#F0D7C8] bg-[#FFFDFC] px-4 py-3 text-sm text-[#12100A] outline-none transition placeholder:text-[#B1A39C] focus:border-[#E35336] focus:ring-4 focus:ring-[#E35336]/10'

export default function Register() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)

  async function handleRegister(event) {
    event?.preventDefault()
    if (!name.trim() || !email.trim() || password.length < 6) return
    setError('')
    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim(), role: 'manager' } },
    })
    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    if (data.session) navigate('/app')
    else setRegistered(true)
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Manager accounts create groups and invite performers."
      alternate={<>Already have an account? <Link to="/login" className="font-bold text-[#E35336] no-underline">Log in</Link></>}
    >
      {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {registered ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-emerald-600 font-bold text-white">✓</span>
          <h2 className="mt-3 text-sm font-bold text-emerald-900">Check your email</h2>
          <p className="mt-1 text-xs leading-5 text-emerald-800">Confirm your manager account, then log in to create your first group.</p>
          <Link to="/login" className="mt-4 inline-block text-xs font-bold text-emerald-800">Go to login</Link>
        </div>
      ) : <form onSubmit={handleRegister} className="space-y-3.5">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-[#5F5550]">Name</span>
          <input autoFocus required autoComplete="name" value={name} onChange={event => setName(event.target.value)} placeholder="Your name" className={fieldClass} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-[#5F5550]">Email</span>
          <input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" className={fieldClass} />
        </label>
        <label className="block">
          <span className="mb-1.5 flex items-center justify-between text-xs font-bold text-[#5F5550]"><span>Password</span><span className="font-medium text-[#9988A1]">6+ characters</span></span>
          <input required minLength={6} type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Create a password" className={fieldClass} />
        </label>

        <div className="flex items-center gap-3 rounded-xl border border-[#F0D7C8] bg-[#FFF4EA] px-3 py-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#E35336] text-sm text-white">♬</span>
          <div><p className="text-xs font-bold text-[#12100A]">Manager account</p><p className="mt-0.5 text-[11px] text-[#6E625C]">You will invite singers and musicians after creating a group.</p></div>
        </div>

        <button type="submit" disabled={loading || !name.trim() || !email.trim() || password.length < 6} className="w-full rounded-xl bg-[#12100A] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-[#2B261B] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45">
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>}
      {!registered && <p className="mt-4 text-center text-[11px] text-[#9988A1]">Free to use · No credit card</p>}
    </AuthShell>
  )
}
