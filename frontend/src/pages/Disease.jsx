import { useState, useEffect } from 'react'
import { UploadCloud, ScanLine, AlertTriangle, CheckCircle2, Trash2, Leaf, Clock } from 'lucide-react'
import Page from '../components/Page'
import { analyzeDisease, getDiseaseHistory, clearTokens } from '../lib/api'
import { useNavigate } from 'react-router-dom'

// ── Client-side leaf heuristic (green-pixel check) — unchanged from Phase 2 ──
async function imageLooksLeafLike(file) {
  const dataUrl = await new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result)
    r.onerror = rej
    r.readAsDataURL(file)
  })
  const img = new Image()
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl })
  const c = document.createElement('canvas')
  const s = 150
  c.width = s; c.height = s
  const ctx = c.getContext('2d')
  ctx.drawImage(img, 0, 0, s, s)
  const d = ctx.getImageData(0, 0, s, s).data
  let green = 0, pixels = 0
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3]
    if (a < 50) continue
    pixels++
    if (g > r * 1.05 && g > b * 1.08 && g > 55) green++
  }
  return { ok: pixels > 0 && green / pixels >= 0.10, dataUrl }
}

export default function Disease() {
  const nav = useNavigate()
  const [preview, setPreview] = useState(null)
  const [file, setFile] = useState(null)
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState(null)      // null = not yet loaded
  const [historyErr, setHistoryErr] = useState('')

  // Fetch history on mount
  useEffect(() => {
    let cancelled = false
    getDiseaseHistory()
      .then(data => { if (!cancelled) setHistory(data) })
      .catch(err => {
        if (cancelled) return
        if (err.status === 401 || err.status === 403) {
          clearTokens(); nav('/login', { replace: true })
          return
        }
        setHistoryErr('Could not load scan history.')
      })
    return () => { cancelled = true }
  }, [result])  // re-fetch after each successful new scan

  const reset = () => { setPreview(null); setFile(null); setMsg(null); setResult(null) }

  const choose = async e => {
    const f = e.target.files?.[0]
    if (!f) return
    reset()
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      setMsg({ ok: false, text: 'Please choose a valid image file (JPG, PNG or WEBP).' })
      return
    }
    if (f.size > 8 * 1024 * 1024) {
      setMsg({ ok: false, text: 'Please choose an image smaller than 8 MB.' })
      return
    }
    setLoading(true)
    try {
      const check = await imageLooksLeafLike(f)
      if (!check.ok) {
        setMsg({ ok: false, text: 'We could not identify a suitable leaf image. Please upload a clear tomato leaf photo.' })
        return
      }
      setPreview(check.dataUrl)
      setFile(f)
      setMsg({ ok: true, text: 'Image ready for analysis.' })
    } catch {
      setMsg({ ok: false, text: 'This image could not be read. Please try another image.' })
    } finally {
      setLoading(false)
    }
  }

  const run = async () => {
    if (!file) return
    setLoading(true)
    setResult(null)
    try {
      const data = await analyzeDisease(file)
      // Normalize to the spec's response fields: scan_id, predicted_disease, confidence, description, immediate_action
      setResult(data)
      setMsg({ ok: true, text: 'Analysis complete — result saved.' })
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        clearTokens(); nav('/login', { replace: true }); return
      }
      setMsg({ ok: false, text: err.message || 'Analysis failed. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Page
      title="Leaf Disease Analysis"
      sub="Upload a clear tomato leaf image. The result is uploaded to secure storage and saved to your history."
    >
      <div className="grid gap-5 lg:grid-cols-2">
        {/* ── Left: upload panel ── */}
        <div className="card p-6">
          {!preview ? (
            <label className="grid min-h-80 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-red-200 bg-red-50/50 p-5 text-center dark:border-red-900 dark:bg-red-950/20">
              <div>
                <UploadCloud className="mx-auto text-red-700" size={46} />
                <p className="mt-4 font-black">Choose leaf image</p>
                <p className="mt-2 text-sm text-stone-500">JPG / PNG / WEBP · maximum 8 MB</p>
              </div>
              {/* capture="environment" — prefer rear camera on mobile (Phase 2 requirement) */}
              <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={choose} className="hidden" />
            </label>
          ) : (
            <div>
              <div className="relative grid min-h-80 place-items-center rounded-2xl bg-stone-100 p-4 dark:bg-stone-800">
                <img src={preview} className="max-h-72 rounded-2xl object-contain" alt="Leaf preview" />
                <button
                  onClick={reset}
                  className="absolute right-3 top-3 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-black text-red-700 shadow dark:bg-stone-900"
                >
                  <Trash2 size={16} /> Remove
                </button>
              </div>
            </div>
          )}

          {msg && (
            <div className={`mt-4 flex gap-3 rounded-xl p-4 text-sm ${msg.ok ? 'bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300' : 'bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300'}`}>
              {msg.ok ? <CheckCircle2 size={19} /> : <AlertTriangle size={19} />}
              <p>{msg.text}</p>
            </div>
          )}

          <button
            onClick={run}
            disabled={!file || loading}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 py-3 font-black text-white disabled:opacity-40"
          >
            <ScanLine size={19} />
            {loading ? 'Processing…' : 'Analyze image'}
          </button>
        </div>

        {/* ── Right: result panel ── */}
        <div className="rounded-3xl bg-[#421c15] p-7 text-white">
          {result ? (
            <>
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <CheckCircle2 className="mt-1 shrink-0 text-green-300" size={28} />
                {result.severity && (
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest ${
                    result.severity === 'High'
                      ? 'bg-red-600 text-white'
                      : result.severity === 'Moderate'
                      ? 'bg-yellow-500 text-stone-900'
                      : 'bg-green-600 text-white'
                  }`}>
                    {result.severity} severity
                  </span>
                )}
              </div>

              <p className="mt-4 text-xs font-black uppercase tracking-[.16em] text-red-300">Model result</p>
              <h2 className="mt-1 text-2xl font-black leading-tight">{result.predicted_disease}</h2>

              {/* Confidence + warning */}
              {result.confidence !== null && result.confidence !== undefined && (
                <p className="mt-2 text-sm">
                  Confidence: <b>{Math.round(result.confidence)}%</b>
                </p>
              )}
              {result.low_confidence_warning && (
                <div className="mt-3 flex gap-2 rounded-xl bg-yellow-500/20 p-3 text-yellow-200">
                  <AlertTriangle size={17} className="mt-0.5 shrink-0" />
                  <p className="text-xs leading-relaxed">
                    <b>Low confidence detected.</b> For a more accurate result, please retake the photo in bright, natural daylight with the leaf filling the frame and in sharp focus.
                  </p>
                </div>
              )}

              {/* Description */}
              {result.description && (
                <div className="mt-5 rounded-2xl bg-white/10 p-4">
                  <p className="mb-1 text-xs font-black uppercase tracking-widest text-red-300">About this disease</p>
                  <p className="text-sm leading-7 text-red-50">{result.description}</p>
                </div>
              )}

              {/* Treatment plan */}
              {result.treatment_plan && (
                <div className="mt-3 rounded-2xl bg-white/10 p-4">
                  <p className="mb-1 text-xs font-black uppercase tracking-widest text-red-300">Treatment & action plan</p>
                  <p className="text-sm leading-7 text-red-50">{result.treatment_plan}</p>
                </div>
              )}

              {/* Prevention tips */}
              {result.prevention_tips && (
                <div className="mt-3 rounded-2xl bg-white/10 p-4">
                  <p className="mb-1 text-xs font-black uppercase tracking-widest text-red-300">Prevention tips</p>
                  <p className="text-sm leading-7 text-red-50">{result.prevention_tips}</p>
                </div>
              )}

              <p className="mt-5 text-xs text-red-200/50">Scan #{result.scan_id} · saved to your history</p>
            </>
          ) : (
            <div className="grid h-full min-h-80 place-items-center text-center">
              <div>
                <Leaf className="mx-auto text-red-300" size={50} />
                <h2 className="mt-4 text-2xl font-black">No analysis yet</h2>
                <p className="mt-2 max-w-sm text-red-50/80">
                  Upload a leaf image to receive the disease detection result.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Scan history ── */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-black">Scan history</h2>
        {historyErr ? (
          <p className="text-sm text-red-700">{historyErr}</p>
        ) : history === null ? (
          <p className="text-sm text-stone-400">Loading history…</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-stone-500">No scans yet — your completed analyses will appear here.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {history.map(item => (
              <div key={item.scan_id} className="card flex flex-col gap-2 p-5">
                <div className="flex items-center gap-2">
                  <Leaf size={16} className="text-green-600 shrink-0" />
                  <span className="font-bold text-sm leading-tight">{item.predicted_disease}</span>
                </div>
                {item.confidence !== null && item.confidence !== undefined && (
                  <span className="text-xs text-stone-500">Confidence: {Math.round(item.confidence)}%</span>
                )}
                <div className="flex items-center gap-1 text-xs text-stone-400 mt-1">
                  <Clock size={12} />
                  {new Date(item.scan_date).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Page>
  )
}
