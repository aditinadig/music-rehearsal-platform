import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import PerformerSongView from '../components/performer/PerformerSongView'

export default function SingerDashboard() {
  const { profile, logout } = useAuth()
  const [darkDisplay, setDarkDisplay] = useState(() => localStorage.getItem('performer_darkDisplay') === 'true')

  return (
    <div className={`min-h-screen transition-colors duration-200 ${darkDisplay ? 'bg-gray-950' : 'bg-[#f7f6f2]'}`}>
      <div className={`border-b px-4 sm:px-8 py-3 flex justify-between items-center ${darkDisplay ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center gap-3">
          <span style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.35rem', color: darkDisplay ? '#f7f6f2' : '#18181b', letterSpacing: '-0.01em' }}>
            Cue<span style={{ color: '#7c3aed' }}>.</span>
          </span>
          <span className={`hidden sm:block w-px h-5 ${darkDisplay ? 'bg-gray-700' : 'bg-gray-200'}`} />
          <span className="hidden sm:block text-xs font-medium px-2 py-0.5 rounded-full bg-pink-50 text-pink-600">Singer</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm hidden sm:block ${darkDisplay ? 'text-gray-400' : 'text-gray-500'}`}>{profile?.name}</span>
          <button onClick={logout} className={`text-xs font-medium transition px-3 py-1.5 rounded-lg ${darkDisplay ? 'text-gray-300 hover:text-red-400 hover:bg-red-950' : 'text-gray-600 hover:text-red-600 hover:bg-red-50'}`}>
            Log out
          </button>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-4 sm:py-8">
        <PerformerSongView showNotation={false} onDarkDisplayChange={setDarkDisplay} />
      </div>
    </div>
  )
}
