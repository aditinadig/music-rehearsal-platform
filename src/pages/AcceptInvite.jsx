import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '../components/auth/AuthShell'
import { supabase } from '../supabase/client'

const fieldClass = 'w-full rounded-xl border border-[#F0D7C8] bg-[#FFFDFC] px-4 py-3 text-sm text-[#12100A] outline-none transition placeholder:text-[#B1A39C] focus:border-[#E35336] focus:ring-4 focus:ring-[#E35336]/10'

export default function AcceptInvite() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [sessionReady, setSessionReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    const markSession = session => {
      if (!active || !session) return
      setSessionReady(true)
      setChecking(false)
      setError('')
    }
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => markSession(session))
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return
      if (session) markSession(session)
      else {
        setSessionReady(false)
        setChecking(false)
        setError('This invitation link is invalid or has expired. Ask your manager to send a new one.')
      }
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function handlePassword(event) {
    event.preventDefault()
    if (!sessionReady || password.length < 6 || password !== confirmPassword) return
    setError('')
    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }
    navigate('/app')
  }

  return (
    <AuthShell
      title="Set your password"
      subtitle="Your manager has already created your rehearsal profile."
      alternate={<>Already activated? <Link to="/login" className="font-bold text-[#E35336] no-underline">Log in</Link></>}
    >
      {checking ? (
        <div className="flex items-center justify-center py-12"><span className="h-6 w-6 animate-spin rounded-full border-2 border-[#E35336] border-t-transparent" /></div>
      ) : (
        <>
          {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {sessionReady && (
            <form onSubmit={handlePassword} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 flex justify-between text-xs font-bold text-[#5F5550]"><span>New password</span><span className="font-medium text-[#9988A1]">6+ characters</span></span>
                <input autoFocus required minLength={6} type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Create a password" className={fieldClass} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-[#5F5550]">Confirm password</span>
                <input required minLength={6} type="password" autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Enter it again" className={fieldClass} />
              </label>
              {confirmPassword && password !== confirmPassword && <p className="text-xs font-medium text-red-600">Passwords do not match.</p>}
              <button type="submit" disabled={loading || password.length < 6 || password !== confirmPassword} className="w-full rounded-xl bg-[#12100A] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-[#2B261B] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45">
                {loading ? 'Activating…' : 'Activate account'}
              </button>
            </form>
          )}
        </>
      )}
    </AuthShell>
  )
}
