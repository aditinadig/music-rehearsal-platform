import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import PerformerSongView from '../components/performer/PerformerSongView'

const terracotta = '#E35336'
const ink = '#12100A'
const roleBg = '#FCE7F3'
const roleText = '#DB2777'

export default function SingerDashboard() {
  const { profile, logout } = useAuth()
  const [darkDisplay, setDarkDisplay] = useState(() => localStorage.getItem('performer_darkDisplay') === 'true')

  return (
    <div className={`min-h-screen transition-colors duration-200 ${darkDisplay ? 'bg-gray-950' : 'bg-white'}`}>
      <div className={`sticky top-0 z-40 border-b px-4 sm:px-8 py-3 flex justify-between items-center ${darkDisplay ? 'bg-gray-900 border-gray-700' : 'bg-white/95 backdrop-blur border-gray-100'}`}>
        <div className="flex items-center gap-3">
          <span style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.35rem', color: darkDisplay ? '#fff' : ink, letterSpacing: '-0.01em' }}>
            Cue<span style={{ color: terracotta }}>.</span>
          </span>
          <span className={`hidden sm:block w-px h-5 ${darkDisplay ? 'bg-gray-700' : 'bg-gray-200'}`} />
          <span
            className="hidden sm:block text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ background: roleBg, color: roleText }}
          >
            Singer
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm hidden sm:block ${darkDisplay ? 'text-gray-400' : 'text-gray-500'}`}>{profile?.name}</span>
          <button onClick={logout} className={`text-xs font-medium transition px-3 py-1.5 rounded-lg ${darkDisplay ? 'text-gray-300 hover:text-red-400 hover:bg-red-950' : 'text-gray-600 hover:text-red-600 hover:bg-red-50'}`}>
            Log out
          </button>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-4 sm:py-6 space-y-4">
        <div className={`rounded-3xl border overflow-hidden shadow-sm ${darkDisplay ? 'bg-gray-900 border-gray-700' : 'bg-white border-orange-100'}`}>
          <div className={`p-5 sm:p-6 ${darkDisplay ? '' : 'bg-gradient-to-br from-white via-white to-pink-50'}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: darkDisplay ? '#f9a8d4' : roleText }}>Singer portal</p>
                <h1 className={`mt-2 text-2xl font-semibold ${darkDisplay ? 'text-white' : 'text-gray-900'}`}>Your assigned lines, ready for rehearsal.</h1>
                <p className={`mt-2 max-w-xl text-sm leading-6 ${darkDisplay ? 'text-gray-400' : 'text-gray-500'}`}>
                  Confirm updates, rehearse your sections, and switch into stage mode when the lights go down.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {['Lines', 'Updates', 'Stage'].map((label, i) => (
                  <div key={label} className={`rounded-xl border px-3 py-2 ${darkDisplay ? 'border-gray-700 bg-gray-800' : 'border-pink-100 bg-white'}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-[0.12em] ${darkDisplay ? 'text-gray-400' : 'text-gray-400'}`}>{label}</p>
                    <p className={`mt-1 text-sm font-semibold ${i === 0 ? '' : darkDisplay ? 'text-gray-200' : 'text-gray-800'}`} style={i === 0 ? { color: darkDisplay ? '#f9a8d4' : roleText } : {}}>
                      {i === 0 ? 'mine' : i === 1 ? 'live' : 'dark'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <PerformerSongView showNotation={false} onDarkDisplayChange={setDarkDisplay} />
      </div>
    </div>
  )
}
