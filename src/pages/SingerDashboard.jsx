import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import PerformerSongView from '../components/performer/PerformerSongView'

const terracotta = '#E35336'
const ink = '#12100A'
const roleBg = '#FDEBE6'
const roleText = '#B43A22'

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
      <div className="w-full px-4 py-5 sm:px-8 lg:px-10 xl:px-12 sm:py-7 space-y-5">
        <div className="px-1 py-2">
          <div>
            <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8A2B0E]">Singer portal</p>
                <h1 className="mt-2 text-2xl font-semibold text-gray-950">Your assigned lines, ready for rehearsal.</h1>
                <p className="mt-2 w-full text-sm leading-6 text-[#5B6472]">
                  Choose a group first, then rehearse the songs assigned inside that group. Confirm updates before rehearsal starts.
                </p>
            </div>
          </div>
        </div>
        <PerformerSongView showNotation={false} onDarkDisplayChange={setDarkDisplay} />
      </div>
    </div>
  )
}
