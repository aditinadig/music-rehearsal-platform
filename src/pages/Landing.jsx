import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase/client'

const S = {
  // Base
  bg: '#f7f6f2',
  white: '#ffffff',
  text: '#18181b',
  muted: '#6b7280',
  faint: '#a1a1aa',
  border: '#e4e1d9',
  borderLight: '#f0ede6',

  // Accent
  violet: '#5b21b6',
  violetMid: '#7c3aed',
  violetBg: '#f5f3ff',
  violetLight: '#ede9fe',
  amber: '#b45309',
  amberBg: '#fffbeb',

  // Serif font
  serif: "'DM Serif Display', Georgia, serif",
  sans: "'DM Sans', system-ui, sans-serif",
}

function Nav({ navigate }) {
  return (
    <nav style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '1.25rem 2.5rem', position: 'sticky', top: 0,
      background: 'rgba(247,246,242,0.94)', backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${S.borderLight}`, zIndex: 100,
    }}>
      <div style={{ fontFamily: S.serif, fontSize: '1.35rem', color: S.text, letterSpacing: '-0.01em' }}>
        Cue<span style={{ color: S.violetMid }}>.</span>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <button onClick={() => navigate('/login')} style={{
          background: 'transparent', border: `1px solid ${S.border}`, color: S.muted,
          padding: '0.5rem 1.1rem', borderRadius: '8px', cursor: 'pointer',
          fontSize: '0.875rem', fontFamily: S.sans, fontWeight: 400,
          transition: 'border-color 0.15s, color 0.15s',
        }}
          onMouseEnter={e => { e.target.style.borderColor = S.violetMid; e.target.style.color = S.violetMid }}
          onMouseLeave={e => { e.target.style.borderColor = S.border; e.target.style.color = S.muted }}
        >
          Log in
        </button>
        <button onClick={() => navigate('/register')} style={{
          background: S.violetMid, border: 'none', color: '#fff',
          padding: '0.5rem 1.25rem', borderRadius: '8px', cursor: 'pointer',
          fontSize: '0.875rem', fontFamily: S.sans, fontWeight: 500,
        }}>
          Get started free
        </button>
      </div>
    </nav>
  )
}

function MockupCard() {
  return (
    <div style={{
      background: S.white, border: `1px solid ${S.border}`, borderRadius: '16px',
      padding: '1.25rem', fontFamily: S.sans, width: '100%', maxWidth: '380px',
      boxShadow: '0 4px 24px rgba(91,33,182,0.07)',
    }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.6rem', color: S.violetMid, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Chorus</span>
        </div>
        <span style={{ fontSize: '0.65rem', color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.15rem 0.5rem', borderRadius: '99px', fontWeight: 500 }}>4/5 confirmed</span>
      </div>

      {/* Lines */}
      {[
        { name: 'Maya S.', role: 'Singer', line: '"I can feel it coming in the air"', assigned: true },
        { name: 'Rohan M.', role: 'Musician', line: 'Am → F → C → G', assigned: false, notation: true },
      ].map((p, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
          padding: '0.6rem 0.75rem', borderRadius: '10px', marginBottom: '0.4rem',
          background: p.assigned ? '#f0f4ff' : '#fafafa',
          border: `1px solid ${p.assigned ? '#c7d7fd' : S.borderLight}`,
        }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
            background: p.assigned ? S.violetLight : S.borderLight,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.65rem', fontWeight: 600, color: p.assigned ? S.violetMid : S.faint,
          }}>
            {p.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 500, color: S.text }}>{p.name}</span>
              <span style={{
                fontSize: '0.6rem', padding: '0.1rem 0.4rem', borderRadius: '99px', fontWeight: 500,
                background: p.role === 'Singer' ? '#fce7f3' : '#dbeafe',
                color: p.role === 'Singer' ? '#be185d' : '#1d4ed8',
              }}>{p.role}</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: p.notation ? S.amber : S.muted, fontFamily: p.notation ? 'monospace' : S.sans, margin: 0 }}>
              {p.line}
            </p>
          </div>
        </div>
      ))}

      {/* Cue */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px',
        padding: '0.45rem 0.75rem', marginBottom: '0.75rem',
      }}>
        <span style={{ fontSize: '0.75rem' }}>⚡</span>
        <span style={{ fontSize: '0.72rem', color: '#92400e', fontWeight: 500 }}>Entry cue: after bar 8, second guitar hit</span>
      </div>

      {/* Update notification */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
        background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px',
        padding: '0.5rem 0.75rem',
      }}>
        <span style={{ fontSize: '0.7rem', marginTop: '1px' }}>🔔</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.7rem', color: '#991b1b', fontWeight: 500, margin: '0 0 0.1rem' }}>Lyric updated</p>
          <p style={{ fontSize: '0.68rem', color: '#b91c1c', margin: 0 }}>"coming in" → "calling out"</p>
        </div>
        <button style={{
          background: 'white', border: '1px solid #fca5a5', borderRadius: '6px',
          padding: '0.2rem 0.5rem', fontSize: '0.65rem', color: '#dc2626',
          cursor: 'pointer', fontFamily: S.sans, fontWeight: 500, flexShrink: 0,
        }}>
          Confirm
        </button>
      </div>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/app')
    })
  }, [])

  return (
    <div style={{ fontFamily: S.sans, background: S.bg, color: S.text, minHeight: '100vh' }}>
      <Nav navigate={navigate} />

      {/* ── Hero ── */}
      <section style={{ padding: '5rem 2.5rem 4rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: S.violetBg, border: `1px solid ${S.violetLight}`,
              borderRadius: '99px', padding: '0.3rem 0.9rem', marginBottom: '1.75rem',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: S.violetMid, display: 'inline-block' }} />
              <span style={{ fontSize: '0.75rem', color: S.violetMid, fontWeight: 500, letterSpacing: '0.04em' }}>
                Real-time rehearsal coordination
              </span>
            </div>

            <h1 style={{
              fontFamily: S.serif, fontSize: 'clamp(2.6rem, 4.5vw, 4rem)',
              lineHeight: 1.1, color: S.text, marginBottom: '1.25rem', letterSpacing: '-0.02em',
            }}>
              Every performer,<br />
              <em style={{ fontStyle: 'italic', color: S.violetMid }}>on the same page.</em>
            </h1>

            <p style={{
              fontSize: '1.05rem', color: S.muted, lineHeight: 1.75,
              maxWidth: '460px', marginBottom: '2.25rem', fontWeight: 300,
            }}>
              Cue coordinates your ensemble in real time — line assignments, entry cues, lyric changes, and confirmations. All in one place, always up to date.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/register')} style={{
                background: S.violetMid, border: 'none', color: '#fff',
                padding: '0.85rem 1.75rem', borderRadius: '10px', cursor: 'pointer',
                fontSize: '0.9rem', fontFamily: S.sans, fontWeight: 500, letterSpacing: '0.01em',
                boxShadow: '0 4px 14px rgba(124,58,237,0.3)',
              }}>
                Create your group →
              </button>
              <button onClick={() => navigate('/login')} style={{
                background: S.white, border: `1px solid ${S.border}`, color: S.muted,
                padding: '0.85rem 1.75rem', borderRadius: '10px', cursor: 'pointer',
                fontSize: '0.9rem', fontFamily: S.sans, fontWeight: 400,
              }}>
                Log in
              </button>
            </div>

            <p style={{ marginTop: '1.25rem', fontSize: '0.78rem', color: S.faint }}>
              Free to use · No credit card required
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <MockupCard />
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section style={{
        borderTop: `1px solid ${S.borderLight}`, borderBottom: `1px solid ${S.borderLight}`,
        background: S.white, padding: '2.25rem 2.5rem',
      }}>
        <div style={{
          maxWidth: '900px', margin: '0 auto', display: 'flex',
          justifyContent: 'space-around', flexWrap: 'wrap', gap: '1.5rem',
        }}>
          {[
            { num: '3', label: 'Performer roles' },
            { num: 'Live', label: 'Change notifications' },
            { num: 'Line', label: 'Level precision' },
            { num: '100%', label: 'Confirmation tracking' },
          ].map(({ num, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: S.serif, fontSize: '2.25rem', color: S.violetMid, lineHeight: 1 }}>{num}</div>
              <div style={{ fontSize: '0.72rem', color: S.faint, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '0.4rem' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Problem ── */}
      <section style={{ padding: '5.5rem 2.5rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5rem', alignItems: 'start' }}>
          <div>
            <p style={{ fontSize: '0.72rem', letterSpacing: '0.15em', color: S.faint, textTransform: 'uppercase', marginBottom: '1rem' }}>Why Cue</p>
            <h2 style={{
              fontFamily: S.serif, fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
              color: S.text, lineHeight: 1.2, marginBottom: '1.25rem',
            }}>
              Rehearsals shouldn't<br />run on WhatsApp.
            </h2>
            <p style={{ fontSize: '0.95rem', color: S.muted, lineHeight: 1.8, fontWeight: 300, maxWidth: '380px' }}>
              Every group has the same story: someone missed the message, someone's on the wrong version, and rehearsal starts 20 minutes late sorting it out. Cue ends that.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { icon: '📲', text: 'Singers miss assignment changes buried in group chats' },
              { icon: '🎸', text: "Musicians can't find their cues until they're already playing" },
              { icon: '❓', text: 'Managers have no idea who actually saw the update' },
              { icon: '⏱', text: 'Up to 40 minutes per rehearsal wasted on clarifications' },
            ].map(({ icon, text }, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.9rem',
                padding: '1rem 1.1rem', background: S.white,
                border: `1px solid ${S.borderLight}`, borderRadius: '12px',
              }}>
                <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: '0.05rem' }}>{icon}</span>
                <p style={{ fontSize: '0.875rem', color: S.muted, lineHeight: 1.6, margin: 0, fontWeight: 300 }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{
        padding: '5.5rem 2.5rem',
        background: S.white,
        borderTop: `1px solid ${S.borderLight}`,
        borderBottom: `1px solid ${S.borderLight}`,
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <p style={{ fontSize: '0.72rem', letterSpacing: '0.15em', color: S.faint, textTransform: 'uppercase', marginBottom: '0.75rem' }}>How it works</p>
            <h2 style={{ fontFamily: S.serif, fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', color: S.text, lineHeight: 1.2 }}>
              Up and running in five minutes.
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0' }}>
            {[
              {
                step: '01',
                title: 'Build your song',
                desc: 'Add songs, paste lyrics section by section, and set notation for each line. Assign each line to the right singer or musician.',
                color: S.violetBg,
                accent: S.violetMid,
              },
              {
                step: '02',
                title: 'Performers see their part',
                desc: 'Everyone sees exactly their assigned lines, entry cues, and chord charts — highlighted and in order. No confusion about who sings what.',
                color: '#fef9ec',
                accent: S.amber,
              },
              {
                step: '03',
                title: 'Changes confirm instantly',
                desc: 'When you update a lyric or reassign a line, every affected performer gets notified. You see who confirmed and who hasn\'t.',
                color: '#f0fdf4',
                accent: '#16a34a',
              },
            ].map(({ step, title, desc, color, accent }, i) => (
              <div key={step} style={{
                padding: '2.5rem 2rem',
                borderRight: i < 2 ? `1px solid ${S.borderLight}` : 'none',
                background: i === 0 ? S.bg : S.white,
              }}>
                <div style={{
                  fontFamily: S.serif, fontSize: '3.5rem', color: accent,
                  opacity: 0.2, lineHeight: 1, marginBottom: '1.25rem',
                }}>{step}</div>
                <h3 style={{ fontFamily: S.serif, fontSize: '1.25rem', color: S.text, marginBottom: '0.75rem', lineHeight: 1.3 }}>{title}</h3>
                <p style={{ fontSize: '0.875rem', color: S.muted, lineHeight: 1.75, fontWeight: 300, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roles ── */}
      <section style={{ padding: '5.5rem 2.5rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ marginBottom: '3rem' }}>
          <p style={{ fontSize: '0.72rem', letterSpacing: '0.15em', color: S.faint, textTransform: 'uppercase', marginBottom: '0.75rem' }}>Built for the whole group</p>
          <h2 style={{ fontFamily: S.serif, fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', color: S.text, lineHeight: 1.2 }}>
            Everyone gets exactly<br />what they need.
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
          {[
            {
              role: 'Manager',
              emoji: '🎼',
              tagline: 'Lead with total clarity',
              features: [
                'Build songs line by line with sections',
                'Assign each line to a specific performer',
                'Set entry cues for musicians',
                'Push changes and track who confirmed',
                'See a live confirmation dashboard',
              ],
              accent: S.violetMid,
              accentBg: S.violetLight,
            },
            {
              role: 'Singer',
              emoji: '🎤',
              tagline: 'Know your part perfectly',
              features: [
                'See your assigned lines highlighted',
                'Get instant alerts on lyric changes',
                'One-tap confirmation for updates',
                'Stage mode hides unassigned lines',
                'Persistent dark display for the stage',
              ],
              accent: '#be185d',
              accentBg: '#fce7f3',
            },
            {
              role: 'Musician',
              emoji: '🎸',
              tagline: 'Hit every cue, every time',
              features: [
                'Chord charts above every lyric word',
                'Entry cues highlighted before each line',
                'Real-time updates on notation changes',
                'Stage mode collapses irrelevant sections',
                'Font size + dark mode for live use',
              ],
              accent: '#1d4ed8',
              accentBg: '#dbeafe',
            },
          ].map(({ role, emoji, tagline, features, accent, accentBg }) => (
            <div key={role} style={{
              background: S.white, border: `1px solid ${S.borderLight}`,
              borderRadius: '16px', padding: '2rem',
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: accentBg, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '1.25rem', marginBottom: '1.25rem',
              }}>
                {emoji}
              </div>
              <div style={{ fontSize: '0.7rem', color: accent, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>{role}</div>
              <h3 style={{ fontFamily: S.serif, fontSize: '1.3rem', color: S.text, marginBottom: '1.25rem', lineHeight: 1.3 }}>{tagline}</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {features.map((f, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.845rem', color: S.muted, lineHeight: 1.5 }}>
                    <span style={{ color: accent, fontWeight: 700, marginTop: '0.1rem', flexShrink: 0 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{
        padding: '5.5rem 2.5rem',
        background: S.white,
        borderTop: `1px solid ${S.borderLight}`,
        borderBottom: `1px solid ${S.borderLight}`,
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
          {[
            { icon: '⚡', title: 'Stage Mode', desc: 'Hides unassigned lines and collapses irrelevant sections so performers see only what matters during a live performance.' },
            { icon: '🔔', title: 'Real-time updates', desc: 'Supabase Realtime pushes every change instantly. No refreshing, no polling, no wondering if they got the message.' },
            { icon: '✓', title: 'Confirmation tracking', desc: 'Every change creates an acknowledgment. You see exactly who confirmed and who still has a pending update.' },
            { icon: '🎵', title: 'Word-level notation', desc: 'Assign chord names, dynamics, or breath marks to individual words. Musicians see them inline above the lyric.' },
            { icon: '🌙', title: 'Dark display', desc: 'One tap switches to a dark, high-contrast view — designed for low-light stage environments and phones on a music stand.' },
            { icon: '📱', title: 'Mobile first', desc: 'Designed for use on a phone during rehearsal. Large touch targets, sticky controls, and sensible font sizing throughout.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ padding: '1.5rem 0' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>{icon}</div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: S.text, marginBottom: '0.5rem' }}>{title}</h3>
              <p style={{ fontSize: '0.845rem', color: S.muted, lineHeight: 1.7, margin: 0, fontWeight: 300 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '7rem 2.5rem', maxWidth: '680px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{
          fontFamily: S.serif,
          fontSize: 'clamp(2rem, 4vw, 3rem)',
          color: S.text, lineHeight: 1.15, marginBottom: '1.25rem',
        }}>
          Your best rehearsal<br />
          <em style={{ fontStyle: 'italic', color: S.violetMid }}>starts here.</em>
        </h2>
        <p style={{ fontSize: '1rem', color: S.muted, marginBottom: '2.25rem', fontWeight: 300, lineHeight: 1.7 }}>
          Free to use. No setup fees. Create a group, add your performers, and build your first song in under five minutes.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/register')} style={{
            background: S.violetMid, border: 'none', color: '#fff',
            padding: '0.9rem 2rem', borderRadius: '10px', cursor: 'pointer',
            fontSize: '0.95rem', fontFamily: S.sans, fontWeight: 500,
            boxShadow: '0 4px 14px rgba(124,58,237,0.3)',
          }}>
            Create your group
          </button>
          <button onClick={() => navigate('/login')} style={{
            background: S.white, border: `1px solid ${S.border}`, color: S.muted,
            padding: '0.9rem 2rem', borderRadius: '10px', cursor: 'pointer',
            fontSize: '0.95rem', fontFamily: S.sans,
          }}>
            Log in
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        padding: '1.75rem 2.5rem',
        borderTop: `1px solid ${S.borderLight}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '1rem',
      }}>
        <div style={{ fontFamily: S.serif, fontSize: '1.1rem', color: S.muted }}>
          Cue<span style={{ color: S.violetMid }}>.</span>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', fontSize: '0.8rem', color: S.faint, cursor: 'pointer', fontFamily: S.sans }}>Log in</button>
          <button onClick={() => navigate('/register')} style={{ background: 'none', border: 'none', fontSize: '0.8rem', color: S.faint, cursor: 'pointer', fontFamily: S.sans }}>Sign up</button>
          <span style={{ fontSize: '0.78rem', color: S.faint }}>Built for musicians · 2025</span>
        </div>
      </footer>
    </div>
  )
}
