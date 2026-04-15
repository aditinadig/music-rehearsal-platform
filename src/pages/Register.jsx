import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabase/client'

const terracotta = '#E35336'
const lavender = '#9988A1'
const rust = '#8A2B0E'
const ink = '#12100A'
const muted = '#5F5550'
const border = '#FFD3AC'
const warm = '#FFF4EA'

const ROLES = [
  { value: 'singer', label: 'Singer', desc: 'I sing assigned lines and need to track lyric updates.', emoji: '🎤' },
  { value: 'musician', label: 'Musician', desc: 'I play an instrument and follow chord charts and cues.', emoji: '🎸' },
  { value: 'manager', label: 'Manager / Director', desc: 'I build songs, assign parts, and coordinate the group.', emoji: '🎼' },
]

const ROLE_STYLE = {
  singer: { background: '#FCE7F3', color: '#DB2777' },
  musician: { background: '#DBEAFE', color: '#2563EB' },
  manager: { background: '#F3E8FF', color: '#9333EA' },
}

export default function Register() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('singer')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister() {
    setError('')
    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) { setError(signUpError.message); setLoading(false); return }

    const { error: profileError } = await supabase.from('users').insert({ user_id: data.user.id, name, role })
    if (profileError) { setError(profileError.message); setLoading(false); return }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) { setError(signInError.message); setLoading(false); return }

    setLoading(false)
    navigate('/app')
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#fff', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 w-[44%] shrink-0" style={{ background: ink, color: '#fff' }}>
        <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.5rem', color: '#fff' }}>
          Cue<span style={{ color: terracotta }}>.</span>
        </div>

        <div>
          <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '2rem', color: '#fff', lineHeight: 1.3, marginBottom: '1.5rem' }}>
            Rehearse with the<br />whole picture.
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { icon: '📋', text: 'Build your song line by line — sections, assignments, cues' },
              { icon: '🔔', text: 'Every change notifies the right performers instantly' },
              { icon: '✓', text: 'See exactly who confirmed and who still needs to' },
              { icon: '⚡', text: 'Stage mode for live performances — clean, distraction-free' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <span style={{ fontSize: '1rem', marginTop: '0.05rem' }}>{icon}</span>
                <span style={{ fontSize: '0.85rem', color: lavender, lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem', marginTop: '2rem' }}>
            {ROLES.map(r => (
              <div key={r.value} style={{
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: '12px',
                padding: '0.8rem 0.65rem',
              }}>
                <span style={{ fontSize: '1rem' }}>{r.emoji}</span>
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.72rem', color: '#fff', fontWeight: 700 }}>{r.label.split(' ')[0]}</p>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: '0.78rem', color: lavender }}>Free to use · No credit card needed</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[450px] rounded-3xl border p-6 shadow-sm" style={{ borderColor: border, background: 'linear-gradient(180deg, #fff 0%, #FFFCFA 100%)' }}>

          <div className="lg:hidden mb-8" style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.4rem', color: ink }}>
            Cue<span style={{ color: terracotta }}>.</span>
          </div>

          <h1 className="mb-1" style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '2rem', color: ink, letterSpacing: '-0.01em' }}>
            Create your account
          </h1>
          <p className="mb-7" style={{ fontSize: '0.9rem', color: muted }}>
            Join your group or start one as a manager.
          </p>

          {error && (
            <div className="rounded-xl px-4 py-3 mb-5 text-sm" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: muted }}>Full name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-2.5 text-sm rounded-xl transition focus:outline-none"
                style={{ border: `1.5px solid ${border}`, background: '#fff', color: ink }}
                onFocus={e => e.target.style.borderColor = terracotta}
                onBlur={e => e.target.style.borderColor = border}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: muted }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 text-sm rounded-xl transition focus:outline-none"
                style={{ border: `1.5px solid ${border}`, background: '#fff', color: ink }}
                onFocus={e => e.target.style.borderColor = terracotta}
                onBlur={e => e.target.style.borderColor = border}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: muted }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full px-4 py-2.5 text-sm rounded-xl transition focus:outline-none"
                style={{ border: `1.5px solid ${border}`, background: '#fff', color: ink }}
                onFocus={e => e.target.style.borderColor = terracotta}
                onBlur={e => e.target.style.borderColor = border}
              />
            </div>

            {/* Role picker */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: muted }}>I am a…</label>
              <div className="space-y-2">
                {ROLES.map(r => (
                  <label
                    key={r.value}
                    className="flex items-start gap-3 px-3.5 py-3 rounded-xl cursor-pointer transition"
                    style={{
                      border: `1.5px solid ${role === r.value ? terracotta : border}`,
                      background: role === r.value ? warm : '#fff',
                    }}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={role === r.value}
                      onChange={() => setRole(r.value)}
                      className="mt-0.5 accent-violet-600"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-sm"
                          style={ROLE_STYLE[r.value]}
                        >
                          {r.emoji}
                        </span>
                        <span className="text-sm font-medium" style={{ color: ink }}>{r.label}</span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: muted }}>{r.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleRegister}
              disabled={loading || !name || !email || !password}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50"
              style={{ background: rust, boxShadow: '0 8px 24px rgba(138,43,14,0.18)', marginTop: '0.5rem' }}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </div>

          <p className="text-sm text-center mt-6" style={{ color: muted }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: terracotta, fontWeight: 500, textDecoration: 'none' }}>
              Log in
            </Link>
          </p>

          <p className="text-center mt-6">
            <Link to="/" style={{ fontSize: '0.78rem', color: lavender, textDecoration: 'none' }}>
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
