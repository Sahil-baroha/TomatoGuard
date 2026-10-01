import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, MapPin, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AuthShell } from './Login'
import { signup } from '../lib/api'

export default function Signup() {
  const { t } = useTranslation()
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
      return setError(t('signup.errorAllFields'))
    if (password.length < 8)
      return setError(t('signup.errorPasswordLength'))
    if (password !== confirm)
      return setError(t('signup.errorPasswordMatch'))
    if (!f.get('terms'))
      return setError(t('signup.errorTerms'))

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
        setError(t('signup.errorEmailExists'))
      } else if (err.message === 'SERVICE_NOT_CONFIGURED') {
        setError(t('signup.errorServiceNotConfigured'))
      } else {
        setError(err.message || t('signup.errorGeneric'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title={t('signup.title')} subtitle={t('signup.subtitle')}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-bold">{t('signup.fullName')}</span>
          <input name="name" className="input" placeholder={t('signup.namePlaceholder')} />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-bold">{t('signup.email')}</span>
          <input name="email" type="email" className="input" placeholder="farmer@example.com" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-bold">{t('signup.farmName')}</span>
          <input name="farm_name" className="input" placeholder={t('signup.farmNamePlaceholder')} />
        </label>

        {/* Farm location — optional, one tap */}
        <div className="rounded-2xl border border-stone-200 p-4 dark:border-stone-700">
          <p className="mb-2 text-sm font-bold">{t('signup.farmLocation')} <span className="font-normal text-stone-400">{t('signup.farmLocationOptional')}</span></p>
          {locState === 'idle' && (
            <button
              type="button"
              onClick={requestLocation}
              className="flex items-center gap-2 rounded-xl border border-stone-300 px-4 py-2 text-sm font-bold hover:bg-stone-50 dark:border-stone-600 dark:hover:bg-stone-800"
            >
              <MapPin size={16} className="text-red-700" />
              {t('signup.useMyLocation')}
            </button>
          )}
          {locState === 'loading' && (
            <p className="text-sm text-stone-400">{t('signup.requestingLocation')}</p>
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
              <span>{t('signup.locationDenied')}</span>
            </div>
          )}
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-bold">{t('signup.password')}</span>
          <div className="relative">
            <input
              name="password"
              type={show ? 'text' : 'password'}
              className="input pr-12"
              placeholder={t('signup.passwordPlaceholder')}
            />
            <button type="button" className="absolute right-4 top-3.5" onClick={() => setShow(!show)}>
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-bold">{t('signup.confirmPassword')}</span>
          <input name="confirm" type={show ? 'text' : 'password'} className="input" />
        </label>
        <label className="flex items-start gap-2 text-sm text-stone-500">
          <input name="terms" type="checkbox" className="mt-1" />
          {t('signup.terms')}
        </label>
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 py-3 font-black text-white disabled:opacity-50"
        >
          {loading ? t('signup.creatingAccount') : <><span>{t('signup.createAccount')}</span><ArrowRight size={18} /></>}
        </button>
      </form>
      <p className="mt-6 text-center text-sm">
        {t('signup.alreadyRegistered')} <Link to="/login" className="font-black text-red-700">{t('signup.signIn')}</Link>
      </p>
    </AuthShell>
  )
}
