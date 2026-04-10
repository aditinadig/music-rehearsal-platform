import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabase/client'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setError('')
    setLoading(true)
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    if (loginError) { setError(loginError.message); setLoading(false); return }
    setLoading(false)
    navigate('/app')
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#f7f6f2', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between p-12 w-[44%] shrink-0" style={{ background: '#18181b', color: '#f7f6f2' }}>
        <div>
          <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.5rem', color: '#f7f6f2', letterSpacing: '-0.01em' }}>
            Cue<span style={{ color: '#7c3aed' }}>.</span>
          </div>
        </div>
        <div>
          <blockquote style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.75rem', lineHeight: 1.35, color: '#f7f6f2', marginBottom: '1.5rem' }}>
            "We used to spend the first 15 minutes of every rehearsal sorting out who sings what. Not anymore."
          </blockquote>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>
              AK
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#f7f6f2', margin: 0 }}>Anika K.</p>
              <p style={{ fontSize: '0.78rem', color: '#71717a', margin: 0 }}>Choir director, Prism Ensemble</p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          {['Line-level assignments', 'Real-time updates', 'Stage mode'].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ color: '#7c3aed', fontWeight: 700, fontSize: '0.85rem' }}>✓</span>
              <span style={{ fontSize: '0.78rem', color: '#a1a1aa' }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="lg:hidden mb-8" style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.4rem', color: '#18181b' }}>
            Cue<span style={{ color: '#7c3aed' }}>.</span>
          </div>

          <h1 className="mb-1" style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '2rem', color: '#18181b', letterSpacing: '-0.01em' }}>
            Welcome back
          </h1>
          <p className="mb-7" style={{ fontSize: '0.9rem', color: '#6b7280' }}>
            Log in to your rehearsal space.
          </p>

          {error && (
            <div className="rounded-xl px-4 py-3 mb-5 text-sm" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 text-sm rounded-xl transition focus:outline-none"
                style={{ border: '1.5px solid #e4e1d9', background: '#fff', color: '#18181b' }}
                onFocus={e => e.target.style.borderColor = '#7c3aed'}
                onBlur={e => e.target.style.borderColor = '#e4e1d9'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="Your password"
                className="w-full px-4 py-2.5 text-sm rounded-xl transition focus:outline-none"
                style={{ border: '1.5px solid #e4e1d9', background: '#fff', color: '#18181b' }}
                onFocus={e => e.target.style.borderColor = '#7c3aed'}
                onBlur={e => e.target.style.borderColor = '#e4e1d9'}
              />
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50"
              style={{ background: '#7c3aed', boxShadow: '0 2px 10px rgba(124,58,237,0.25)', marginTop: '0.5rem' }}
            >
              {loading ? 'Logging in…' : 'Log in'}
            </button>
          </div>

          <p className="text-sm text-center mt-6" style={{ color: '#6b7280' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#7c3aed', fontWeight: 500, textDecoration: 'none' }}>
              Sign up free
            </Link>
          </p>

          <p className="text-center mt-8">
            <Link to="/" style={{ fontSize: '0.78rem', color: '#a1a1aa', textDecoration: 'none' }}>
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
