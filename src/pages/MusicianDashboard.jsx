import { useAuth } from '../context/AuthContext'

export default function MusicianDashboard() {
  const { profile, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Musician Dashboard</h1>
          <p className="text-gray-500 text-sm">Welcome, {profile?.name}</p>
        </div>
        <button
          onClick={logout}
          className="text-sm text-red-500 hover:underline"
        >
          Log out
        </button>
      </div>
      <p className="text-gray-400">Phase 4 content coming soon.</p>
    </div>
  )
}