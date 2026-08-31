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
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Profile from './pages/Profile'
import AppLayout from './components/AppLayout'

function Protected({ children }) {
  return localStorage.getItem('tomatoUser') ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
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
        <Route path="/reports" element={<Reports />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
