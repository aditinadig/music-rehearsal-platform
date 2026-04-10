import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabase/client'

const ROLES = [
  { value: 'singer', label: 'Singer', desc: 'I sing assigned lines and need to track lyric updates.', emoji: '🎤' },
  { value: 'musician', label: 'Musician', desc: 'I play an instrument and follow chord charts and cues.', emoji: '🎸' },
  { value: 'manager', label: 'Manager / Director', desc: 'I build songs, assign parts, and coordinate the group.', emoji: '🎼' },
]

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
    <div className="min-h-screen flex" style={{ background: '#f7f6f2', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 w-[44%] shrink-0" style={{ background: '#18181b', color: '#f7f6f2' }}>
        <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.5rem', color: '#f7f6f2' }}>
          Cue<span style={{ color: '#7c3aed' }}>.</span>
        </div>

        <div>
          <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '2rem', color: '#f7f6f2', lineHeight: 1.3, marginBottom: '1.5rem' }}>
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
                <span style={{ fontSize: '0.85rem', color: '#a1a1aa', lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: '0.78rem', color: '#52525b' }}>Free to use · No credit card needed</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px]">

          <div className="lg:hidden mb-8" style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.4rem', color: '#18181b' }}>
            Cue<span style={{ color: '#7c3aed' }}>.</span>
          </div>

          <h1 className="mb-1" style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '2rem', color: '#18181b', letterSpacing: '-0.01em' }}>
            Create your account
          </h1>
          <p className="mb-7" style={{ fontSize: '0.9rem', color: '#6b7280' }}>
            Join your group or start one as a manager.
          </p>

          {error && (
            <div className="rounded-xl px-4 py-3 mb-5 text-sm" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Full name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-2.5 text-sm rounded-xl transition focus:outline-none"
                style={{ border: '1.5px solid #e4e1d9', background: '#fff', color: '#18181b' }}
                onFocus={e => e.target.style.borderColor = '#7c3aed'}
                onBlur={e => e.target.style.borderColor = '#e4e1d9'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
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
                placeholder="Min 6 characters"
                className="w-full px-4 py-2.5 text-sm rounded-xl transition focus:outline-none"
                style={{ border: '1.5px solid #e4e1d9', background: '#fff', color: '#18181b' }}
                onFocus={e => e.target.style.borderColor = '#7c3aed'}
                onBlur={e => e.target.style.borderColor = '#e4e1d9'}
              />
            </div>

            {/* Role picker */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>I am a…</label>
              <div className="space-y-2">
                {ROLES.map(r => (
                  <label
                    key={r.value}
                    className="flex items-start gap-3 px-3.5 py-3 rounded-xl cursor-pointer transition"
                    style={{
                      border: `1.5px solid ${role === r.value ? '#7c3aed' : '#e4e1d9'}`,
                      background: role === r.value ? '#f5f3ff' : '#fff',
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
                        <span>{r.emoji}</span>
                        <span className="text-sm font-medium" style={{ color: '#18181b' }}>{r.label}</span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{r.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleRegister}
              disabled={loading || !name || !email || !password}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50"
              style={{ background: '#7c3aed', boxShadow: '0 2px 10px rgba(124,58,237,0.25)', marginTop: '0.5rem' }}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </div>

          <p className="text-sm text-center mt-6" style={{ color: '#6b7280' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#7c3aed', fontWeight: 500, textDecoration: 'none' }}>
              Log in
            </Link>
          </p>

          <p className="text-center mt-6">
            <Link to="/" style={{ fontSize: '0.78rem', color: '#a1a1aa', textDecoration: 'none' }}>
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
