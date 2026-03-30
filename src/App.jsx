import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/shared/ProtectedRoute'
import RoleRedirect from './components/shared/RoleRedirect'
import Login from './pages/Login'
import Register from './pages/Register'
import ManagerDashboard from './pages/ManagerDashboard'
import SingerDashboard from './pages/SingerDashboard'
import MusicianDashboard from './pages/MusicianDashboard'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Role based redirect after login */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <RoleRedirect />
              </ProtectedRoute>
            }
          />

          {/* Protected routes */}
          <Route
            path="/manager"
            element={
              <ProtectedRoute>
                <ManagerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/singer"
            element={
              <ProtectedRoute>
                <SingerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/musician"
            element={
              <ProtectedRoute>
                <MusicianDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}