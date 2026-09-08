import { Navigate, Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Disease from './pages/Disease'
import Soil from './pages/Soil'
import Weather from './pages/Weather'
import Tasks from './pages/Tasks'
import Schemes from './pages/Schemes'
import History from './pages/History'
import Settings from './pages/Settings'
import Profile from './pages/Profile'
import AppLayout from './components/AppLayout'

// Admin pages — separate section, no shared layout with the farmer app
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminFarmerDetail from './pages/admin/AdminFarmerDetail'
import AdminDiseases from './pages/admin/AdminDiseases'
import { isAdminLoggedIn } from './lib/adminApi'

// Farmer guard — checks tomatoTokens (real JWT pair stored by Login.jsx)
function Protected({ children }) {
  try {
    const tokens = JSON.parse(localStorage.getItem('tomatoTokens') || 'null')
    return tokens?.access_token ? children : <Navigate to="/login" replace />
  } catch {
    return <Navigate to="/login" replace />
  }
}

// Admin guard — checks tomatoAdminTokens; never falls back to farmer /login
function AdminProtected({ children }) {
  return isAdminLoggedIn() ? children : <Navigate to="/admin/login" replace />
}

export default function App() {
  return (
    <Routes>
      {/* ── Farmer routes (unchanged) ── */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route element={<Protected><AppLayout /></Protected>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/disease" element={<Disease />} />
        <Route path="/soil" element={<Soil />} />
        <Route path="/weather" element={<Weather />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/schemes" element={<Schemes />} />
        <Route path="/history" element={<History />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* ── Admin routes — entirely separate auth, no shared layout ── */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminProtected><AdminDashboard /></AdminProtected>} />
      <Route path="/admin/farmers/:userId" element={<AdminProtected><AdminFarmerDetail /></AdminProtected>} />
      <Route path="/admin/diseases" element={<AdminProtected><AdminDiseases /></AdminProtected>} />
      {/* Redirect bare /admin to dashboard (guard handles the login redirect if not authenticated) */}
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
