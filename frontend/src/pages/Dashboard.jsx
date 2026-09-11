import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Leaf, Droplets, CloudSun, Lightbulb,
  ScanLine, FlaskConical, Wind, AlertTriangle, Loader2,
  ChevronRight, ArrowRight, ShieldCheck, ShieldAlert, ShieldX
} from 'lucide-react'
import Page from '../components/Page'
import { getDashboardSummary, clearTokens } from '../lib/api'

// ── Dashboard Component ────────────────────────────────────────────────────────

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

  // Derived values
  const disease = summary?.latest_disease_scan
  const soil = summary?.latest_soil_analysis
  const weather = summary?.latest_weather
  const rp = summary?.recommendation_preview

  const hasAnyData = !!(disease || soil || weather)

  // Status mappings
  const StatusIcon = rp?.health_status === 'critical' ? ShieldX :
                     rp?.health_status === 'at-risk' ? ShieldAlert :
                     rp?.health_status === 'good' ? ShieldCheck :
                     Lightbulb
  const statusColor = rp?.health_status === 'critical' ? 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200' :
                      rp?.health_status === 'at-risk' ? 'text-yellow-700 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200' :
                      rp?.health_status === 'good' ? 'text-green-700 bg-green-100 dark:bg-green-900 dark:text-green-200' :
                      'text-purple-600 bg-purple-100 dark:bg-purple-900 dark:text-purple-200'
  
  const statusLabel = rp?.health_status === 'critical' ? 'Critical Attention Needed' :
                      rp?.health_status === 'at-risk' ? 'At Risk - Needs Attention' :
                      rp?.health_status === 'good' ? 'Crop Health is Good' :
                      hasAnyData ? 'Recommendations Available' : 'No Data Available'

  return (
    <Page
      title={`Hello, ${user.name ? user.name.split(' ')[0] : 'Farmer'}!`}
      sub="Here is the latest snapshot of your farm's health."
    >
      {apiError && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-stone-400 p-6">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm font-bold">Loading dashboard...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          
          {/* Hero Section: Recommendations */}
          <div 
            onClick={() => hasAnyData && nav('/recommendations')}
            className={`card overflow-hidden flex flex-col md:flex-row items-center gap-6 p-6 md:p-8 cursor-pointer border-2 transition-all hover:shadow-md ${
              rp?.health_status === 'critical' ? 'border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50' :
              rp?.health_status === 'at-risk' ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900/50' :
              rp?.health_status === 'good' ? 'border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900/50' :
              'border-stone-200 dark:border-stone-800 hover:border-red-200 dark:hover:border-red-900'
            }`}
          >
            <div className={`p-4 rounded-2xl shrink-0 ${statusColor}`}>
              <StatusIcon size={40} />
            </div>
            <div className="flex-1 text-center md:text-left">
              <p className="text-xs font-black uppercase tracking-widest text-stone-500 mb-1">Overall Farm Status</p>
              <h2 className="text-2xl md:text-3xl font-black mb-2">{statusLabel}</h2>
              <p className="text-stone-600 dark:text-stone-300 text-sm md:text-base">
                {rp?.summary || (hasAnyData ? 'View your combined recommendations.' : 'Complete a disease scan or soil analysis to get started.')}
              </p>
            </div>
            {hasAnyData && (
              <div className="shrink-0 flex items-center justify-center bg-white dark:bg-stone-900 rounded-full h-12 w-12 shadow-sm">
                <ArrowRight size={24} className="text-stone-400" />
              </div>
            )}
          </div>

          {/* Detailed Cards Grid */}
          <div className="grid gap-5 md:grid-cols-3">
            
            {/* Disease Card */}
            <div 
              onClick={() => nav('/disease')}
              className="card flex flex-col p-5 cursor-pointer hover:border-red-200 dark:hover:border-red-900 transition-colors group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 p-2 rounded-xl">
                    <Leaf size={20} />
                  </div>
                  <span className="font-black">Disease</span>
                </div>
                <ChevronRight size={18} className="text-stone-300 group-hover:text-red-500" />
              </div>
              
              {disease ? (
                <div>
                  <h3 className="font-black text-lg truncate">{disease.predicted_disease}</h3>
                  <p className="text-sm text-stone-500 mt-1">
                    {disease.severity ? `${disease.severity} severity` : (disease.confidence ? `${Math.round(disease.confidence)}% conf.` : 'Scanned')}
                    {' • '}
                    {new Date(disease.scan_date).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <div className="mt-2 text-sm text-stone-500">
                  No scan yet. Take a photo to check for disease.
                </div>
              )}
            </div>

            {/* Soil Card */}
            <div 
              onClick={() => nav('/soil')}
              className="card flex flex-col p-5 cursor-pointer hover:border-amber-200 dark:hover:border-amber-900 transition-colors group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200 p-2 rounded-xl">
                    <Droplets size={20} />
                  </div>
                  <span className="font-black">Soil</span>
                </div>
                <ChevronRight size={18} className="text-stone-300 group-hover:text-amber-500" />
              </div>
              
              {soil ? (
                <div>
                  <h3 className="font-black text-lg truncate">{soil.predicted_soil_condition || 'Analysis available'}</h3>
                  <p className="text-sm text-stone-500 mt-1 line-clamp-1">
                    {soil.fertilizer_recommendation ? `Rec: ${soil.fertilizer_recommendation}` : 'Analysis completed'}
                  </p>
                  <p className="text-xs text-stone-400 mt-1">
                    {new Date(soil.analysis_date).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <div className="mt-2 text-sm text-stone-500">
                  No analysis yet. Upload a report or check soil.
                </div>
              )}
            </div>

            {/* Weather Card */}
            <div 
              onClick={() => nav('/weather')}
              className="card flex flex-col p-5 cursor-pointer hover:border-blue-200 dark:hover:border-blue-900 transition-colors group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 p-2 rounded-xl">
                    <CloudSun size={20} />
                  </div>
                  <span className="font-black">Weather</span>
                </div>
                <ChevronRight size={18} className="text-stone-300 group-hover:text-blue-500" />
              </div>
              
              {weather ? (
                <div>
                  <h3 className="font-black text-lg">
                    {weather.temperature_c != null ? `${weather.temperature_c}°C` : 'Condition recorded'}
                  </h3>
                  <p className="text-sm text-stone-500 mt-1 truncate">
                    {weather.weather_condition || 'Data available'}
                  </p>
                  <p className="text-xs text-stone-400 mt-1">
                    {new Date(weather.recorded_at).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <div className="mt-2 text-sm text-stone-500">
                  No data. Fetch current conditions for your farm.
                </div>
              )}
            </div>
          </div>
          
          {/* Quick Actions (Keep these handy) */}
          <div className="flex flex-wrap gap-3 mt-2">
            <button onClick={() => nav('/disease')} className="flex items-center gap-2 rounded-xl bg-red-700 px-5 py-2.5 text-sm font-black text-white hover:bg-red-800 transition-colors">
              <ScanLine size={16} /> Scan Leaf
            </button>
            <button onClick={() => nav('/soil')} className="flex items-center gap-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-5 py-2.5 text-sm font-black hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
              <FlaskConical size={16} /> Check Soil
            </button>
            <button onClick={() => nav('/weather')} className="flex items-center gap-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-5 py-2.5 text-sm font-black hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
              <Wind size={16} /> View Weather
            </button>
          </div>
        </div>
      )}
    </Page>
  )
}
