import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function RoleRedirect() {
  const { profile, loading, user } = useAuth()

  // Still loading, wait
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  // Auth session exists but profile not fetched yet, keep waiting
  if (user && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!user && !profile) return <Navigate to="/login" replace />

  if (profile.role === 'manager') return <Navigate to="/manager" replace />
  if (profile.role === 'singer') return <Navigate to="/singer" replace />
  if (profile.role === 'musician') return <Navigate to="/musician" replace />

  return <Navigate to="/login" replace />
}