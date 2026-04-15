/* eslint-disable no-unused-vars */
import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase/client'
import heroImage from '../assets/hero.png'

/* ── palette ── */
const gold   = '#E35336'
const amber  = '#FFD3AC'
const olive  = '#9988A1'
const cream  = '#fff'
const ink    = '#12100A'
const muted  = '#5F5550'
const faint  = '#9988A1'
const border = '#F0D7C8'

const serif = "'DM Serif Display', Georgia, serif"
const sans  = "'DM Sans', system-ui, sans-serif"

/* ── global keyframes injected once ── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { background: #fff; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(-1deg); }
    50%       { transform: translateY(-12px) rotate(1deg); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.5; transform: scale(0.8); }
  }
  @keyframes ticker {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes spin-slow {
    from { transform: translate(-50%,-50%) rotate(0deg); }
    to   { transform: translate(-50%,-50%) rotate(360deg); }
  }
  @keyframes spin-slow-r {
    from { transform: translate(-50%,-50%) rotate(0deg); }
    to   { transform: translate(-50%,-50%) rotate(-360deg); }
  }
  @keyframes notification-pop {
    0%   { opacity: 0; transform: translateY(-8px) scale(0.95); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes slide-right {
    from { opacity: 0; transform: translateX(40px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  .reveal { opacity: 0; transform: translateY(36px); transition: opacity 0.7s cubic-bezier(.22,1,.36,1), transform 0.7s cubic-bezier(.22,1,.36,1); }
  .reveal.visible { opacity: 1; transform: translateY(0); }

  .card-hover { transition: transform 0.22s ease, box-shadow 0.22s ease; cursor: default; }
  .card-hover:hover { transform: translateY(-5px); box-shadow: 0 20px 50px rgba(0,0,0,0.1); }

  .btn-primary {
    background: ${ink}; color: #fff; border: none;
    padding: 0.85rem 1.85rem; border-radius: 10px; cursor: pointer;
    font-family: ${sans}; font-size: 0.9rem; font-weight: 500; letter-spacing: 0.01em;
    transition: background 0.18s, transform 0.15s, box-shadow 0.18s;
    display: inline-flex; align-items: center; gap: 0.45rem;
  }
  .btn-primary:hover { background: #2a2415; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(18,16,10,0.25); }

  .btn-ghost {
    background: transparent; color: ${muted}; border: 1.5px solid ${border};
    padding: 0.85rem 1.85rem; border-radius: 10px; cursor: pointer;
    font-family: ${sans}; font-size: 0.9rem; font-weight: 400;
    transition: border-color 0.18s, color 0.18s, transform 0.15s;
  }
  .btn-ghost:hover { border-color: ${gold}; color: ${ink}; transform: translateY(-2px); }

  .tab-btn {
    padding: 0.5rem 1.1rem; border-radius: 8px; border: none; cursor: pointer;
    font-family: ${sans}; font-size: 0.82rem; font-weight: 500;
    transition: all 0.2s;
  }

  .ticker-wrap { overflow: hidden; }
  .ticker-inner { display: flex; width: max-content; animation: ticker 24s linear infinite; }
  .ticker-inner:hover { animation-play-state: paused; }

  .problem-card {
    padding: 1.5rem; background: #fff;
    border: 1px solid ${border}; border-radius: 16px;
    transition: transform 0.22s, box-shadow 0.22s, border-color 0.22s;
    cursor: default;
  }
  .problem-card:hover { transform: translateY(-5px); box-shadow: 0 16px 40px rgba(0,0,0,0.09); border-color: ${gold}; }

  .feature-card {
    padding: 1.5rem; background: #fff;
    border: 1px solid ${border}; border-radius: 14px;
    transition: transform 0.22s, box-shadow 0.22s;
    cursor: default;
  }
  .feature-card:hover { transform: translateY(-4px); box-shadow: 0 14px 36px rgba(0,0,0,0.08); }

  .section-frame {
    position: relative;
    overflow: hidden;
  }
  .section-frame::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      linear-gradient(90deg, rgba(227,83,54,0.055) 1px, transparent 1px),
      linear-gradient(0deg, rgba(153,136,161,0.055) 1px, transparent 1px);
    background-size: 64px 64px;
    mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
  }
  .section-inner {
    position: relative;
    max-width: 1120px;
    margin: 0 auto;
  }
  .accent-rail {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    height: 6px;
    background: linear-gradient(90deg, ${gold}, ${amber}, ${olive}, ${gold});
  }
  .score-line {
    height: 1px;
    background: ${border};
  }
  @media (max-width: 900px) {
    .hero-grid,
    .rehearsal-map,
    .instruction-grid {
      grid-template-columns: 1fr !important;
    }
    .problem-grid,
    .steps-grid,
    .feature-grid,
    .conversion-strip {
      grid-template-columns: 1fr 1fr !important;
    }
    .sticky-copy {
      position: relative !important;
      top: auto !important;
    }
  }
  @media (max-width: 620px) {
    .problem-grid,
    .steps-grid,
    .feature-grid,
    .conversion-strip {
      grid-template-columns: 1fr !important;
    }
    .landing-nav {
      padding: 0.85rem 1rem !important;
    }
  }

  .accordion-item {
    border: 1px solid ${border}; border-radius: 12px; margin-bottom: 0.5rem;
    overflow: hidden; transition: box-shadow 0.2s;
  }
  .accordion-item.open { box-shadow: 0 4px 20px rgba(0,0,0,0.07); }

  .accordion-btn {
    width: 100%; display: flex; align-items: center; gap: 1rem;
    padding: 1rem 1.25rem; background: #fff; border: none; cursor: pointer;
    text-align: left; transition: background 0.2s;
  }
  .accordion-btn:hover { background: #FFF4EA; }
  .accordion-btn.open { background: #FFF4EA; }

  .nav-link {
    background: none; border: none; font-family: ${sans};
    font-size: 0.8rem; color: ${faint}; cursor: pointer;
    transition: color 0.15s;
  }
  .nav-link:hover { color: ${ink}; }
`

/* ── scroll reveal ── */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target) } }),
      { threshold: 0.1 }
    )
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])
}

