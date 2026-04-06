import { useAuth } from '../context/AuthContext'
import PerformerSongView from '../components/performer/PerformerSongView'

export default function MusicianDashboard() {
  const { profile, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Musician Dashboard</h1>
          <p className="text-sm text-gray-400">Welcome, {profile?.name}</p>
        </div>
        <button onClick={logout} className="text-sm text-red-400 hover:underline">
          Log out
        </button>
      </div>
      <div className="max-w-3xl mx-auto px-8 py-8">
        <PerformerSongView showNotation={true} />
      </div>
    </div>
  )
}
