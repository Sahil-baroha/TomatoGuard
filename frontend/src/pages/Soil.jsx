import { useState } from 'react'
import { UploadCloud, FileText, ClipboardList, CheckCircle2, Trash2, PlugZap } from 'lucide-react'
import Page from '../components/Page'
import { analyzeSoil, endpoints } from '../lib/api'
import { writeJSON } from '../lib/storage'

// Client-side OCR (tesseract.js) has been removed per spec — OCR is server-side only (Phase 4).
// The upload path now sends the raw image straight to the backend POST /soil/report.
// This page currently shows a not-connected state for the upload path until Phase 4 is built.

const initial = { n: '', p: '', k: '', ph: '', ec: '', oc: '' }

export default function Soil() {
  const [tab, setTab] = useState('upload')
  const [file, setFile] = useState(null)
  const [vals, setVals] = useState(initial)
  const [qs, setQs] = useState({ texture: '', drainage: '', irrigation: '', history: '', symptoms: '' })
  const [report, setReport] = useState(null)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  const remove = () => { setFile(null); setErr(''); setOk(''); setReport(null) }

  const generate = async () => {
    setErr(''); setOk('')
    const missing = ['n', 'p', 'k', 'ph'].filter(k => !vals[k])
    if (missing.length) return setErr('Please complete N, P, K and pH values before continuing.')
    if (!qs.texture || !qs.drainage || !qs.irrigation) return setErr('Please complete the questionnaire before continuing.')
    const payload = { soil_values: vals, questionnaire: qs }
    if (!endpoints.soil) {
      const local = { ...payload, status: 'ready-for-backend', date: new Date().toLocaleString() }
      writeJSON('tomatoSoilReport', local); setReport(local)
      setOk('Inputs saved. Soil-analysis service is not connected yet — no recommendation generated.')
      return
    }
    try {
      const data = await analyzeSoil(payload)
      const r = { ...payload, analysis: data, date: new Date().toLocaleString() }
      writeJSON('tomatoSoilReport', r); setReport(r); setOk('Soil analysis completed.')
    } catch { setErr('Could not reach the soil-analysis service. Please check the backend connection.') }
  }

  return (
    <Page title="Soil Analysis" sub="Upload a soil-test report (server-side OCR) or answer the questionnaire to get a fertility recommendation.">
      <div className="mb-5 flex gap-2 rounded-2xl bg-stone-100 p-1 dark:bg-stone-900">
        <button onClick={() => setTab('upload')} className={`flex-1 rounded-xl px-4 py-3 font-black ${tab === 'upload' ? 'bg-white shadow dark:bg-stone-800' : ''}`}>Upload report</button>
        <button onClick={() => setTab('q')} className={`flex-1 rounded-xl px-4 py-3 font-black ${tab === 'q' ? 'bg-white shadow dark:bg-stone-800' : ''}`}>Answer questions</button>
      </div>

      {tab === 'upload' ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="card p-6">
            {!file ? (
              <label className="grid min-h-56 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-stone-300 p-5 text-center dark:border-stone-700">
                <div>
                  <UploadCloud className="mx-auto text-red-700" size={42} />
                  <p className="mt-3 font-black">Choose soil-test report image</p>
                  <p className="mt-2 text-sm text-stone-500">JPG / PNG / WEBP</p>
                </div>
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => { setFile(e.target.files?.[0] || null); setErr(''); setOk('') }} />
              </label>
            ) : (
              <div className="rounded-2xl border border-stone-200 p-4 dark:border-stone-700">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-black">{file.name}</p>
                    <p className="text-xs text-stone-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button onClick={remove} className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-black text-red-700 dark:bg-red-950/30">
                    <Trash2 size={16} /> Remove
                  </button>
                </div>
              </div>
            )}
            {/* Upload path — server-side OCR (Phase 4). Shows not-connected state until backend is wired. */}
            <div className="mt-4 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              <PlugZap size={18} className="mt-0.5 shrink-0" />
              <span>Report OCR is processed server-side (Phase 4). Select a file and use <strong>Answer questions</strong> to generate a recommendation now, or wait until the backend soil endpoint is connected.</span>
            </div>
            <button disabled className="mt-4 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-stone-300 py-3 font-black text-stone-600 dark:bg-stone-700 dark:text-stone-400">
              <FileText size={18} /> Send to backend (Phase 4)
            </button>
          </div>
          <Values vals={vals} setVals={setVals} />
        </div>
      ) : (
        <Questionnaire qs={qs} setQs={setQs} />
      )}

      {err && <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700 dark:bg-red-950/30 dark:text-red-300">{err}</p>}
      {ok && <p className="mt-5 rounded-xl bg-green-50 p-4 text-sm font-bold text-green-700 dark:bg-green-950/30 dark:text-green-300">{ok}</p>}
      <div className="mt-5 flex justify-end">
        <button onClick={generate} className="flex items-center gap-2 rounded-xl bg-[#421c15] px-6 py-3 font-black text-white">
          <ClipboardList size={18} /> Continue to analysis
        </button>
      </div>
      {report && (
        <div className="mt-5 card p-7">
          <div className="flex gap-3">
            {endpoints.soil ? <CheckCircle2 className="text-green-700" /> : <PlugZap className="text-amber-700" />}
            <div>
              <h2 className="text-2xl font-black">{endpoints.soil ? 'Soil result received' : 'Inputs ready for backend'}</h2>
              {report.analysis ? (
                <pre className="mt-4 overflow-auto rounded-2xl bg-stone-100 p-4 text-xs dark:bg-stone-800">{JSON.stringify(report.analysis, null, 2)}</pre>
              ) : (
                <p className="mt-2 text-stone-500">No fertility class, nutrient recommendation or fertilizer dose is invented by the frontend. Those outputs will appear only after the soil backend (Phase 4) is connected.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </Page>
  )
}

function Values({ vals, setVals }) {
  return (
    <div className="card p-6">
      <h2 className="text-xl font-black">Review / enter report values</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {[['n', 'Nitrogen (N)'], ['p', 'Phosphorus (P)'], ['k', 'Potassium (K)'], ['ph', 'pH'], ['ec', 'EC'], ['oc', 'Organic Carbon']].map(([k, l]) => (
          <label key={k}>
            <span className="mb-2 block text-sm font-bold">{l}</span>
            <input value={vals[k]} onChange={e => setVals({ ...vals, [k]: e.target.value })} className="input" placeholder="Enter value" />
          </label>
        ))}
      </div>
    </div>
  )
}

function Questionnaire({ qs, setQs }) {
  return (
    <div className="card p-6">
      <h2 className="text-xl font-black">Field questionnaire</h2>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <Select label="Soil texture" value={qs.texture} onChange={v => setQs({ ...qs, texture: v })} options={['', 'Sandy', 'Sandy loam', 'Loamy', 'Clay loam', 'Clay']} />
        <Select label="Drainage" value={qs.drainage} onChange={v => setQs({ ...qs, drainage: v })} options={['', 'Good', 'Moderate', 'Poor']} />
        <Select label="Irrigation method" value={qs.irrigation} onChange={v => setQs({ ...qs, irrigation: v })} options={['', 'Drip', 'Furrow', 'Sprinkler', 'Manual']} />
        <label>
          <span className="mb-2 block text-sm font-bold">Previous crop / field history</span>
          <input className="input" value={qs.history} onChange={e => setQs({ ...qs, history: e.target.value })} />
        </label>
        <label className="md:col-span-2">
          <span className="mb-2 block text-sm font-bold">Current observations</span>
          <textarea className="input min-h-28" value={qs.symptoms} onChange={e => setQs({ ...qs, symptoms: e.target.value })} />
        </label>
      </div>
    </div>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold">{label}</span>
      <select className="input" value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o} value={o}>{o || 'Select'}</option>)}
      </select>
    </label>
  )
}
