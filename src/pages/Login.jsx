import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabase/client'

const terracotta = '#E35336'
const peach = '#FFD3AC'
const lavender = '#9988A1'
const rust = '#8A2B0E'
const ink = '#12100A'
const muted = '#5F5550'
const border = '#FFD3AC'

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
    <div className="min-h-screen flex" style={{ background: '#fff', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between p-12 w-[44%] shrink-0" style={{ background: ink, color: '#fff' }}>
        <div>
          <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '-0.01em' }}>
            Cue<span style={{ color: terracotta }}>.</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            {['Assignments', 'Cues', 'Confirmations'].map((label, i) => (
              <span key={label} style={{
                border: '1px solid rgba(255,255,255,0.14)',
                background: i === 0 ? 'rgba(227,83,54,0.18)' : 'rgba(255,255,255,0.06)',
                color: i === 0 ? peach : lavender,
                borderRadius: '999px',
                padding: '0.35rem 0.75rem',
                fontSize: '0.72rem',
                fontWeight: 600,
              }}>{label}</span>
            ))}
          </div>
        </div>
        <div>
          <blockquote style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.75rem', lineHeight: 1.35, color: '#fff', marginBottom: '1.5rem' }}>
            "We used to spend the first 15 minutes of every rehearsal sorting out who sings what. Not anymore."
          </blockquote>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: terracotta, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>
              AK
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#fff', margin: 0 }}>Anika K.</p>
              <p style={{ fontSize: '0.78rem', color: lavender, margin: 0 }}>Choir director, Prism Ensemble</p>
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gap: '0.65rem' }}>
          {['Line-level assignments', 'Real-time updates', 'Stage mode'].map(f => (
            <div key={f} style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px', padding: '0.65rem 0.8rem',
            }}>
              <span style={{ color: peach, fontWeight: 700, fontSize: '0.85rem' }}>✓</span>
              <span style={{ fontSize: '0.78rem', color: lavender }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[430px] rounded-3xl border p-6 shadow-sm" style={{ borderColor: border, background: 'linear-gradient(180deg, #fff 0%, #FFFCFA 100%)' }}>

          {/* Mobile logo */}
          <div className="lg:hidden mb-8" style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.4rem', color: ink }}>
            Cue<span style={{ color: terracotta }}>.</span>
          </div>

          <h1 className="mb-1" style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '2rem', color: ink, letterSpacing: '-0.01em' }}>
            Welcome back
          </h1>
          <p className="mb-7" style={{ fontSize: '0.9rem', color: muted }}>
            Log in to your rehearsal space.
          </p>

          <div className="grid grid-cols-3 gap-2 mb-6">
            {[
              ['Role', 'auto'],
              ['Updates', 'live'],
              ['Stage', 'ready'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border bg-white px-3 py-2" style={{ borderColor: border }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: lavender }}>{label}</p>
                <p className="text-sm font-semibold mt-1" style={{ color: ink }}>{value}</p>
              </div>
            ))}
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3 mb-5 text-sm" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: muted }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 text-sm rounded-xl transition focus:outline-none"
                style={{ border: `1.5px solid ${border}`, background: '#fff', color: ink }}
                onFocus={e => e.target.style.borderColor = terracotta}
                onBlur={e => e.target.style.borderColor = peach}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: muted }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="Your password"
                className="w-full px-4 py-2.5 text-sm rounded-xl transition focus:outline-none"
                style={{ border: `1.5px solid ${border}`, background: '#fff', color: ink }}
                onFocus={e => e.target.style.borderColor = terracotta}
                onBlur={e => e.target.style.borderColor = peach}
              />
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50"
              style={{ background: rust, boxShadow: '0 8px 24px rgba(138,43,14,0.18)', marginTop: '0.5rem' }}
            >
              {loading ? 'Logging in…' : 'Log in'}
            </button>
          </div>

          <p className="text-sm text-center mt-6" style={{ color: muted }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: terracotta, fontWeight: 500, textDecoration: 'none' }}>
              Sign up free
            </Link>
          </p>

          <p className="text-center mt-8">
            <Link to="/" style={{ fontSize: '0.78rem', color: lavender, textDecoration: 'none' }}>
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
