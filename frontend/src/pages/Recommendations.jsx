import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Leaf, FlaskConical, Droplets, Bug, Sprout,
  ShieldCheck, ShieldAlert, ShieldX, ArrowLeft, LoaderCircle,
  Database
} from 'lucide-react'
import Page from '../components/Page'
import { getRecommendations } from '../lib/api'

// ── Health banner ────────────────────────────────────────────────────────────

function HealthBanner({ status }) {
  if (!status) return null
  const cfg = {
    good:     { icon: ShieldCheck, bg: 'bg-green-50 border-green-200',  text: 'text-green-800',  label: 'Crop Health: Good',     sub: 'No critical issues detected.' },
    'at-risk':{ icon: ShieldAlert, bg: 'bg-yellow-50 border-yellow-200',text: 'text-yellow-800', label: 'Crop Health: At Risk',   sub: 'Some issues require attention.' },
    critical: { icon: ShieldX,     bg: 'bg-red-50 border-red-200',      text: 'text-red-800',    label: 'Crop Health: Critical',  sub: 'Immediate action required.' },
  }[status] || { icon: ShieldCheck, bg: 'bg-stone-50 border-stone-200', text: 'text-stone-700', label: 'Status Unknown', sub: '' }

  const Icon = cfg.icon
  return (
    <div className={`flex items-center gap-4 rounded-2xl border p-5 mb-6 ${cfg.bg}`}>
      <Icon className={cfg.text} size={36} />
      <div>
        <p className={`text-xl font-black ${cfg.text}`}>{cfg.label}</p>
        <p className={`text-sm ${cfg.text} opacity-80`}>{cfg.sub}</p>
      </div>
    </div>
  )
}

// ── Section card ─────────────────────────────────────────────────────────────

function Section({ icon: Icon, title, content, color = 'text-red-700', missing }) {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-stone-100 dark:border-stone-800">
        <Icon className={color} size={22} />
        <h3 className="font-black text-lg">{title}</h3>
      </div>
      {missing ? (
        <p className="text-stone-400 italic text-sm">{missing}</p>
      ) : (
        <p className="text-stone-700 dark:text-stone-300 leading-relaxed text-sm whitespace-pre-line">{content}</p>
      )}
    </div>
  )
}

// ── Data used transparency section (Bug 5) ────────────────────────────────────

function DataRow({ label, value }) {
  if (value == null) return null
  return (
    <div className="flex justify-between gap-3 py-1 border-b border-stone-100 dark:border-stone-800 last:border-0">
      <span className="text-xs text-stone-500">{label}</span>
      <span className="text-xs font-bold text-right">{String(value)}</span>
    </div>
  )
}

function DataSourceCard({ title, children, missing }) {
  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-700 p-4">
      <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-3">{title}</p>
      {missing ? (
        <p className="text-xs text-stone-400 italic">{missing}</p>
      ) : (
        <div className="flex flex-col">{children}</div>
      )}
    </div>
  )
}