/* ── animated mockup card ── */
function LiveMockup() {
  const [notifVisible, setNotifVisible] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [activeLine, setActiveLine] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setNotifVisible(true), 1800)
    const t2 = setInterval(() => setActiveLine(l => (l + 1) % 3), 2600)
    return () => { clearTimeout(t1); clearInterval(t2) }
  }, [])

  const lines = [
    { text: '"I can feel it in the air tonight"', singer: 'Maya S.', role: 'Singer' },
    { text: '"Hold on…"', singer: 'Priya R.', role: 'Singer' },
    { text: 'Am → F → C → G', singer: 'Rohan M.', role: 'Musician', mono: true },
  ]

  return (
    <div style={{
      background: '#fff', border: `1px solid ${border}`,
      borderRadius: '22px', padding: '1.5rem',
      fontFamily: sans, width: '340px',
      boxShadow: '0 12px 60px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
      animation: 'float 5s ease-in-out infinite',
      flexShrink: 0,
    }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.6rem', color: gold, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Chorus · The Parting Song</div>
          <div style={{ fontSize: '0.8rem', color: ink, fontWeight: 600, marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4CAF50', display: 'inline-block', animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
            Live session
          </div>
        </div>
        <div style={{ fontSize: '0.62rem', color: '#4A7A3A', background: '#EEF6E6', border: '1px solid #C2DDB0', padding: '0.2rem 0.7rem', borderRadius: '99px', fontWeight: 600 }}>
          4 / 5 confirmed
        </div>
      </div>

      <div style={{ height: '1px', background: border, marginBottom: '0.85rem' }} />

      {lines.map((l, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: '0.65rem',
          padding: '0.65rem 0.75rem', borderRadius: '10px', marginBottom: '0.4rem',
          background: activeLine === i ? '#FFF4EA' : '#FAFAF8',
          border: `1px solid ${activeLine === i ? '#FFD3AC' : border}`,
          transition: 'all 0.45s cubic-bezier(.22,1,.36,1)',
          transform: activeLine === i ? 'scale(1.015)' : 'scale(1)',
        }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
            background: activeLine === i ? '#FFD3AC' : '#F3EEF5',
            border: `1.5px solid ${activeLine === i ? gold : border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.62rem', fontWeight: 700,
            color: activeLine === i ? amber : faint,
            transition: 'all 0.45s',
          }}>
            {l.singer.split(' ').map(n => n[0]).join('')}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.15rem' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 600, color: ink }}>{l.singer}</span>
              <span style={{
                fontSize: '0.58rem', padding: '0.08rem 0.45rem', borderRadius: '99px', fontWeight: 600,
                background: l.role === 'Singer' ? '#FCE7F3' : '#DBEAFE',
                color: l.role === 'Singer' ? '#DB2777' : '#2563EB',
              }}>{l.role}</span>
            </div>
            <p style={{ fontSize: '0.73rem', color: l.mono ? olive : muted, fontFamily: l.mono ? 'monospace' : sans, margin: 0, lineHeight: 1.4 }}>{l.text}</p>
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#FFD3AC', border: `1px solid ${border}`, borderRadius: '8px', padding: '0.5rem 0.75rem', marginTop: '0.65rem', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.7rem' }}>⚡</span>
        <span style={{ fontSize: '0.69rem', color: amber, fontWeight: 500 }}>Entry cue: after bar 8, second guitar hit</span>
      </div>

      {notifVisible && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
          background: '#FFF4EA', border: `1px solid ${border}`, borderRadius: '8px',
          padding: '0.55rem 0.75rem',
          animation: 'notification-pop 0.4s cubic-bezier(.22,1,.36,1) forwards',
        }}>
          <span style={{ fontSize: '0.68rem', marginTop: '2px' }}>🔔</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.67rem', color: ink, fontWeight: 600, margin: '0 0 0.08rem' }}>Lyric updated by manager</p>
            <p style={{ fontSize: '0.64rem', color: faint, margin: 0 }}>"coming in" → "calling out"</p>
          </div>
          {!confirmed ? (
            <button onClick={() => setConfirmed(true)} style={{
              background: ink, border: 'none', borderRadius: '6px',
              padding: '0.28rem 0.65rem', fontSize: '0.62rem', color: '#fff',
              cursor: 'pointer', fontFamily: sans, fontWeight: 600, flexShrink: 0,
              transition: 'transform 0.15s',
            }}
              onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
              onMouseLeave={e => e.target.style.transform = 'scale(1)'}
            >Confirm</button>
          ) : (
            <span style={{ fontSize: '0.68rem', color: '#4CAF50', fontWeight: 700, flexShrink: 0, animation: 'fadeIn 0.3s ease' }}>✓ Done</span>
          )}
        </div>
      )}
    </div>
  )
}

/* ── nav ── */
function Nav({ navigate }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav className="landing-nav" style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '1rem 2.5rem', position: 'sticky', top: 0,
      background: scrolled ? 'rgba(255,255,255,0.95)' : 'transparent',
      backdropFilter: scrolled ? 'blur(18px)' : 'none',
      borderBottom: `1px solid ${scrolled ? border : 'transparent'}`,
      zIndex: 100, transition: 'all 0.3s ease',
    }}>
      <div style={{ fontFamily: serif, fontSize: '1.4rem', color: ink, letterSpacing: '-0.01em', cursor: 'default', userSelect: 'none' }}>
        Cue<span style={{ color: gold }}>.</span>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button className="btn-ghost" style={{ padding: '0.45rem 1rem', fontSize: '0.83rem' }} onClick={() => navigate('/login')}>Log in</button>
        <button className="btn-primary" style={{ padding: '0.5rem 1.15rem', fontSize: '0.83rem' }} onClick={() => navigate('/register')}>Get started →</button>
      </div>
    </nav>
  )
}

/* ── ticker ── */
function Ticker() {
  const items = ['Line-level assignments', 'Real-time notifications', 'Entry cues', 'Stage mode', 'Confirmation tracking', 'Chord charts', 'Dark display', 'Live sync', 'Mobile first', 'Lyric updates']
  const dots = items.map((t, i) => (
    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', padding: '0 1.35rem', whiteSpace: 'nowrap', fontSize: '0.76rem', color: muted, fontFamily: sans, fontWeight: 400 }}>
      <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: gold, display: 'inline-block', flexShrink: 0 }} />
      {t}
    </span>
  ))
  return (
    <div className="ticker-wrap" style={{ borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}`, background: '#fff', padding: '0.75rem 0' }}>
      <div className="ticker-inner">{dots}{dots}</div>
    </div>
  )
}

function RehearsalMap() {
  const lanes = [
    { role: 'Manager', label: 'Edit lyric', value: 'Verse 2 · line 04', color: '#9333EA', bg: '#F3E8FF' },
    { role: 'Singer', label: 'Confirm change', value: 'Maya + Priya', color: '#DB2777', bg: '#FCE7F3' },
    { role: 'Musician', label: 'Entry cue', value: 'after bar 8', color: '#2563EB', bg: '#DBEAFE' },
  ]

  return (
    <div className="reveal rehearsal-map" style={{
      marginTop: '3rem',
      display: 'grid',
      gridTemplateColumns: '1.2fr 0.8fr',
      gap: '1rem',
      alignItems: 'stretch',
    }}>
      <div style={{
        background: '#fff',
        border: `1px solid ${border}`,
        borderRadius: '18px',
        padding: '1.15rem',
        boxShadow: '0 18px 55px rgba(18,16,10,0.08)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <span style={{ fontSize: '0.68rem', color: olive, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700 }}>Tonight's rehearsal</span>
          <span style={{ fontSize: '0.68rem', color: '#166534', background: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: '99px', padding: '0.2rem 0.65rem', fontWeight: 700 }}>live</span>
        </div>
        <div style={{ display: 'grid', gap: '0.55rem' }}>
          {lanes.map((lane, i) => (
            <div key={lane.role} style={{
              display: 'grid',
              gridTemplateColumns: '90px 1fr auto',
              gap: '0.75rem',
              alignItems: 'center',
              padding: '0.7rem 0.85rem',
              background: lane.bg,
              border: `1px solid ${border}`,
              borderRadius: '10px',
            }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: lane.color }}>{lane.role}</span>
              <div>
                <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: ink }}>{lane.label}</p>
                <p style={{ margin: '0.1rem 0 0', fontSize: '0.72rem', color: muted }}>{lane.value}</p>
              </div>
              <span style={{
                width: '24px', height: '24px', borderRadius: '50%',
                background: '#fff', border: `1px solid ${lane.color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: lane.color, fontSize: '0.68rem', fontWeight: 800,
              }}>{i + 1}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{
        background: ink,
        color: '#fff',
        borderRadius: '18px',
        padding: '1.35rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '100%',
        boxShadow: '0 18px 55px rgba(18,16,10,0.14)',
      }}>
        <p style={{ fontSize: '0.72rem', color: amber, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700 }}>What Cue resolves</p>
        <p style={{ fontFamily: serif, fontSize: '1.55rem', lineHeight: 1.15, margin: '1rem 0', fontWeight: 400 }}>One update becomes the right instruction for every performer.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
          {['sent', 'seen', 'confirmed'].map((label, i) => (
            <span key={label} style={{
              background: i === 0 ? '#2563EB' : i === 1 ? '#D97706' : '#16A34A',
              color: '#fff',
              borderRadius: '8px',
              padding: '0.45rem 0.35rem',
              fontSize: '0.68rem',
              fontWeight: 700,
              textAlign: 'center',
            }}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── role tabs ── */
function RoleTabs() {
  const [active, setActive] = useState(0)
  const roles = [
    {
      label: 'Manager', emoji: '🎼', accent: gold, tint: '#FFF4EA',
      tagline: 'Lead with total clarity.',
      desc: 'You set everything up once. Every update you make reaches the right people instantly, and you can track who confirmed.',
      features: [
        { icon: '📋', text: 'Build songs line by line with sections' },
        { icon: '👤', text: 'Assign each line to a specific performer' },
        { icon: '⚡', text: 'Set entry cues for musicians' },
        { icon: '🔔', text: 'Push changes and track who confirmed' },
        { icon: '📊', text: 'Live confirmation dashboard' },
      ],
    },
    {
      label: 'Singer', emoji: '🎤', accent: amber, tint: '#FFD3AC',
      tagline: 'Know your part perfectly.',
      desc: 'Open the app and your part is right there — highlighted, in order, with any changes already flagged for you.',
      features: [
        { icon: '✨', text: 'See your assigned lines highlighted' },
        { icon: '🔔', text: 'Get instant alerts on lyric changes' },
        { icon: '✓', text: 'One-tap confirmation for updates' },
        { icon: '🎭', text: 'Stage mode hides unassigned lines' },
        { icon: '🌙', text: 'Dark display optimised for the stage' },
      ],
    },
    {
      label: 'Musician', emoji: '🎸', accent: olive, tint: '#F3EEF5',
      tagline: 'Hit every cue, every time.',
      desc: 'Every chord, every cue, every timing note — exactly where you need it, right when you need it.',
      features: [
        { icon: '🎵', text: 'Chord charts above every lyric word' },
        { icon: '⚡', text: 'Entry cues highlighted before each line' },
        { icon: '🔔', text: 'Real-time updates on notation changes' },
        { icon: '🎭', text: 'Stage mode collapses irrelevant sections' },
        { icon: '🌙', text: 'Font size + dark mode for live use' },
      ],
    },
  ]
  const r = roles[active]
  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.75rem' }}>
        {roles.map((role, i) => (
          <button key={i} className="tab-btn" onClick={() => setActive(i)} style={{
            background: active === i ? role.accent : '#F3EEF5',
            color: active === i ? '#fff' : muted,
            boxShadow: active === i ? `0 4px 14px ${role.accent}50` : 'none',
          }}>
            {role.emoji} {role.label}
          </button>
        ))}
      </div>
      <div style={{
        background: r.tint, border: `1px solid ${border}`, borderRadius: '18px',
        padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem',
        transition: 'background 0.3s',
      }}>
        <div>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{r.emoji}</div>
          <div style={{ fontSize: '0.65rem', color: r.accent, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>{r.label}</div>
          <h3 style={{ fontFamily: serif, fontSize: '1.6rem', color: ink, lineHeight: 1.2, fontWeight: 400, marginBottom: '0.75rem' }}>{r.tagline}</h3>
          <p style={{ fontSize: '0.85rem', color: muted, lineHeight: 1.85, fontWeight: 300 }}>{r.desc}</p>
        </div>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', justifyContent: 'center' }}>
          {r.features.map((f, i) => (
            <li key={i} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              fontSize: '0.855rem', color: muted, lineHeight: 1.5,
              padding: '0.6rem 0.85rem', borderRadius: '10px',
              background: 'rgba(255,255,255,0.75)', border: `1px solid ${border}`,
              transition: 'transform 0.15s',
              cursor: 'default',
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
            >
              <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{f.icon}</span>
              {f.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/* ── accordion instructions ── */
function Instructions() {
  const [openTab, setOpenTab] = useState('manager')
  const [openStep, setOpenStep] = useState(0)

  const data = {
    manager: {
      color: gold, label: 'Manager',
      steps: [
        { title: 'Create a group', desc: 'Sign up and create a rehearsal group. You become the manager automatically and can start inviting others right away.' },
        { title: 'Invite your performers', desc: 'Add members by email. Each person signs up and joins your group as a singer or musician.' },
        { title: 'Add songs and lines', desc: 'Create a song, then add its lyrics line by line — one per row. Mark each with a section name like Verse or Chorus.' },
        { title: 'Assign parts', desc: 'Assign each line to the performer who sings or plays it. For musicians, set chord charts and notation inline.' },
        { title: 'Set entry cues', desc: 'Write an entry cue for any line — like "after the guitar solo" or "bar 12, beat 3" — so performers know exactly when to come in.' },
        { title: 'Push changes anytime', desc: 'Edit a lyric or swap an assignment at any time. Cue notifies affected performers instantly. You see confirmations as they come in.' },
      ],
    },
    performer: {
      color: amber, label: 'Performer',
      steps: [
        { title: 'Accept your invite', desc: 'Sign up with the email your manager used to invite you and join the group.' },
        { title: 'Open your part', desc: 'Go to your assigned songs. You will see only the lines assigned to you, with any cues or chord charts your manager has added.' },
        { title: 'Confirm updates', desc: 'When the manager makes a change, you get a notification. Tap Confirm to let them know you have seen it.' },
        { title: 'Use Stage Mode', desc: 'Before going on stage, switch to Stage Mode. It hides everything except your lines and cues, and turns on a dark display.' },
      ],
    },
  }

  const t = data[openTab]

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {['manager', 'performer'].map(key => (
          <button key={key} className="tab-btn" onClick={() => { setOpenTab(key); setOpenStep(0) }} style={{
            background: openTab === key ? data[key].color : '#F3EEF5',
            color: openTab === key ? '#fff' : muted,
            boxShadow: openTab === key ? `0 4px 14px ${data[key].color}50` : 'none',
          }}>
            {data[key].label}
          </button>
        ))}
      </div>

      {t.steps.map((step, i) => (
        <div key={i} className={`accordion-item${openStep === i ? ' open' : ''}`}>
          <button className={`accordion-btn${openStep === i ? ' open' : ''}`} onClick={() => setOpenStep(openStep === i ? -1 : i)}>
            <span style={{
              width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
              background: openStep === i ? t.color : '#F3EEF5',
              color: openStep === i ? '#fff' : muted,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.72rem', fontWeight: 700, fontFamily: serif,
              transition: 'all 0.2s',
            }}>{i + 1}</span>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: ink, flex: 1, fontFamily: sans }}>{step.title}</span>
            <span style={{ color: faint, fontSize: '1.1rem', transition: 'transform 0.25s', transform: openStep === i ? 'rotate(45deg)' : 'rotate(0)', display: 'inline-block' }}>+</span>
          </button>
          {openStep === i && (
            <div style={{ padding: '0 1.25rem 1.1rem 3.5rem', background: '#fff', animation: 'fadeIn 0.2s ease' }}>
              <p style={{ fontSize: '0.855rem', color: muted, lineHeight: 1.85, fontWeight: 300 }}>{step.desc}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ── main ── */
export default function Landing() {
  const navigate = useNavigate()
  useReveal()

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = STYLES
    document.head.appendChild(style)
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) navigate('/app') })
    return () => document.head.removeChild(style)
  }, [])

  return (
    <div style={{ fontFamily: sans, background: '#fff', color: ink, minHeight: '100vh', overflowX: 'hidden' }}>
      <Nav navigate={navigate} />

      {/* ── HERO ── */}
      <section className="section-frame" style={{
        padding: '5.5rem 2.5rem 4.5rem',
        borderBottom: `1px solid ${border}`,
        backgroundImage: `linear-gradient(90deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.94) 45%, rgba(255,244,234,0.82) 100%), url(${heroImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}>
        <div className="accent-rail" />
        <div className="section-inner hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4rem', alignItems: 'center' }}>
          <div style={{ animation: 'fadeUp 0.7s cubic-bezier(.22,1,.36,1) both' }}>
            {/* badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: '#FFF4EA', border: `1px solid #FFD3AC`,
              borderRadius: '99px', padding: '0.32rem 0.9rem', marginBottom: '2rem',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: gold, animation: 'pulse-dot 1.5s ease-in-out infinite', display: 'inline-block' }} />
              <span style={{ fontSize: '0.72rem', color: muted, fontWeight: 500, letterSpacing: '0.06em' }}>Real-time rehearsal coordination</span>
            </div>

            <h1 style={{
              fontFamily: serif,
              fontSize: 'clamp(2.8rem, 5vw, 4.8rem)',
              lineHeight: 1.05, color: ink,
              marginBottom: '1.35rem', letterSpacing: '-0.03em', fontWeight: 400,
            }}>
              Every performer,<br />
              <em style={{
                fontStyle: 'italic', color: 'transparent',
                background: `linear-gradient(90deg, ${gold}, ${amber}, ${gold})`,
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text', backgroundClip: 'text',
                animation: 'shimmer 3s linear infinite',
              }}>on the same page.</em>
            </h1>

            <p style={{ fontSize: '1.05rem', color: muted, lineHeight: 1.85, maxWidth: '420px', marginBottom: '2.25rem', fontWeight: 300 }}>
              Cue keeps your ensemble perfectly in sync — line assignments, entry cues, lyric changes, and confirmations. All in one place.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="btn-primary" onClick={() => navigate('/register')}>Create your group →</button>
              <button className="btn-ghost" onClick={() => navigate('/login')}>Log in</button>
            </div>
            <p style={{ marginTop: '1.1rem', fontSize: '0.74rem', color: faint, letterSpacing: '0.03em' }}>Free to use · No credit card needed</p>

            {/* stat pills */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '2rem', flexWrap: 'wrap' }}>
              {[
                { label: '3 performer roles', dot: gold },
                { label: 'Live sync', dot: amber },
                { label: 'Line precision', dot: olive },
                { label: '100% tracked', dot: gold },
              ].map(({ label, dot }) => (
                <span key={label} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.3rem 0.8rem', borderRadius: '99px',
                  background: '#F3EEF5', border: `1px solid ${border}`,
                  fontSize: '0.72rem', color: muted, fontFamily: sans, fontWeight: 400,
                }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: dot, flexShrink: 0 }} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div style={{ animation: 'slide-right 0.8s cubic-bezier(.22,1,.36,1) 0.2s both' }}>
            <LiveMockup />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <RehearsalMap />
          </div>
        </div>
      </section>

      <Ticker />

      {/* ── WHY ── */}
      <section className="section-frame" style={{ padding: '5rem 2.5rem', background: '#fff', borderBottom: `1px solid ${border}` }}>
        <div className="section-inner">
          <div className="reveal" style={{ marginBottom: '2.5rem' }}>
            <p style={{ fontSize: '0.68rem', letterSpacing: '0.18em', color: olive, textTransform: 'uppercase', marginBottom: '0.65rem', fontWeight: 600 }}>The problem</p>
            <h2 style={{ fontFamily: serif, fontSize: 'clamp(2rem, 3vw, 2.8rem)', color: ink, lineHeight: 1.12, fontWeight: 400 }}>
              Rehearsals shouldn't<br />run on WhatsApp.
            </h2>
          </div>
          <div className="problem-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            {[
              { icon: '📲', head: 'Messages get missed', text: 'Assignment changes buried in group chats — and someone always misses them.' },
              { icon: '🎸', head: 'Cues are unclear', text: "Musicians can't find their entry cues until they're already playing." },
              { icon: '❓', head: 'No confirmation', text: 'Managers have no way to know who actually saw the latest update.' },
              { icon: '⏱', head: '40 min wasted', text: 'Every rehearsal loses time to clarifications that should never happen.' },
            ].map(({ icon, head, text }, i) => (
              <div key={i} className="reveal problem-card">
                <div style={{ fontSize: '1.75rem', marginBottom: '0.85rem' }}>{icon}</div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: ink, marginBottom: '0.45rem' }}>{head}</h4>
                <p style={{ fontSize: '0.83rem', color: muted, lineHeight: 1.75, fontWeight: 300 }}>{text}</p>
              </div>
            ))}
          </div>
          <div className="reveal conversion-strip" style={{
            marginTop: '1.25rem',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            border: `1px solid ${border}`,
            borderRadius: '18px',
            overflow: 'hidden',
            background: '#fff',
            boxShadow: '0 16px 45px rgba(18,16,10,0.06)',
          }}>
            {[
              ['Before Cue', 'who changed what?', '#FFF4EA'],
              ['During Cue', 'assigned, notified, confirmed', '#FFD3AC'],
              ['After Cue', 'ready before downbeat', '#F3EEF5'],
            ].map(([title, text, bg]) => (
              <div key={title} style={{ padding: '1.35rem', background: bg, borderRight: title === 'After Cue' ? 'none' : `1px solid ${border}` }}>
                <p style={{ margin: 0, fontSize: '0.68rem', color: olive, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700 }}>{title}</p>
                <p style={{ margin: '0.45rem 0 0', fontFamily: serif, fontSize: '1.2rem', color: ink, lineHeight: 1.2 }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW ── */}
      <section className="section-frame" style={{ padding: '5rem 2.5rem', borderBottom: `1px solid ${border}`, background: 'linear-gradient(180deg, #fff 0%, #FFF4EA 100%)' }}>
        <div className="section-inner">
          <div className="reveal" style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <p style={{ fontSize: '0.68rem', letterSpacing: '0.18em', color: olive, textTransform: 'uppercase', marginBottom: '0.65rem', fontWeight: 600 }}>How it works</p>
            <h2 style={{ fontFamily: serif, fontSize: 'clamp(2rem, 3vw, 2.6rem)', color: ink, lineHeight: 1.12, fontWeight: 400 }}>Up and running in five minutes.</h2>
          </div>
          <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
            {[
              { step: '01', title: 'Build your song', desc: 'Add songs and paste lyrics line by line. Assign each line to the right singer or musician, and set notation where needed.', accent: gold, tint: '#FFF4EA' },
              { step: '02', title: 'Performers see their part', desc: 'Everyone sees exactly their assigned lines, entry cues, and chord charts — highlighted and in order. No confusion about who sings what.', accent: amber, tint: '#FFD3AC' },
              { step: '03', title: 'Changes confirm instantly', desc: "Update a lyric or reassign a line, and every affected performer gets notified right away. You see exactly who confirmed.", accent: olive, tint: '#F3EEF5' },
            ].map(({ step, title, desc, accent, tint }, i) => (
              <div key={step} className="reveal card-hover" style={{ padding: '2rem', background: tint, border: `1px solid ${border}`, borderRadius: '18px' }}>
                <div style={{ fontFamily: serif, fontSize: '3rem', color: accent, opacity: 0.2, lineHeight: 1, marginBottom: '1.35rem' }}>{step}</div>
                <h3 style={{ fontFamily: serif, fontSize: '1.2rem', color: ink, marginBottom: '0.65rem', lineHeight: 1.3, fontWeight: 400 }}>{title}</h3>
                <p style={{ fontSize: '0.855rem', color: muted, lineHeight: 1.85, fontWeight: 300 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLES ── */}
      <section className="section-frame" style={{ padding: '5rem 2.5rem', background: '#fff', borderBottom: `1px solid ${border}` }}>
        <div className="section-inner">
          <div className="reveal" style={{ marginBottom: '2.5rem' }}>
            <p style={{ fontSize: '0.68rem', letterSpacing: '0.18em', color: olive, textTransform: 'uppercase', marginBottom: '0.65rem', fontWeight: 600 }}>Built for everyone</p>
            <h2 style={{ fontFamily: serif, fontSize: 'clamp(2rem, 3vw, 2.6rem)', color: ink, lineHeight: 1.12, fontWeight: 400 }}>
              Everyone gets exactly<br />what they need.
            </h2>
          </div>
          <div className="reveal"><RoleTabs /></div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="section-frame" style={{ padding: '5rem 2.5rem', borderBottom: `1px solid ${border}`, background: 'linear-gradient(180deg, #fff 0%, #F3EEF5 100%)' }}>
        <div className="section-inner">
          <div className="reveal" style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <p style={{ fontSize: '0.68rem', letterSpacing: '0.18em', color: olive, textTransform: 'uppercase', marginBottom: '0.65rem', fontWeight: 600 }}>Features</p>
            <h2 style={{ fontFamily: serif, fontSize: 'clamp(2rem, 3vw, 2.6rem)', color: ink, lineHeight: 1.12, fontWeight: 400 }}>Designed for the stage.</h2>
          </div>
          <div className="feature-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {[
              { icon: '⚡', title: 'Stage Mode', desc: 'Hides unassigned lines and collapses irrelevant sections so performers see only what matters live.', accent: amber },
              { icon: '🔔', title: 'Real-time updates', desc: 'Every change is pushed instantly. No refreshing. No polling. No wondering if they got the message.', accent: gold },
              { icon: '✓', title: 'Confirmation tracking', desc: 'Every change creates an acknowledgment. See exactly who confirmed and who has a pending update.', accent: olive },
              { icon: '🎵', title: 'Word-level notation', desc: 'Assign chords, dynamics, or breath marks to individual words. Musicians see them inline above the lyric.', accent: amber },
              { icon: '🌙', title: 'Dark display', desc: 'One tap switches to a high-contrast dark view — built for low-light stage environments.', accent: gold },
              { icon: '📱', title: 'Mobile first', desc: 'Built for use on a phone during rehearsal. Large touch targets and sensible font sizing throughout.', accent: olive },
            ].map(({ icon, title, desc, accent }) => (
              <div key={title} className="reveal feature-card" style={{ borderTop: `4px solid ${accent}` }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: accent === gold ? '#FFF4EA' : accent === amber ? '#FFD3AC' : '#F3EEF5',
                  border: `1px solid ${border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.05rem', marginBottom: '1rem',
                }}>{icon}</div>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 600, color: ink, marginBottom: '0.45rem' }}>{title}</h3>
                <p style={{ fontSize: '0.845rem', color: muted, lineHeight: 1.8, fontWeight: 300 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INSTRUCTIONS ── */}
      <section className="section-frame" style={{ padding: '5rem 2.5rem', background: '#fff', borderBottom: `1px solid ${border}` }}>
        <div className="section-inner instruction-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '5rem', alignItems: 'start' }}>
          <div className="reveal sticky-copy" style={{ position: 'sticky', top: '5.5rem' }}>
            <p style={{ fontSize: '0.68rem', letterSpacing: '0.18em', color: olive, textTransform: 'uppercase', marginBottom: '0.75rem', fontWeight: 600 }}>Using Cue</p>
            <h2 style={{ fontFamily: serif, fontSize: 'clamp(1.9rem, 3vw, 2.5rem)', color: ink, lineHeight: 1.12, fontWeight: 400, marginBottom: '1rem' }}>
              Simple for managers.<br />
              <em style={{ color: gold, fontStyle: 'italic' }}>Effortless for performers.</em>
            </h2>
            <p style={{ fontSize: '0.9rem', color: muted, lineHeight: 1.85, fontWeight: 300 }}>
              A manager sets everything up. Performers just open the app and see exactly what they need — nothing more, nothing less.
            </p>
          </div>
          <div className="reveal"><Instructions /></div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section-frame" style={{ padding: '7rem 2.5rem', background: 'linear-gradient(180deg, #FFF4EA 0%, #fff 78%)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: '500px', height: '500px', borderRadius: '50%', border: `1px solid rgba(227,83,54,0.12)`, animation: 'spin-slow 22s linear infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: '750px', height: '750px', borderRadius: '50%', border: `1px solid rgba(153,136,161,0.12)`, animation: 'spin-slow-r 32s linear infinite', pointerEvents: 'none' }} />

        <div style={{ maxWidth: '540px', margin: '0 auto', position: 'relative' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            border: `1px solid rgba(227,83,54,0.3)`,
            borderRadius: '99px', padding: '0.3rem 0.9rem', marginBottom: '2rem',
          }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: gold, animation: 'pulse-dot 1.5s ease-in-out infinite', display: 'inline-block' }} />
            <span style={{ fontSize: '0.72rem', color: gold, fontWeight: 500, letterSpacing: '0.06em' }}>Free to use</span>
          </div>

          <h2 style={{
            fontFamily: serif, fontSize: 'clamp(2.4rem, 5vw, 3.6rem)',
            color: ink, lineHeight: 1.08, marginBottom: '1.25rem',
            letterSpacing: '-0.025em', fontWeight: 400,
          }}>
            Your best rehearsal<br />
            <em style={{
              fontStyle: 'italic', color: 'transparent',
              background: `linear-gradient(90deg, ${gold}, ${amber}, ${gold})`,
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text', backgroundClip: 'text',
              animation: 'shimmer 3s linear infinite',
            }}>starts here.</em>
          </h2>

          <p style={{ fontSize: '0.95rem', color: muted, marginBottom: '2.5rem', fontWeight: 300, lineHeight: 1.85 }}>
            No setup fees. Create a group, add your performers,<br />and build your first song in under five minutes.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/register')} style={{
              background: gold, border: 'none', color: '#fff',
              padding: '0.95rem 2.25rem', borderRadius: '10px', cursor: 'pointer',
              fontSize: '0.9rem', fontFamily: sans, fontWeight: 600,
              boxShadow: `0 6px 28px ${gold}50`,
              transition: 'opacity 0.15s, transform 0.15s',
            }}
              onMouseEnter={e => { e.target.style.opacity = '0.88'; e.target.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.target.style.opacity = '1'; e.target.style.transform = 'translateY(0)' }}
            >Create your group</button>
            <button onClick={() => navigate('/login')} style={{
              background: 'transparent', border: `1.5px solid rgba(227,83,54,0.35)`, color: ink,
              padding: '0.95rem 2.25rem', borderRadius: '10px', cursor: 'pointer',
              fontSize: '0.9rem', fontFamily: sans, fontWeight: 300,
              transition: 'border-color 0.18s',
            }}
              onMouseEnter={e => e.target.style.borderColor = 'rgba(227,83,54,0.7)'}
              onMouseLeave={e => e.target.style.borderColor = 'rgba(227,83,54,0.35)'}
            >Log in</button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        padding: '1.35rem 2.5rem', borderTop: `1px solid ${border}`, background: '#fff',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem',
      }}>
        <div style={{ fontFamily: serif, fontSize: '1.1rem', color: muted }}>Cue<span style={{ color: gold }}>.</span></div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <button className="nav-link" onClick={() => navigate('/login')}>Log in</button>
          <button className="nav-link" onClick={() => navigate('/register')}>Sign up</button>
          <span style={{ fontSize: '0.76rem', color: faint }}>Built for musicians · 2025</span>
        </div>
      </footer>
    </div>
  )
}
