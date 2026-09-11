import { useState, useEffect } from 'react'
import {
  Cloud, Thermometer, Droplets, Wind, Gauge,
  MapPin, RefreshCw, AlertTriangle, Sun, CloudRain,
  CloudSnow, CloudLightning, CloudDrizzle, Cloudy
} from 'lucide-react'
import Page from '../components/Page'
import { getWeatherCurrent, getWeatherForecast, clearTokens } from '../lib/api'
import { useNavigate } from 'react-router-dom'

// Map weather condition strings to an icon component
function ConditionIcon({ condition = '', size = 28, className = '' }) {
  const c = condition.toLowerCase()
  if (c.includes('thunder')) return <CloudLightning size={size} className={className} />
  if (c.includes('snow')) return <CloudSnow size={size} className={className} />
  if (c.includes('rain') || c.includes('shower')) return <CloudRain size={size} className={className} />
  if (c.includes('drizzle')) return <CloudDrizzle size={size} className={className} />
  if (c.includes('fog')) return <Cloud size={size} className={className} />
  if (c.includes('overcast') || c.includes('cloudy')) return <Cloudy size={size} className={className} />
  if (c.includes('clear') || c.includes('sunny')) return <Sun size={size} className={className} />
  return <Cloud size={size} className={className} />
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function ForecastCard({ day }) {
  const label = day.date ? DAYS[new Date(day.date + 'T12:00:00').getDay()] : '—'
  return (
    <div className="flex flex-1 flex-col items-center gap-2 rounded-2xl bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-900/50 p-4 min-w-[80px]">
      <p className="text-xs font-black uppercase tracking-widest text-green-800 dark:text-green-400">{label}</p>
      <ConditionIcon condition={day.weather_condition || ''} size={26} className="text-green-600 dark:text-green-500" />
      <p className="text-center text-xs font-bold text-green-700 dark:text-green-300">{day.weather_condition || '—'}</p>
      <div className="mt-1 flex gap-2 text-sm font-black text-stone-800 dark:text-stone-100">
        <span>{day.temperature_max_c != null ? `${day.temperature_max_c}°` : '—'}</span>
        <span className="font-normal text-stone-400">/</span>
        <span className="font-normal text-stone-500">{day.temperature_min_c != null ? `${day.temperature_min_c}°` : '—'}</span>
      </div>
      {day.precipitation_mm != null && day.precipitation_mm > 0 && (
        <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1">{day.precipitation_mm} mm</p>
      )}
    </div>
  )
}

export default function Weather() {
  const nav = useNavigate()
  const [current, setCurrent] = useState(null)
  const [forecast, setForecast] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null) // { noLocation: bool, message: str }

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [cur, fcst] = await Promise.all([getWeatherCurrent(), getWeatherForecast()])
      setCurrent(cur)
      setForecast(fcst)
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        clearTokens(); nav('/login', { replace: true }); return
      }
      const noLocation = err.status === 400
      setError({ noLocation, message: err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <Page
      title="Weather"
      sub="Live conditions fetched from Open-Meteo for your farm's GPS location."
    >
      <div className="mb-4 flex justify-end">
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-stone-100 px-4 py-2 text-sm font-black hover:bg-stone-200 disabled:opacity-40 dark:bg-stone-800 dark:hover:bg-stone-700"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-2xl bg-amber-50 p-5 dark:bg-amber-950/30">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={20} />
            <div>
              {error.noLocation ? (
                <>
                  <p className="font-black text-amber-800 dark:text-amber-300">No farm location set</p>
                  <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                    Weather data requires your farm's GPS coordinates. Go to your{' '}
                    <strong>Profile</strong> page to add latitude and longitude, then come back here.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <MapPin size={14} className="text-amber-600" />
                    <span className="text-xs text-amber-600">{error.message}</span>
                  </div>
                </>
              ) : (
                <>
                  <p className="font-black text-amber-800 dark:text-amber-300">Could not load weather</p>
                  <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">{error.message}</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Current conditions */}
      {current && (
        <div className="rounded-3xl bg-[#1c2e1c] p-7 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-green-300">Current conditions</p>
              <h2 className="mt-1 text-3xl font-black">
                {current.temperature_c != null ? `${current.temperature_c}°C` : '—'}
              </h2>
              <p className="mt-1 text-green-100">{current.weather_condition || '—'}</p>
            </div>
            <ConditionIcon condition={current.weather_condition || ''} size={52} className="text-green-300" />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile icon={<Droplets size={18} />} label="Humidity" value={current.humidity_percent != null ? `${current.humidity_percent}%` : '—'} />
            <StatTile icon={<CloudRain size={18} />} label="Rainfall" value={current.rainfall_mm != null ? `${current.rainfall_mm} mm` : '—'} />
            <StatTile icon={<Wind size={18} />} label="Wind" value={current.wind_speed_kmh != null ? `${current.wind_speed_kmh} km/h` : '—'} />
            <StatTile icon={<Gauge size={18} />} label="Pressure" value={current.pressure_hpa != null ? `${current.pressure_hpa} hPa` : '—'} />
          </div>

          <p className="mt-4 text-xs text-green-200/50">
            Recorded at weather_id #{current.weather_id} · {new Date(current.recorded_at).toLocaleString()}
          </p>
        </div>
      )}

      {/* 5-day forecast */}
      {forecast && forecast.forecast && forecast.forecast.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-3 font-black">5-day forecast</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {forecast.forecast.map((day, i) => (
              <ForecastCard key={i} day={day} />
            ))}
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !current && (
        <div className="mt-4 rounded-3xl bg-stone-100 p-8 text-center dark:bg-stone-800">
          <p className="text-stone-400">Loading weather data…</p>
        </div>
      )}
    </Page>
  )
}

function StatTile({ icon, label, value }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <div className="flex items-center gap-1.5 text-green-300">
        {icon}
        <p className="text-xs">{label}</p>
      </div>
      <p className="mt-1 font-black">{value}</p>
    </div>
  )
}
