import { useState, useEffect } from 'react'
import {
  UploadCloud, FileText, ClipboardList, CheckCircle2, Trash2,
  AlertTriangle, Leaf, FlaskConical, PlusCircle, LoaderCircle
} from 'lucide-react'
import Page from '../components/Page'
import {
  uploadSoilReport, confirmSoilReport, submitSoilQuestionnaire, getSoilLatest, clearTokens,
} from '../lib/api'
import { useNavigate } from 'react-router-dom'

// ── Shared analysis result panel ──────────────────────────────────────────────

function AnalysisResultPanel({ analysis, emptyMessage }) {
  return (
    <div className="rounded-3xl bg-[#1c2e1c] p-7 text-white">
      {analysis ? (
        <>
          <div className="flex items-center gap-3">
            <FlaskConical className="text-green-300" size={32} />
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-green-300">Soil condition</p>
              <h2 className="text-2xl font-black leading-tight">{analysis.predicted_soil_condition || 'Assessed'}</h2>
            </div>
          </div>
          {(analysis.ph != null || analysis.nitrogen != null || analysis.phosphorus != null || analysis.potassium != null) && (
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[['pH', analysis.ph], ['N (kg/ha)', analysis.nitrogen], ['P (kg/ha)', analysis.phosphorus], ['K (kg/ha)', analysis.potassium]].map(([label, val]) =>
                val != null ? (
                  <div key={label} className="rounded-2xl bg-white/10 p-3">
                    <p className="text-xs text-green-200">{label}</p>
                    <p className="text-lg font-black">{val}</p>
                  </div>
                ) : null
              )}
            </div>
          )}
          {analysis.fertilizer_recommendation && (
            <div className="mt-5 rounded-2xl bg-white/10 p-5">
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-green-300">Fertiliser recommendation</p>
              <p className="leading-7 text-green-50">{analysis.fertilizer_recommendation}</p>
            </div>
          )}
          {analysis.irrigation_recommendation && (
            <div className="mt-4 rounded-2xl bg-white/10 p-5">
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-green-300">Irrigation recommendation</p>
              <p className="leading-7 text-green-50">{analysis.irrigation_recommendation}</p>
            </div>
          )}
          <p className="mt-4 text-xs text-green-200/50">Analysis #{analysis.analysis_id} · saved</p>
        </>
      ) : (
        <div className="grid h-full min-h-64 place-items-center text-center">
          <div>
            <Leaf className="mx-auto text-green-300" size={48} />
            <h2 className="mt-4 text-xl font-black">No analysis yet</h2>
            <p className="mt-2 max-w-xs text-green-50/70">{emptyMessage}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── UPLOAD TAB ────────────────────────────────────────────────────────────────

function UploadTab() {
  const nav = useNavigate()
  const [step, setStep] = useState('idle')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [reportId, setReportId] = useState(null)
  const [rawOcr, setRawOcr] = useState('')
  const [fields, setFields] = useState({ ph: '', nitrogen: '', phosphorus: '', potassium: '', moisture: '', organic_matter: '' })
  const [analysis, setAnalysis] = useState(null)
  const [msg, setMsg] = useState(null)

  const resetAll = () => { setStep('idle'); setFile(null); setReportId(null); setRawOcr(''); setFields({ ph: '', nitrogen: '', phosphorus: '', potassium: '', moisture: '', organic_matter: '' }); setAnalysis(null); setMsg(null) }

  const handleFile = e => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      setMsg({ ok: false, text: 'Only JPG, PNG, or WEBP files are accepted.' }); return
    }
    if (f.size > 8 * 1024 * 1024) {
      setMsg({ ok: false, text: 'File must be under 8 MB.' }); return
    }
    setFile(f); setMsg(null)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true); setMsg(null)
    try {
      const data = await uploadSoilReport(file)
      setReportId(data.soil_report_id)
      setRawOcr(data.raw_ocr_text || '')
      setFields({
        ph:             data.ph            != null ? String(data.ph)            : '',
        nitrogen:       data.nitrogen      != null ? String(data.nitrogen)      : '',
        phosphorus:     data.phosphorus    != null ? String(data.phosphorus)    : '',
        potassium:      data.potassium     != null ? String(data.potassium)     : '',
        moisture:       data.moisture      != null ? String(data.moisture)      : '',
        organic_matter: data.organic_matter != null ? String(data.organic_matter) : '',
      })
      setStep('ocr_done')
      setMsg({ ok: true, text: 'Report uploaded and OCR complete. Review the values below, correct any errors, then confirm.' })
    } catch (err) {
      if (err.status === 401 || err.status === 403) { clearTokens(); nav('/login', { replace: true }); return }
      setMsg({ ok: false, text: err.message || 'Upload failed. Please try again.' })
    } finally { setUploading(false) }
  }

  const handleConfirm = async () => {
    if (!reportId) return
    setConfirming(true); setMsg(null)
    try {
      const payload = {
        soil_report_id: reportId,
        ph:             fields.ph             ? parseFloat(fields.ph)             : null,
        nitrogen:       fields.nitrogen       ? parseFloat(fields.nitrogen)       : null,
        phosphorus:     fields.phosphorus     ? parseFloat(fields.phosphorus)     : null,
        potassium:      fields.potassium      ? parseFloat(fields.potassium)      : null,
        moisture:       fields.moisture       ? parseFloat(fields.moisture)       : null,
        organic_matter: fields.organic_matter ? parseFloat(fields.organic_matter) : null,
      }
      const data = await confirmSoilReport(payload)
      setAnalysis(data); setStep('confirmed')
      setMsg({ ok: true, text: 'Analysis saved successfully.' })
    } catch (err) {
      if (err.status === 401 || err.status === 403) { clearTokens(); nav('/login', { replace: true }); return }
      setMsg({ ok: false, text: err.message || 'Confirmation failed. Please try again.' })
    } finally { setConfirming(false) }
  }

  const FIELD_LABELS = [
    ['ph', 'pH'], ['nitrogen', 'Nitrogen (N)'], ['phosphorus', 'Phosphorus (P)'],
    ['potassium', 'Potassium (K)'], ['moisture', 'Moisture (%)'], ['organic_matter', 'Organic Matter (%)'],
  ]

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="card p-6 flex flex-col gap-4">
        {step === 'idle' && (
          <>
            {!file ? (
              <label className="grid min-h-56 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-stone-300 p-5 text-center dark:border-stone-700">
                <div>
                  <UploadCloud className="mx-auto text-red-700" size={42} />
                  <p className="mt-3 font-black">Choose soil-test report image</p>
                  <p className="mt-2 text-sm text-stone-500">JPG / PNG / WEBP · max 8 MB</p>
                </div>
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFile} />
              </label>
            ) : (
              <div className="rounded-2xl border border-stone-200 p-4 dark:border-stone-700">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-black">{file.name}</p>
                    <p className="text-xs text-stone-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button onClick={resetAll} className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-black text-red-700 dark:bg-red-950/30">
                    <Trash2 size={16} /> Remove
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 py-3 font-black text-white disabled:opacity-40"
            >
              <FileText size={18} />
              {uploading ? 'Uploading & scanning…' : 'Upload & run OCR'}
            </button>
          </>
        )}

        {step === 'ocr_done' && (
          <>
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg">Review OCR values</h3>
              <button onClick={resetAll} className="text-xs text-stone-400 hover:text-red-700">Start over</button>
            </div>
            <p className="text-sm text-stone-500">OCR extracted these values. Correct any errors before confirming.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {FIELD_LABELS.map(([k, label]) => (
                <label key={k}>
                  <span className="mb-1 block text-xs font-bold">{label}</span>
                  <input
                    value={fields[k]}
                    onChange={e => setFields({ ...fields, [k]: e.target.value })}
                    className="input"
                    placeholder="—"
                    type="number"
                    step="any"
                  />
                </label>
              ))}
            </div>
            {rawOcr && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-stone-400">View raw OCR text</summary>
                <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-stone-100 p-3 text-xs dark:bg-stone-800">{rawOcr}</pre>
              </details>
            )}
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#421c15] py-3 font-black text-white disabled:opacity-40"
            >
              <ClipboardList size={18} />
              {confirming ? 'Saving analysis…' : 'Confirm & get analysis'}
            </button>
          </>
        )}

        {step === 'confirmed' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-green-600" size={24} />
              <span className="font-black">Analysis saved (#{analysis?.analysis_id})</span>
            </div>
            <button onClick={resetAll} className="text-sm text-stone-400 hover:text-red-700">Upload another report</button>
          </div>
        )}

        {msg && (
          <div className={`flex gap-3 rounded-xl p-4 text-sm ${msg.ok ? 'bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300' : 'bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300'}`}>
            {msg.ok ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <p>{msg.text}</p>
          </div>
        )}
      </div>

      <AnalysisResultPanel analysis={analysis} emptyMessage="Upload a report and confirm values to see the analysis here." />
    </div>
  )
}

