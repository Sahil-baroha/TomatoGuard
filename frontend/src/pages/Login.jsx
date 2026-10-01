import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Brand from '../components/Brand'
import { login, getMe } from '../lib/api'

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || ''

export default function Login() {
  const { t } = useTranslation()
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState(null)
  const captchaRef = useRef(null)
  const nav = useNavigate()

  // Load reCAPTCHA v2 script and render widget into the ref div
  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY) return

    const renderWidget = () => {
      if (captchaRef.current && captchaRef.current.childNodes.length === 0) {
        window.grecaptcha.render(captchaRef.current, {
          sitekey: RECAPTCHA_SITE_KEY,
          callback: (token) => setCaptchaToken(token),
          'expired-callback': () => setCaptchaToken(null),
        })
      }
    }

    if (window.grecaptcha?.render) {
      renderWidget()
      return
    }

    // Script not yet loaded — inject it with an onload hook
    window.__onRecaptchaLoad = renderWidget
    if (!document.getElementById('g-recaptcha-script')) {
      const s = document.createElement('script')
      s.id = 'g-recaptcha-script'
      s.src = 'https://www.google.com/recaptcha/api.js?onload=__onRecaptchaLoad&render=explicit'
      s.async = true
      s.defer = true
      document.head.appendChild(s)
    }

    return () => { delete window.__onRecaptchaLoad }
  }, [])

  const submit = async e => {
    e.preventDefault()
    setError('')
    const f = new FormData(e.currentTarget)
    const email = f.get('email')
    const password = f.get('password')
    if (!email || !password) return setError(t('login.errorEnterFields'))
    if (RECAPTCHA_SITE_KEY && !captchaToken) return setError(t('login.errorCompleteCaptcha'))

    setLoading(true)
    try {
      await login(email, password, captchaToken)
      // Fetch and cache the user profile so components can read their name
      const me = await getMe()
      localStorage.setItem('tomatoUser', JSON.stringify({ name: me.name, email: me.email }))
      nav('/dashboard')
    } catch (err) {
      if (err.status === 403) {
        setError(t('login.errorDeactivated'))
      } else if (err.status === 401) {
        setError(t('login.errorInvalidCredentials'))
      } else if (err.message === 'SERVICE_NOT_CONFIGURED') {
        setError(t('login.errorServiceNotConfigured'))
      } else {
        setError(err.message || t('login.errorGeneric'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title={t('login.title')} subtitle={t('login.subtitle')}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={t('login.email')}>
          <input name="email" type="email" className="input" placeholder={t('login.emailPlaceholder')} />
        </Field>
        <Field label={t('login.password')}>
          <div className="relative">
            <input
              name="password"
              type={show ? 'text' : 'password'}
              className="input pr-12"
              placeholder={t('login.passwordPlaceholder')}
            />
            <button type="button" className="absolute right-4 top-3.5" onClick={() => setShow(!show)}>
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>
        {RECAPTCHA_SITE_KEY && (
          <div ref={captchaRef} className="flex justify-center" />
        )}
        {error && <p className="rounded-xl bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
        <button
          disabled={loading || (RECAPTCHA_SITE_KEY ? !captchaToken : false)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 py-3 font-black text-white disabled:opacity-50"
        >
          {loading ? t('login.signingIn') : <><span>{t('login.signIn')}</span><ArrowRight size={18} /></>}
        </button>
      </form>
      <p className="mt-6 text-center text-sm">
        {t('login.newUser')} <Link to="/signup" className="font-black text-red-700">{t('login.registerHere')}</Link>
      </p>
    </AuthShell>
  )
}

export function AuthShell({ title, subtitle, children }) {
  const { t } = useTranslation()
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="auth-tomato hidden p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <Brand light />
        <div>
          <p className="text-xs font-black uppercase tracking-[.2em] text-red-300">Tomato-only platform</p>
          <h2 className="mt-4 max-w-xl text-5xl font-black">One workspace built around the tomato crop.</h2>
          <p className="mt-4 max-w-lg leading-7 text-red-50">Leaf health, soil interpretation, weather and daily field tasks in one place.</p>
        </div>
        <p className="text-sm text-red-100">TomatoGuard AI Decision Support System</p>
      </div>
      <div className="flex items-center justify-center bg-[#faf9f5] dark:bg-stone-950 text-stone-800 dark:text-stone-100 p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden"><Brand /></div>
          <h1 className="text-4xl font-black">{title}</h1>
          <p className="mt-2 text-stone-500 dark:text-stone-400">{subtitle}</p>
          <div className="mt-8 rounded-3xl bg-white dark:bg-stone-900 p-7 shadow-xl">{children}</div>
          <Link to="/" className="mt-6 block text-center text-sm font-bold text-red-700 dark:text-red-400">{t('login.backToLanding')}</Link>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold">{label}</span>
      {children}
    </label>
  )
}
