import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/shared/ProtectedRoute'
import RoleRedirect from './components/shared/RoleRedirect'
import Landing from './pages/Landing'

const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const AcceptInvite = lazy(() => import('./pages/AcceptInvite'))
const Demo = lazy(() => import('./pages/Demo'))
const ManagerDashboard = lazy(() => import('./pages/ManagerDashboard'))
const SingerDashboard = lazy(() => import('./pages/SingerDashboard'))
const MusicianDashboard = lazy(() => import('./pages/MusicianDashboard'))

function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-6 h-6 border-2 border-[#E35336] border-t-transparent rounded-full animate-spin" aria-label="Loading" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<RouteLoading />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/accept-invite" element={<AcceptInvite />} />
            <Route path="/demo" element={<Demo />} />

            {/* Role-based redirect after login */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <RoleRedirect />
                </ProtectedRoute>
              }
            />

            {/* Protected role routes */}
            <Route
              path="/manager"
              element={
                <ProtectedRoute allowedRoles={['manager']}>
                  <ManagerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/singer"
              element={
                <ProtectedRoute allowedRoles={['singer']}>
                  <SingerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/musician"
              element={
                <ProtectedRoute allowedRoles={['musician']}>
                  <MusicianDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