// ── QUESTIONNAIRE TAB ─────────────────────────────────────────────────────────

const QS_FIELDS = [
  { key: 'crop_stage',         label: 'Crop stage',         type: 'select', options: ['', 'Seedling / Transplanting', 'Vegetative', 'Flowering', 'Fruiting', 'Harvest'] },
  { key: 'previous_crop',      label: 'Previous crop',      type: 'text', placeholder: 'e.g. Onion, Wheat, Tomato…' },
  { key: 'irrigation_type',    label: 'Irrigation method',  type: 'select', options: ['', 'Drip', 'Furrow', 'Sprinkler', 'Manual'] },
  { key: 'fertilizer_used',    label: 'Fertiliser(s) used', type: 'text', placeholder: 'e.g. Urea, DAP, Compost…' },
  { key: 'soil_color',         label: 'Soil colour',        type: 'select', options: ['', 'Black / Dark', 'Red / Laterite', 'Sandy / Light', 'Brown / Loamy'] },
  { key: 'drainage_condition', label: 'Drainage',           type: 'select', options: ['', 'Good', 'Moderate', 'Poor'] },
]

function QuestionnaireTab() {
  const nav = useNavigate()
  const initial = { crop_stage: '', previous_crop: '', irrigation_type: '', fertilizer_used: '', soil_color: '', drainage_condition: '' }
  const [vals, setVals] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [msg, setMsg] = useState(null)

  const submit = async () => {
    setLoading(true); setMsg(null); setAnalysis(null)
    try {
      const payload = Object.fromEntries(Object.entries(vals).map(([k, v]) => [k, v || null]))
      const data = await submitSoilQuestionnaire(payload)
      setAnalysis(data)
      setMsg({ ok: true, text: `Questionnaire submitted. Analysis #${data.analysis_id} saved.` })
    } catch (err) {
      if (err.status === 401 || err.status === 403) { clearTokens(); nav('/login', { replace: true }); return }
      setMsg({ ok: false, text: err.message || 'Submission failed. Please try again.' })
    } finally { setLoading(false) }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="card p-6 flex flex-col gap-4">
        <h2 className="text-xl font-black">Field questionnaire</h2>
        <p className="text-sm text-stone-500">Answer the six questions — no lab test needed. Nutrient readings will be null in the saved row.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {QS_FIELDS.map(f => (
            <label key={f.key}>
              <span className="mb-1 block text-sm font-bold">{f.label}</span>
              {f.type === 'select' ? (
                <select className="input" value={vals[f.key]} onChange={e => setVals({ ...vals, [f.key]: e.target.value })}>
                  {f.options.map(o => <option key={o} value={o}>{o || 'Select…'}</option>)}
                </select>
              ) : (
                <input className="input" value={vals[f.key]} placeholder={f.placeholder} onChange={e => setVals({ ...vals, [f.key]: e.target.value })} />
              )}
            </label>
          ))}
        </div>
        {msg && (
          <div className={`flex gap-3 rounded-xl p-4 text-sm ${msg.ok ? 'bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300' : 'bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300'}`}>
            {msg.ok ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <p>{msg.text}</p>
          </div>
        )}
        <button
          onClick={submit}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#421c15] py-3 font-black text-white disabled:opacity-40"
        >
          <ClipboardList size={18} />
          {loading ? 'Submitting…' : 'Submit questionnaire'}
        </button>
      </div>
      <AnalysisResultPanel analysis={analysis} emptyMessage="Submit the questionnaire to receive a rule-based recommendation here." />
    </div>
  )
}

// ── Latest analysis read-only view (Bug 3) ────────────────────────────────────

function LatestView({ latest, onRunNew }) {
  return (
    <div className="flex flex-col gap-5">
      {/* Summary panel (reuse the dark card) */}
      <AnalysisResultPanel analysis={latest} emptyMessage="" />

      {/* "Run new analysis" action — clearly separate */}
      <div className="card p-5 flex items-center justify-between gap-4">
        <div>
          <p className="font-black">Run a new analysis</p>
          <p className="text-sm text-stone-500">Upload a new report image or fill out the questionnaire.</p>
        </div>
        <button
          onClick={onRunNew}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-red-700 px-5 py-3 font-black text-white"
        >
          <PlusCircle size={18} /> New analysis
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Soil() {
  const nav = useNavigate()
  // 'loading' → check for latest; 'latest' → show existing; 'new' → show upload/q tabs
  const [view, setView] = useState('loading')
  const [latest, setLatest] = useState(null)
  const [tab, setTab] = useState('upload')

  useEffect(() => {
    getSoilLatest()
      .then(data => {
        if (data && data.analysis_id) {
          setLatest(data)
          setView('latest')
        } else {
          setView('new')
        }
      })
      .catch(err => {
        if (err.status === 401 || err.status === 403) {
          clearTokens(); nav('/login', { replace: true }); return
        }
        // 404 or no data → go straight to new analysis flow
        setView('new')
      })
  }, [])

  if (view === 'loading') {
    return (
      <Page title="Soil Analysis" sub="Loading your latest soil analysis…">
        <div className="flex justify-center py-16">
          <LoaderCircle className="animate-spin text-red-700" size={36} />
        </div>
      </Page>
    )
  }

  if (view === 'latest') {
    return (
      <Page
        title="Soil Analysis"
        sub="Your latest soil analysis result. Run a new analysis at any time."
      >
        <LatestView latest={latest} onRunNew={() => setView('new')} />
      </Page>
    )
  }

  // view === 'new': show upload/questionnaire tabs
  return (
    <Page
      title="Soil Analysis"
      sub="Upload a soil-test report image for server-side OCR, or answer the questionnaire for a quick rule-based assessment."
    >
      {/* Back to latest (only if one exists) */}
      {latest && (
        <button
          onClick={() => setView('latest')}
          className="mb-4 flex items-center gap-2 text-sm font-bold text-stone-500 hover:text-red-700"
        >
          ← Back to latest result
        </button>
      )}

      <div className="mb-5 flex gap-2 rounded-2xl bg-stone-100 p-1 dark:bg-stone-900">
        <button
          onClick={() => setTab('upload')}
          className={`flex-1 rounded-xl px-4 py-3 font-black ${tab === 'upload' ? 'bg-white shadow dark:bg-stone-800' : ''}`}
        >
          Upload report
        </button>
        <button
          onClick={() => setTab('q')}
          className={`flex-1 rounded-xl px-4 py-3 font-black ${tab === 'q' ? 'bg-white shadow dark:bg-stone-800' : ''}`}
        >
          Answer questions
        </button>
      </div>

      {tab === 'upload' ? <UploadTab /> : <QuestionnaireTab />}
    </Page>
  )
}
