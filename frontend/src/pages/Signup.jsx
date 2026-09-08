import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, MapPin, CheckCircle2, AlertTriangle } from 'lucide-react'
import { AuthShell } from './Login'
import { signup } from '../lib/api'

export default function Signup() {
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [locState, setLocState] = useState('idle') // 'idle' | 'loading' | 'captured' | 'denied'
  const [coords, setCoords] = useState({ latitude: null, longitude: null })
  const nav = useNavigate()

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocState('denied')
      return
    }
    setLocState('loading')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
        setLocState('captured')
      },
      () => {
        setLocState('denied')
      },
      { timeout: 10000 }
    )
  }

  const submit = async e => {
    e.preventDefault()
    setError('')
    const f = new FormData(e.currentTarget)
    const name = f.get('name')
    const email = f.get('email')
    const password = f.get('password')
    const confirm = f.get('confirm')
    const farmName = f.get('farm_name')

    if (!name || !email || !password || !confirm || !farmName)
      return setError('Complete all required fields.')
    if (password.length < 8)
      return setError('Password must be at least 8 characters.')
    if (password !== confirm)
      return setError('Passwords do not match.')
    if (!f.get('terms'))
      return setError('Accept the terms to continue.')

    setLoading(true)
    try {
      const payload = { name, email, password, farm_name: farmName }
      if (coords.latitude !== null && coords.longitude !== null) {
        payload.latitude = coords.latitude
        payload.longitude = coords.longitude
      }
      await signup(payload)
      nav('/dashboard')
    } catch (err) {
      if (err.status === 409) {
        setError('An account with this email already exists. Please sign in.')
      } else if (err.message === 'SERVICE_NOT_CONFIGURED') {
        setError('Backend service is not configured — set VITE_BACKEND_API_URL in your .env file.')
      } else {
        setError(err.message || 'Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Register farmer account" subtitle="New users create an account before entering the dashboard.">
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-bold">Full name</span>
          <input name="name" className="input" placeholder="Farmer name" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-bold">Email</span>
          <input name="email" type="email" className="input" placeholder="farmer@example.com" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-bold">Farm name</span>
          <input name="farm_name" className="input" placeholder="My Tomato Farm" />
        </label>

        {/* Farm location — optional, one tap */}
        <div className="rounded-2xl border border-stone-200 p-4 dark:border-stone-700">
          <p className="mb-2 text-sm font-bold">Farm location <span className="font-normal text-stone-400">(optional — required for Weather)</span></p>
          {locState === 'idle' && (
            <button
              type="button"
              onClick={requestLocation}
              className="flex items-center gap-2 rounded-xl border border-stone-300 px-4 py-2 text-sm font-bold hover:bg-stone-50 dark:border-stone-600 dark:hover:bg-stone-800"
            >
              <MapPin size={16} className="text-red-700" />
              Use my location
            </button>
          )}
          {locState === 'loading' && (
            <p className="text-sm text-stone-400">Requesting location…</p>
          )}
          {locState === 'captured' && (
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 size={16} />
              Location captured ✓ ({coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)})
            </div>
          )}
          {locState === 'denied' && (
            <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>Location access denied. You can still sign up — add your location later from your Profile page to enable weather data.</span>
            </div>
          )}
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-bold">Password</span>
          <div className="relative">
            <input
              name="password"
              type={show ? 'text' : 'password'}
              className="input pr-12"
              placeholder="Minimum 8 characters"
            />
            <button type="button" className="absolute right-4 top-3.5" onClick={() => setShow(!show)}>
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-bold">Confirm password</span>
          <input name="confirm" type={show ? 'text' : 'password'} className="input" />
        </label>
        <label className="flex items-start gap-2 text-sm text-stone-500">
          <input name="terms" type="checkbox" className="mt-1" />
          I agree to the project platform terms and privacy notice.
        </label>
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 py-3 font-black text-white disabled:opacity-50"
        >
          {loading ? 'Creating account…' : <><span>Create account</span><ArrowRight size={18} /></>}
        </button>
      </form>
      <p className="mt-6 text-center text-sm">
        Already registered? <Link to="/login" className="font-black text-red-700">Sign in</Link>
      </p>
    </AuthShell>
  )
}
