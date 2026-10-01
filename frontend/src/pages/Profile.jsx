import { useState, useEffect } from 'react'
import { Camera, Save, MapPin, LoaderCircle, CheckCircle2, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Page from '../components/Page'
import { getMe, patchProfile, changePassword } from '../lib/api'

async function resizeImage(file) {
  const url = URL.createObjectURL(file)
  const img = new Image()
  await new Promise((r, j) => { img.onload = r; img.onerror = j; img.src = url })
  const s = 240, c = document.createElement('canvas')
  c.width = s; c.height = s;
  const x = c.getContext('2d')
  const m = Math.min(img.width, img.height), sx = (img.width - m) / 2, sy = (img.height - m) / 2
  x.drawImage(img, sx, sy, m, m, 0, 0, s, s)
  URL.revokeObjectURL(url)
  return c.toDataURL('image/jpeg', 0.82)
}

function ChangePasswordForm() {
  const { t } = useTranslation()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')

    if (newPassword !== confirmPassword) {
      return setError(t('profile.errorPasswordMatch'))
    }
    if (newPassword.length < 6) {
      return setError(t('profile.errorPasswordLength'))
    }

    setLoading(true)
    try {
      await changePassword({ current_password: currentPassword, new_password: newPassword })
      setMessage(t('profile.passwordChanged'))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err.message || t('profile.errorPasswordFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card max-w-3xl p-7 mt-6">
      <div className="flex items-center gap-3 mb-5 border-b border-stone-200 dark:border-stone-800 pb-4">
        <Lock className="text-red-700" size={24} />
        <h3 className="text-xl font-black">{t('profile.security')}</h3>
      </div>
      
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 items-end">
        <label>
          <span className="mb-2 block text-sm font-bold">{t('profile.currentPassword')}</span>
          <input type="password" required className="input" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
        </label>
        <label>
          <span className="mb-2 block text-sm font-bold">{t('profile.newPassword')}</span>
          <input type="password" required className="input" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
        </label>
        <label>
          <span className="mb-2 block text-sm font-bold">{t('profile.confirmNew')}</span>
          <input type="password" required className="input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
        </label>
      </div>
      
      {error && <p className="mt-4 text-sm font-bold text-red-700">{error}</p>}
      {message && <p className="mt-4 text-sm font-bold text-green-700">{message}</p>}

      <button disabled={loading} type="submit" className="mt-6 flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-3 font-black text-white dark:bg-white dark:text-stone-900">
        {loading ? <LoaderCircle className="animate-spin" size={18} /> : <Save size={18} />}
        {t('profile.updatePassword')}
      </button>
    </form>
  )
}

export default function Profile() {
  const { t, i18n } = useTranslation()
  const [p, setP] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [geoState, setGeoState] = useState('idle')
  const [lang, setLang] = useState(localStorage.getItem('tomatoLanguage') || 'en')

  useEffect(() => {
    getMe().then(data => {
      // Create a unified profile state from the backend data
      setP({
        name: data.name || '',
        email: data.email || '',
        farm_name: data.farm_name || '',
        village: data.village || '',
        district: data.district || '',
        state: data.state || '',
        latitude: data.latitude || '',
        longitude: data.longitude || '',
        photo: '' // Backend doesn't store profile photo yet, so we leave it empty
      })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const photo = async e => {
    const f = e.target.files?.[0]
    if (!f) return
    setP({ ...p, photo: await resizeImage(f) })
  }

  const handleLocationSearch = async () => {
    if (!p.district && !p.state) return
    setGeoState('loading')
    try {
      const query = [p.village, p.district, p.state].filter(Boolean).join(' ')
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1`)
      const data = await res.json()
      if (data.results && data.results.length > 0) {
        setP({ ...p, latitude: data.results[0].latitude, longitude: data.results[0].longitude })
        setGeoState('captured')
      } else {
        setGeoState('not_found')
      }
    } catch {
      setGeoState('error')
    }
  }

  const requestGPS = () => {
    if (!navigator.geolocation) return setGeoState('error')
    setGeoState('loading')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setP({ ...p, latitude: pos.coords.latitude, longitude: pos.coords.longitude })
        setGeoState('captured')
      },
      () => setGeoState('error')
    )
  }

  const handleLanguageChange = (newLang) => {
    setLang(newLang)
    i18n.changeLanguage(newLang)
    localStorage.setItem('tomatoLanguage', newLang)
  }

  const submit = async e => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      const payload = {
        name: p.name,
        farm_name: p.farm_name,
        village: p.village,
        district: p.district,
        state: p.state,
      }
      if (p.latitude !== '' && p.longitude !== '') {
        payload.latitude = parseFloat(p.latitude)
        payload.longitude = parseFloat(p.longitude)
      }
      await patchProfile(payload)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error(err)
      alert(t('profile.errorProfileFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading || !p) {
    return <Page title={t('profile.title')}><div className="p-8">{t('profile.loading')}</div></Page>
  }

  return (
    <Page title={t('profile.title')} sub={t('profile.sub')}>
      <form onSubmit={submit} className="card max-w-3xl p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative h-28 w-28 overflow-hidden rounded-3xl bg-red-100">
            {p.photo ? <img src={p.photo} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-4xl">👨‍🌾</div>}
            <label className="absolute bottom-1 right-1 cursor-pointer rounded-xl bg-stone-900 p-2 text-white">
              <Camera size={17} />
              <input type="file" accept="image/*" className="hidden" onChange={photo} />
            </label>
          </div>
          <div>
            <h2 className="text-2xl font-black">{p.name || 'Farm User'}</h2>
            <p className="text-stone-500">{p.farm_name}</p>
            <p className="mt-1 text-sm font-bold text-red-700">{t('profile.dedicatedCrop')}</p>
          </div>
        </div>

        <div className="mt-7 grid gap-5 md:grid-cols-2">
          <label>
            <span className="mb-2 block text-sm font-bold">{t('profile.fullName')}</span>
            <input className="input" value={p.name} onChange={e => setP({ ...p, name: e.target.value })} />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold">{t('profile.emailReadOnly')}</span>
            <input className="input bg-stone-100" value={p.email} readOnly />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold">{t('profile.farmName')}</span>
            <input className="input" value={p.farm_name} onChange={e => setP({ ...p, farm_name: e.target.value })} />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold">{t('profile.villageTown')}</span>
            <input className="input" value={p.village} onChange={e => setP({ ...p, village: e.target.value })} />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold">{t('profile.district')}</span>
            <input className="input" value={p.district} onChange={e => setP({ ...p, district: e.target.value })} />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold">{t('profile.state')}</span>
            <input className="input" value={p.state} onChange={e => setP({ ...p, state: e.target.value })} />
          </label>
        </div>

        <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-5 dark:border-stone-700 dark:bg-stone-900">
          <p className="font-bold">{t('profile.farmCoordinates')}</p>
          <p className="text-sm text-stone-500">{t('profile.coordinatesHint')}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-xs font-bold text-stone-500">{t('profile.latitude')}</span>
              <input type="number" step="any" className="input" value={p.latitude} onChange={e => setP({ ...p, latitude: e.target.value, geoState: 'idle' })} placeholder="e.g. 28.7041" />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold text-stone-500">{t('profile.longitude')}</span>
              <input type="number" step="any" className="input" value={p.longitude} onChange={e => setP({ ...p, longitude: e.target.value, geoState: 'idle' })} placeholder="e.g. 77.1025" />
            </label>
          </div>
          
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={requestGPS} className="flex items-center gap-2 rounded-xl bg-stone-200 px-4 py-2 text-sm font-bold hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700">
              <MapPin size={16} className="text-red-700" />
              {t('profile.useGPS')}
            </button>
            <button type="button" onClick={handleLocationSearch} className="flex items-center gap-2 rounded-xl bg-stone-200 px-4 py-2 text-sm font-bold hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700">
              {t('profile.findFromDistrict')}
            </button>
          </div>
          {geoState === 'loading' && <p className="mt-3 text-sm text-stone-500">{t('profile.processing')}</p>}
          {geoState === 'captured' && <p className="mt-3 flex items-center gap-1 text-sm font-bold text-green-700"><CheckCircle2 size={16} /> {t('profile.coordinatesUpdated')}</p>}
          {geoState === 'not_found' && <p className="mt-3 text-sm text-red-700">{t('profile.locationNotFound')}</p>}
          {geoState === 'error' && <p className="mt-3 text-sm text-red-700">{t('profile.locationError')}</p>}
        </div>

        {/* Language selector */}
        <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-5 dark:border-stone-700 dark:bg-stone-900">
          <p className="mb-3 font-bold">{t('profile.language')}</p>
          <div className="flex gap-2">
            {[['en', 'English'], ['hi', 'हिंदी'], ['mr', 'मराठी']].map(([code, label]) => (
              <button
                key={code}
                type="button"
                onClick={() => handleLanguageChange(code)}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${lang === code ? 'bg-red-700 text-white' : 'bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <button disabled={saving} className="mt-6 flex items-center gap-2 rounded-xl bg-red-700 px-5 py-3 font-black text-white">
          {saving ? <LoaderCircle className="animate-spin" size={18} /> : <Save size={18} />}
          {t('profile.saveProfile')}
        </button>
        {saved && <p className="mt-4 text-sm font-bold text-green-700">{t('profile.profileSaved')}</p>}
      </form>
      
      <ChangePasswordForm />
    </Page>
  )
}
