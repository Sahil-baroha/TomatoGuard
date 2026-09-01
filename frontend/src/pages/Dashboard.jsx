import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Leaf, Droplets, CloudSun, Lightbulb, ScanLine, FlaskConical, Wind, AlertTriangle, Loader2 } from 'lucide-react'
import Page from '../components/Page'
import { getDashboardSummary, clearTokens } from '../lib/api'

// ── Empty-state messages per card ────────────────────────────────────────────
// Each is distinct — spec says "never a generic spinner stuck forever, not a fake zero"
const EMPTY_STATES = {
  disease: {
    icon: Leaf,
    label: 'No scan yet',
    hint: 'Take your first leaf photo to check for disease.',
    action: '/disease',
    actionLabel: 'Scan a leaf',
    tone: 'green',
  },
  soil: {
    icon: Droplets,
    label: 'No soil analysis yet',
    hint: 'Upload a soil report or answer the questionnaire.',
    action: '/soil',
    actionLabel: 'Check soil',
    tone: 'blue',
  },
  weather: {
    icon: CloudSun,
    label: 'No weather data yet',
    hint: 'Fetch current conditions for your farm location.',
    action: '/weather',
    actionLabel: 'View weather',
    tone: 'amber',
  },
  recommendation: {
    icon: Lightbulb,
    label: 'No recommendation yet',
    hint: 'Complete at least one scan or analysis to see a recommendation.',
    action: null,
    tone: 'purple',
  },
}

const TONE_CLASSES = {
  green:  { bg: 'bg-green-50 dark:bg-green-950/30',  icon: 'text-green-600', badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  blue:   { bg: 'bg-blue-50 dark:bg-blue-950/30',    icon: 'text-blue-600',  badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  amber:  { bg: 'bg-amber-50 dark:bg-amber-950/30',  icon: 'text-amber-600', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-950/30',icon: 'text-purple-600',badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
}

function SummaryCard({ config, value, loading }) {
  const { icon: Icon, label, hint, action, actionLabel, tone } = config
  const nav = useNavigate()
  const tc = TONE_CLASSES[tone]

  return (
    <div className={`card flex flex-col gap-3 p-6 ${tc.bg}`}>
      <div className="flex items-center gap-3">
        <div className={`rounded-2xl p-2 bg-white/70 dark:bg-black/20 ${tc.icon}`}>
          <Icon size={22} />
        </div>
        <span className="text-sm font-bold text-stone-500">{label}</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-stone-400">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      ) : value ? (
        // Real data state
        <div className="flex flex-col gap-1">
          {value.lines.map((line, i) => (
            <p key={i} className={i === 0 ? 'font-black text-lg leading-tight' : 'text-sm text-stone-500'}>
              {line}
            </p>
          ))}
          {value.badge && (
            <span className={`mt-1 inline-block self-start rounded-full px-3 py-1 text-xs font-black ${tc.badge}`}>
              {value.badge}
            </span>
          )}
        </div>
      ) : (
        // Genuine empty state — no fabricated data
        <div className="flex flex-col gap-2">
          <p className="text-sm text-stone-500 leading-6">{hint}</p>
          {action && (
            <button
              onClick={() => nav(action)}
              className="mt-1 self-start rounded-xl bg-red-700 px-4 py-2 text-sm font-black text-white"
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const user = (() => { try { return JSON.parse(localStorage.getItem('tomatoUser') || '{}') } catch { return {} } })()
  const nav = useNavigate()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    let cancelled = false
    getDashboardSummary()
      .then(data => { if (!cancelled) { setSummary(data); setLoading(false) } })
      .catch(err => {
        if (cancelled) return
        if (err.status === 401 || err.status === 403) {
          clearTokens()
          nav('/login', { replace: true })
          return
        }
        if (err.message === 'SERVICE_NOT_CONFIGURED') {
          setApiError('Backend not configured — set VITE_BACKEND_API_URL in .env')
        } else {
          setApiError(err.message || 'Could not load dashboard data.')
        }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // Build per-card values from the API response (null if no data)
  const diseaseValue = summary?.latest_disease_scan ? {
    lines: [
      summary.latest_disease_scan.predicted_disease,
      `Confidence: ${summary.latest_disease_scan.confidence !== null
        ? `${Math.round(summary.latest_disease_scan.confidence)}%`
        : '—'}`,
      new Date(summary.latest_disease_scan.scan_date).toLocaleDateString(),
    ],
    badge: null,
  } : null

  const soilValue = summary?.latest_soil_analysis ? {
    lines: [
      summary.latest_soil_analysis.predicted_soil_condition || 'Analysis available',
      summary.latest_soil_analysis.fertilizer_recommendation
        ? `Fertilizer: ${summary.latest_soil_analysis.fertilizer_recommendation.slice(0, 60)}…`
        : '',
      summary.latest_soil_analysis.analysis_date
        ? new Date(summary.latest_soil_analysis.analysis_date).toLocaleDateString()
        : '',
    ].filter(Boolean),
    badge: summary.latest_soil_analysis.predicted_soil_condition || null,
  } : null

  const weatherValue = summary?.latest_weather ? {
    lines: [
      summary.latest_weather.temperature_c !== null
        ? `${summary.latest_weather.temperature_c}°C`
        : 'Condition recorded',
      summary.latest_weather.weather_condition || '',
      summary.latest_weather.recorded_at
        ? new Date(summary.latest_weather.recorded_at).toLocaleDateString()
        : '',
    ].filter(Boolean),
    badge: summary.latest_weather.weather_condition || null,
  } : null

  // Recommendation card: available only when at least one source has data
  const hasAnyData = !!(summary?.latest_disease_scan || summary?.latest_soil_analysis || summary?.latest_weather)
  const recommendationValue = hasAnyData ? {
    lines: ['View your combined recommendation'],
    badge: null,
  } : null

  return (
    <Page
      title={`Farm Dashboard${user.name ? ` — ${user.name.split(' ')[0]}` : ''}`}
      sub="Your latest crop, soil, weather and recommendation information."
    >
      {apiError && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard config={EMPTY_STATES.disease}       value={diseaseValue}        loading={loading} />
        <SummaryCard config={EMPTY_STATES.soil}          value={soilValue}           loading={loading} />
        <SummaryCard config={EMPTY_STATES.weather}       value={weatherValue}        loading={loading} />
        <SummaryCard config={EMPTY_STATES.recommendation} value={recommendationValue} loading={loading} />
      </div>

      {/* Primary action buttons */}
      <div className="mt-6 flex flex-wrap gap-4">
        <button onClick={() => nav('/disease')} className="flex items-center gap-2 rounded-xl bg-red-700 px-5 py-3 font-black text-white">
          <ScanLine size={18} /> Scan a leaf
        </button>
        <button onClick={() => nav('/soil')} className="flex items-center gap-2 rounded-xl border border-stone-300 px-5 py-3 font-black dark:border-stone-700">
          <FlaskConical size={18} /> Check soil
        </button>
        <button onClick={() => nav('/weather')} className="flex items-center gap-2 rounded-xl border border-stone-300 px-5 py-3 font-black dark:border-stone-700">
          <Wind size={18} /> View weather
        </button>
      </div>
    </Page>
  )
}
