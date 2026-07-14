import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase/client'

const ink = '#12100A'
const rust = '#8A2B0E'
const terracotta = '#E35336'
const peach = '#FFD3AC'
const cream = '#FFF9F5'
const lavender = '#9988A1'
const border = '#F0D7C8'
const serif = "'DM Serif Display', Georgia, serif"

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;600;700&display=swap');

  .landing-page { min-height: 100vh; overflow-x: hidden; background: ${cream}; color: ${ink}; }
  .landing-shell { width: min(1160px, calc(100% - 40px)); margin: 0 auto; }
  .landing-nav { display: flex; align-items: center; justify-content: space-between; min-height: 68px; }
  .landing-nav-actions { display: flex; align-items: center; gap: 10px; }
  .landing-button { border: 0; border-radius: 12px; padding: 12px 18px; font: 700 13px 'DM Sans', sans-serif; cursor: pointer; transition: transform .18s ease, box-shadow .18s ease, background .18s ease; }
  .landing-button:hover { transform: translateY(-2px); }
  .landing-button-dark { background: ${ink}; color: white; box-shadow: 0 10px 24px rgba(18,16,10,.16); }
  .landing-button-dark:hover { background: #2b261b; box-shadow: 0 14px 28px rgba(18,16,10,.22); }
  .landing-button-light { background: white; color: ${rust}; border: 1px solid ${border}; }
  .landing-link { border: 0; background: transparent; color: #665A54; padding: 10px; font: 600 13px 'DM Sans', sans-serif; cursor: pointer; }

  .landing-hero { position: relative; overflow: hidden; border: 1px solid ${border}; border-radius: 30px; background: linear-gradient(125deg, #FFF 0%, #FFF4EA 52%, #F3EEF5 100%); box-shadow: 0 24px 80px rgba(81,42,26,.10); }
  .landing-hero::before { content: ''; position: absolute; width: 390px; height: 390px; border-radius: 50%; right: -120px; top: -190px; background: ${peach}; opacity: .7; }
  .landing-hero::after { content: ''; position: absolute; width: 260px; height: 260px; border-radius: 50%; left: 38%; bottom: -210px; background: ${terracotta}; opacity: .12; }
  .landing-hero-grid { position: relative; z-index: 1; display: grid; grid-template-columns: 1.05fr .95fr; gap: 52px; align-items: center; padding: 62px; }
  .landing-eyebrow { display: inline-flex; align-items: center; gap: 8px; border: 1px solid ${border}; border-radius: 999px; background: rgba(255,255,255,.78); padding: 7px 11px; color: ${rust}; font-size: 11px; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; }
  .landing-eyebrow-dot { width: 7px; height: 7px; border-radius: 50%; background: ${terracotta}; box-shadow: 0 0 0 5px rgba(227,83,54,.12); }
  .landing-title { max-width: 600px; margin: 20px 0 16px; font-family: ${serif}; font-size: clamp(48px, 6vw, 76px); font-weight: 400; letter-spacing: -.045em; line-height: .98; }
  .landing-title em { color: ${terracotta}; font-weight: 400; }
  .landing-subtitle { max-width: 510px; margin: 0; color: #665A54; font-size: 17px; line-height: 1.6; }
  .landing-hero-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 28px; }
  .landing-no-signup { margin-top: 12px; color: #8B7B73; font-size: 12px; }
  .landing-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 24px; }
  .landing-tag { border-radius: 9px; background: rgba(255,255,255,.78); border: 1px solid ${border}; padding: 7px 10px; color: #5F5550; font-size: 12px; font-weight: 700; }

  .product-frame { position: relative; border-radius: 24px; background: ${ink}; padding: 14px; box-shadow: 0 30px 70px rgba(18,16,10,.28); transform: rotate(1deg); }
  .product-window { overflow: hidden; border-radius: 16px; background: #FFFDFC; }
  .product-topbar { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid ${border}; }
  .product-dots { display: flex; gap: 5px; }
  .product-dots span { width: 7px; height: 7px; border-radius: 50%; background: ${border}; }
  .product-body { padding: 16px; }
  .product-song { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 14px; }
  .product-section { overflow: hidden; border: 1px solid ${border}; border-radius: 12px; background: white; }
  .product-section-title { padding: 9px 12px; background: #FFF4EA; color: ${rust}; font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
  .product-line { display: grid; grid-template-columns: 24px 1fr auto; gap: 9px; align-items: center; padding: 11px 12px; border-top: 1px solid #F6E9E2; }
  .product-line-number { color: #B5A59D; font-size: 11px; }
  .product-line-text { color: ${ink}; font-size: 12px; font-weight: 700; }
  .product-note { display: block; color: ${lavender}; font: 700 10px monospace; margin-bottom: 2px; }
  .product-role { border-radius: 999px; padding: 4px 7px; font-size: 9px; font-weight: 800; white-space: nowrap; }
  .product-update { display: flex; align-items: center; gap: 9px; margin-top: 12px; border-radius: 11px; background: ${ink}; color: white; padding: 10px 12px; font-size: 10px; }
  .product-update strong { flex: 1; font-size: 11px; }
  .product-confirm { border-radius: 7px; background: #22A06B; padding: 5px 8px; font-weight: 800; }

  .landing-flow { display: grid; grid-template-columns: repeat(3, 1fr); margin: 22px 0; overflow: hidden; border: 1px solid ${border}; border-radius: 20px; background: white; box-shadow: 0 14px 44px rgba(81,42,26,.07); }
  .flow-item { position: relative; display: flex; align-items: center; gap: 13px; padding: 20px 22px; }
  .flow-item + .flow-item { border-left: 1px solid ${border}; }
  .flow-number { display: grid; place-items: center; width: 34px; height: 34px; flex: 0 0 auto; border-radius: 11px; color: white; background: ${terracotta}; font-family: ${serif}; font-size: 17px; }
  .flow-item:nth-child(2) .flow-number { background: ${lavender}; }
  .flow-item:nth-child(3) .flow-number { background: ${ink}; }
  .flow-title { margin: 0; font-size: 14px; font-weight: 800; }
  .flow-copy { margin: 3px 0 0; color: #81716A; font-size: 12px; }

  .roles-panel { border-radius: 28px; background: ${ink}; padding: 42px; color: white; }
  .roles-heading { display: flex; align-items: end; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
  .roles-heading h2 { max-width: 480px; margin: 0; font-family: ${serif}; font-size: clamp(32px, 4vw, 48px); font-weight: 400; line-height: 1.05; }
  .roles-heading p { max-width: 360px; margin: 0; color: #CFC6C1; font-size: 14px; line-height: 1.5; }
  .role-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .role-card { min-height: 160px; border-radius: 18px; padding: 20px; background: #211E17; border: 1px solid rgba(255,255,255,.1); }
  .role-card:nth-child(1) { background: ${rust}; }
  .role-card:nth-child(2) { background: #B43A22; }
  .role-card:nth-child(3) { background: #574861; }
  .role-icon { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; background: rgba(255,255,255,.14); font-size: 17px; }
  .role-card h3 { margin: 18px 0 8px; font-size: 16px; }
  .role-card p { margin: 0; color: rgba(255,255,255,.78); font-size: 13px; line-height: 1.55; }

  .landing-close { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin: 22px 0 36px; border: 1px solid ${border}; border-radius: 22px; background: linear-gradient(100deg, ${peach}, #FFF4EA); padding: 26px 30px; }
  .landing-close h2 { margin: 0; font-family: ${serif}; font-size: clamp(25px, 3vw, 36px); font-weight: 400; }
  .landing-close p { margin: 5px 0 0; color: #705E55; font-size: 13px; }
  .landing-footer { display: flex; justify-content: space-between; align-items: center; padding: 20px 0 28px; color: #8B7B73; font-size: 12px; }

  @media (max-width: 880px) {
    .landing-hero-grid { grid-template-columns: 1fr; padding: 44px; }
    .product-frame { max-width: 560px; transform: none; }
    .roles-heading { align-items: flex-start; flex-direction: column; }
  }
  @media (max-width: 680px) {
    .landing-shell { width: min(100% - 24px, 1160px); }
    .landing-nav { min-height: 62px; }
    .landing-nav .landing-link { display: none; }
    .landing-button { padding: 11px 14px; }
    .landing-hero { border-radius: 22px; }
    .landing-hero-grid { padding: 30px 22px; gap: 34px; }
    .landing-title { font-size: clamp(43px, 14vw, 60px); }
    .landing-subtitle { font-size: 15px; }
    .landing-flow, .role-grid { grid-template-columns: 1fr; }
    .flow-item + .flow-item { border-left: 0; border-top: 1px solid ${border}; }
    .roles-panel { padding: 28px 20px; border-radius: 22px; }
    .role-card { min-height: 0; }
    .landing-close { align-items: flex-start; flex-direction: column; padding: 24px; }
    .landing-close .landing-button { width: 100%; justify-content: center; }
    .landing-footer { align-items: flex-start; flex-direction: column; }
  }
`

function ProductPreview() {
  return (
    <div className="product-frame" aria-label="Cue rehearsal workspace preview">
      <div className="product-window">
        <div className="product-topbar">
          <strong style={{ fontFamily: serif, fontSize: 19 }}>Cue<span style={{ color: terracotta }}>.</span></strong>
          <div className="product-dots"><span /><span /><span /></div>
        </div>
        <div className="product-body">
          <div className="product-song">
            <div>
              <p style={{ margin: 0, color: terracotta, fontSize: 9, fontWeight: 900, letterSpacing: '.13em', textTransform: 'uppercase' }}>Tonight’s rehearsal</p>
              <h3 style={{ margin: '4px 0 0', fontSize: 16 }}>Closer Than We Know</h3>
            </div>
            <span style={{ borderRadius: 999, background: '#E9F8F0', color: '#18794E', padding: '5px 8px', fontSize: 9, fontWeight: 900 }}>4/5 confirmed</span>
          </div>
          <div className="product-section">
            <div className="product-section-title">Chorus</div>
            <div className="product-line">
              <span className="product-line-number">01</span>
              <span className="product-line-text">Hold on, we are closer than we know</span>
              <span className="product-role" style={{ background: '#FDEBE6', color: '#B43A22' }}>Maya</span>
            </div>
            <div className="product-line">
              <span className="product-line-number">02</span>
              <span className="product-line-text"><span className="product-note">F · G · C</span>Every voice will lead us home</span>
              <span className="product-role" style={{ background: '#F3EEF5', color: '#6F5D78' }}>Rohan</span>
            </div>
          </div>
          <div className="product-update">
            <span>●</span>
            <strong>Lyric updated · Maya</strong>
            <span className="product-confirm">Confirm</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = styles
    document.head.appendChild(style)

    let active = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active && session) navigate('/app')
    })
    return () => {
      active = false
      document.head.removeChild(style)
    }
  }, [navigate])

  return (
    <div className="landing-page">
      <div className="landing-shell">
        <nav className="landing-nav">
          <div style={{ fontFamily: serif, fontSize: 25 }}>Cue<span style={{ color: terracotta }}>.</span></div>
          <div className="landing-nav-actions">
            <button className="landing-link" onClick={() => navigate('/login')}>Log in</button>
            <button className="landing-button landing-button-dark" onClick={() => navigate('/demo')}>See it in action →</button>
          </div>
        </nav>

        <main>
          <section className="landing-hero">
            <div className="landing-hero-grid">
              <div>
                <span className="landing-eyebrow"><span className="landing-eyebrow-dot" /> Rehearsal, finally organised</span>
                <h1 className="landing-title">Every cue.<br />Every person.<br /><em>One place.</em></h1>
                <p className="landing-subtitle">Assign lyrics and notes, send updates, and know who is ready—without chasing a group chat.</p>
                <div className="landing-hero-actions">
                  <button className="landing-button landing-button-dark" onClick={() => navigate('/demo')}>Try the guided demo →</button>
                  <button className="landing-button landing-button-light" onClick={() => navigate('/register')}>Create a group</button>
                </div>
                <p className="landing-no-signup">No signup needed for the demo.</p>
                <div className="landing-tags">
                  <span className="landing-tag">Lyrics + notes</span>
                  <span className="landing-tag">Clear assignments</span>
                  <span className="landing-tag">Seen + confirmed</span>
                </div>
              </div>
              <ProductPreview />
            </div>
          </section>

          <section className="landing-flow" aria-label="How Cue works">
            <div className="flow-item"><span className="flow-number">1</span><div><p className="flow-title">Build</p><p className="flow-copy">Add the song once.</p></div></div>
            <div className="flow-item"><span className="flow-number">2</span><div><p className="flow-title">Assign</p><p className="flow-copy">Give everyone their part.</p></div></div>
            <div className="flow-item"><span className="flow-number">3</span><div><p className="flow-title">Confirm</p><p className="flow-copy">Know every update was seen.</p></div></div>
          </section>

          <section className="roles-panel">
            <div className="roles-heading">
              <h2>One rehearsal.<br />Three focused views.</h2>
              <p>Each person sees the same song, shaped around what they need next.</p>
            </div>
            <div className="role-grid">
              <article className="role-card"><span className="role-icon">♬</span><h3>Manager</h3><p>Build songs, assign parts, and track confirmations.</p></article>
              <article className="role-card"><span className="role-icon">♪</span><h3>Singer</h3><p>See highlighted lyrics, cues, and new updates.</p></article>
              <article className="role-card"><span className="role-icon">♯</span><h3>Musician</h3><p>Read notes above lyrics and enter on the right cue.</p></article>
            </div>
          </section>

          <section className="landing-close">
            <div><h2>Understand Cue by using it.</h2><p>The guided workspace takes you through the complete rehearsal flow.</p></div>
            <button className="landing-button landing-button-dark" onClick={() => navigate('/demo')}>Open the demo →</button>
          </section>
        </main>

        <footer className="landing-footer">
          <span style={{ fontFamily: serif, color: ink, fontSize: 18 }}>Cue<span style={{ color: terracotta }}>.</span></span>
          <span>Built for clearer rehearsals · {new Date().getFullYear()}</span>
        </footer>
      </div>
    </div>
  )
}