function DataUsedSection({ dataUsed }) {
  if (!dataUsed) return null
  const d = dataUsed
  const fmt = (val, unit = '') => val != null ? `${val}${unit}` : null

  return (
    <div className="mt-8 card p-6">
      <div className="flex items-center gap-3 mb-5 pb-3 border-b border-stone-100 dark:border-stone-800">
        <Database className="text-stone-400" size={20} />
        <div>
          <h3 className="font-black">Data used for this recommendation</h3>
          <p className="text-xs text-stone-400 mt-0.5">Raw source figures — exactly what the computation read. Not modified or interpolated.</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Disease source */}
        <DataSourceCard title="Latest Disease Scan" missing={!d.disease ? 'No disease scan on record.' : null}>
          {d.disease && <>
            <DataRow label="Disease" value={d.disease.predicted_disease} />
            <DataRow label="Confidence" value={fmt(d.disease.confidence != null ? Math.round(d.disease.confidence) : null, '%')} />
            <DataRow label="Severity" value={d.disease.severity} />
            <DataRow label="Scan date" value={d.disease.scan_date ? new Date(d.disease.scan_date).toLocaleDateString() : null} />
          </>}
        </DataSourceCard>

        {/* Soil source */}
        <DataSourceCard title="Latest Soil Analysis" missing={!d.soil ? 'No soil analysis on record.' : null}>
          {d.soil && <>
            <DataRow label="pH" value={d.soil.ph} />
            <DataRow label="Nitrogen" value={fmt(d.soil.nitrogen, ' kg/ha')} />
            <DataRow label="Phosphorus" value={fmt(d.soil.phosphorus, ' kg/ha')} />
            <DataRow label="Potassium" value={fmt(d.soil.potassium, ' kg/ha')} />
            <DataRow label="Moisture" value={fmt(d.soil.moisture, '%')} />
            <DataRow label="Organic matter" value={fmt(d.soil.organic_matter, '%')} />
            <DataRow label="Condition" value={d.soil.predicted_soil_condition} />
            <DataRow label="Analysis date" value={d.soil.analysis_date ? new Date(d.soil.analysis_date).toLocaleDateString() : null} />
          </>}
        </DataSourceCard>

        {/* Weather source */}
        <DataSourceCard title="Latest Weather Record" missing={!d.weather ? 'No weather record on record.' : null}>
          {d.weather && <>
            <DataRow label="Temperature" value={fmt(d.weather.temperature_c, '°C')} />
            <DataRow label="Humidity" value={fmt(d.weather.humidity_percent, '%')} />
            <DataRow label="Rainfall" value={fmt(d.weather.rainfall_mm, ' mm')} />
            <DataRow label="Wind speed" value={fmt(d.weather.wind_speed_kmh, ' km/h')} />
            <DataRow label="Condition" value={d.weather.weather_condition} />
            <DataRow label="Recorded at" value={d.weather.recorded_at ? new Date(d.weather.recorded_at).toLocaleString() : null} />
          </>}
        </DataSourceCard>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Recommendations() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [is404, setIs404] = useState(false)
  const nav = useNavigate()

  useEffect(() => {
    getRecommendations()
      .then(d => { setData(d); setLoading(false) })
      .catch(err => {
        setLoading(false)
        if (err.status === 404) {
          setIs404(true)
        } else {
          setError(err.message || 'Failed to load recommendations.')
        }
      })
  }, [])

  const backBtn = (
    <button
      onClick={() => nav('/dashboard')}
      className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-bold hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900"
    >
      <ArrowLeft size={16} /> Back to Dashboard
    </button>
  )

  if (loading) {
    return (
      <Page title="Recommendations" action={backBtn}>
        <div className="flex justify-center py-16">
          <LoaderCircle className="animate-spin text-red-700" size={36} />
        </div>
      </Page>
    )
  }

  if (is404) {
    return (
      <Page title="Recommendations" action={backBtn}>
        <div className="card p-10 text-center max-w-xl mx-auto">
          <Sprout className="text-stone-300 mx-auto mb-4" size={48} />
          <h3 className="text-xl font-black mb-2">No data yet</h3>
          <p className="text-stone-500 mb-6">
            Recommendations are generated from your latest disease scan, soil analysis, and weather check.
            Complete at least one of these to get started.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button onClick={() => nav('/disease')} className="rounded-xl bg-red-700 px-5 py-2 text-sm font-bold text-white hover:bg-red-800">
              Run Disease Scan
            </button>
            <button onClick={() => nav('/soil')} className="rounded-xl bg-amber-600 px-5 py-2 text-sm font-bold text-white hover:bg-amber-700">
              Soil Analysis
            </button>
            <button onClick={() => nav('/weather')} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700">
              Check Weather
            </button>
          </div>
        </div>
      </Page>
    )
  }

  if (error) {
    return (
      <Page title="Recommendations" action={backBtn}>
        <div className="bg-red-50 text-red-700 p-5 rounded-2xl">{error}</div>
      </Page>
    )
  }

  const d = data

  const diseaseTreatmentContent = d.disease_treatment
    ? `Condition: ${d.disease_treatment.predicted_disease}\nSeverity: ${d.disease_treatment.severity || '—'}\n\n${d.disease_treatment.recommendation || '—'}`
    : null

  return (
    <Page
      title="Crop Recommendations"
      sub="Generated fresh from your latest scan, soil analysis, and weather data."
      action={backBtn}
    >
      {/* Health banner */}
      {d.health_status ? (
        <HealthBanner status={d.health_status} />
      ) : (
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 mb-6 text-stone-500 text-sm">
          Health status unavailable — complete a disease scan and soil analysis to enable this.
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <Section
          icon={Leaf}
          title="Disease Treatment"
          color="text-red-700"
          content={diseaseTreatmentContent}
          missing={!d.disease_treatment ? 'No disease scan on record yet. Run a scan to get treatment advice.' : undefined}
        />
        <Section
          icon={FlaskConical}
          title="Fertilizer Advice"
          color="text-amber-600"
          content={d.fertilizer_advice}
          missing={!d.fertilizer_advice ? 'No soil analysis on record yet. Run a soil test to get fertilizer advice.' : undefined}
        />
        <Section
          icon={Droplets}
          title="Irrigation Advice"
          color="text-blue-600"
          content={d.irrigation_advice}
          missing={!d.irrigation_advice ? 'No soil analysis on record yet. Run a soil test to get irrigation advice.' : undefined}
        />
        <Section
          icon={Bug}
          title="Pest Prevention"
          color="text-orange-600"
          content={d.pest_prevention}
          missing={!d.pest_prevention ? 'Pest prevention tips unavailable.' : undefined}
        />
      </div>

      {/* General Crop Management — full width */}
      <div className="mt-5">
        <Section
          icon={Sprout}
          title="General Crop Management"
          color="text-green-700"
          content={d.general_crop_management}
        />
      </div>

      {/* Data used transparency section (Bug 5) */}
      <DataUsedSection dataUsed={d.data_used} />

      <p className="mt-6 text-xs text-stone-400 text-center">
        Recommendations are generated on-demand from your latest data and are not stored. Refresh this page to update.
      </p>
    </Page>
  )
}
