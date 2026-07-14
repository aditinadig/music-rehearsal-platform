import { Link } from 'react-router-dom'

const terracotta = '#E35336'
const border = '#F0D7C8'
const serif = "'DM Serif Display', Georgia, serif"

function RehearsalPreview() {
  return (
    <div className="relative mt-10 max-w-md rounded-[26px] border border-white/10 bg-white/[0.07] p-4 shadow-2xl backdrop-blur">
      <div className="rounded-2xl bg-[#FFFDFC] p-4 text-[#12100A]">
        <div className="flex items-start justify-between gap-3 border-b border-[#F0D7C8] pb-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#E35336]">Tonight’s rehearsal</p>
            <p className="mt-1 text-sm font-bold">Closer Than We Know</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">4/5 ready</span>
        </div>
        <div className="mt-3 overflow-hidden rounded-xl border border-[#F0D7C8]">
          <div className="bg-[#FFF4EA] px-3 py-2 text-[9px] font-bold uppercase tracking-[0.14em] text-[#8A2B0E]">Chorus</div>
          <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-t border-[#F0D7C8] px-3 py-3">
            <p className="text-xs font-semibold">Hold on, we are closer than we know</p>
            <span className="rounded-full bg-[#FDEBE6] px-2 py-1 text-[9px] font-bold text-[#B43A22]">Maya</span>
          </div>
          <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-t border-[#F0D7C8] px-3 py-3">
            <div><p className="font-mono text-[9px] font-bold text-[#6F5D78]">F · G · C</p><p className="mt-0.5 text-xs font-semibold">Every voice will lead us home</p></div>
            <span className="rounded-full bg-[#F3EEF5] px-2 py-1 text-[9px] font-bold text-[#6F5D78]">Rohan</span>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#12100A] px-3 py-2.5 text-white">
          <span className="h-2 w-2 rounded-full bg-[#E35336]" />
          <span className="flex-1 text-[10px] font-semibold">One lyric update to confirm</span>
          <span className="rounded-md bg-emerald-600 px-2 py-1 text-[9px] font-bold">Confirm</span>
        </div>
      </div>
    </div>
  )
}

export default function AuthShell({ title, subtitle, children, alternate }) {
  return (
    <div className="min-h-screen bg-[#FFF9F5] font-sans text-[#12100A] lg:grid lg:grid-cols-[minmax(360px,0.9fr)_minmax(500px,1.1fr)]">
      <aside className="relative hidden min-h-screen overflow-hidden bg-[#12100A] p-10 text-white lg:flex lg:flex-col xl:p-14">
        <div className="absolute -right-32 -top-36 h-96 w-96 rounded-full bg-[#E35336]/30 blur-2xl" />
        <div className="absolute -bottom-44 -left-24 h-96 w-96 rounded-full bg-[#9988A1]/30 blur-2xl" />
        <Link to="/" className="relative z-10 w-fit text-2xl text-white no-underline" style={{ fontFamily: serif }}>
          Cue<span style={{ color: terracotta }}>.</span>
        </Link>
        <div className="relative z-10 my-auto py-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#FFD3AC]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#E35336]" /> One shared rehearsal
          </span>
          <h2 className="mt-5 max-w-md text-5xl font-normal leading-[1.02] tracking-[-0.035em] xl:text-6xl" style={{ fontFamily: serif }}>
            Less explaining.<br /><em className="text-[#FFD3AC]">More rehearsing.</em>
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-6 text-white/60">Parts, cues, notes, and confirmations stay together.</p>
          <RehearsalPreview />
        </div>
        <p className="relative z-10 text-xs text-white/40">Built for managers, singers, and musicians.</p>
      </aside>

      <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-8">
        <div className="absolute right-[-120px] top-[-140px] h-80 w-80 rounded-full bg-[#FFD3AC]/45 blur-3xl" />
        <div className="absolute bottom-[-180px] left-[-130px] h-96 w-96 rounded-full bg-[#9988A1]/20 blur-3xl" />
        <div className="relative z-10 w-full max-w-md">
          <div className="mb-5 flex items-center justify-between lg:hidden">
            <Link to="/" className="text-2xl text-[#12100A] no-underline" style={{ fontFamily: serif }}>Cue<span style={{ color: terracotta }}>.</span></Link>
            <Link to="/demo" className="rounded-xl border border-[#F0D7C8] bg-white px-3 py-2 text-xs font-bold text-[#8A2B0E] no-underline">View demo</Link>
          </div>
          <section className="rounded-[28px] border bg-white p-6 shadow-[0_24px_70px_rgba(81,42,26,0.10)] sm:p-8" style={{ borderColor: border }}>
            <div className="mb-6">
              <h1 className="text-3xl font-normal tracking-[-0.02em]" style={{ fontFamily: serif }}>{title}</h1>
              <p className="mt-1.5 text-sm text-[#6E625C]">{subtitle}</p>
            </div>
            {children}
          </section>
          <p className="mt-5 text-center text-sm text-[#6E625C]">{alternate}</p>
        </div>
      </main>
    </div>
  )
}
