// Base URL for the TomatoGuard backend (farmer + admin routes).
// Must be set in .env as VITE_BACKEND_API_URL=http://localhost:8000
const BACKEND = import.meta.env.VITE_BACKEND_API_URL || ''

// Legacy per-service env vars (kept for backward compat with existing Disease/Soil/Weather pages)
export const endpoints = {
  disease: import.meta.env.VITE_DISEASE_API_URL || '',
  soil:    import.meta.env.VITE_SOIL_API_URL    || '',
  weather: import.meta.env.VITE_WEATHER_API_URL  || '',
}

// ── Token helpers ────────────────────────────────────────────────────────────
// Farmer tokens stored under 'tomatoTokens' — never shared with admin tokens.

export function getTokens() {
  try { return JSON.parse(localStorage.getItem('tomatoTokens') || 'null') } catch { return null }
}

export function setTokens(tokens) {
  localStorage.setItem('tomatoTokens', JSON.stringify(tokens))
}

export function clearTokens() {
  localStorage.removeItem('tomatoTokens')
  localStorage.removeItem('tomatoUser')
}

export function isLoggedIn() {
  return !!getTokens()?.access_token
}

// ── Core fetch helper ────────────────────────────────────────────────────────

async function apiFetch(path, options = {}, requiresAuth = true) {
  if (!BACKEND) throw Object.assign(new Error('SERVICE_NOT_CONFIGURED'), { status: 0 })

  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }

  if (requiresAuth) {
    const tokens = getTokens()
    if (!tokens?.access_token) throw Object.assign(new Error('Not authenticated'), { status: 401 })
    headers['Authorization'] = `Bearer ${tokens.access_token}`
  }

  const res = await fetch(`${BACKEND}${path}`, { ...options, headers })

  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try { const j = await res.json(); detail = j.detail || JSON.stringify(j) } catch {}
    const err = Object.assign(new Error(detail), { status: res.status })
    throw err
  }

  return res.json()
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function login(email, password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }, false)
  setTokens({ access_token: data.access_token, refresh_token: data.refresh_token })
  return data
}

export async function signup(payload) {
  const data = await apiFetch('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, false)
  setTokens({ access_token: data.access_token, refresh_token: data.refresh_token })
  return data
}

export async function getMe() {
  return apiFetch('/auth/me')
}

// ── Dashboard ────────────────────────────────────────────────────────────────

export async function getDashboardSummary() {
  return apiFetch('/dashboard/summary')
}

// ── Legacy service helpers (Disease/Soil/Weather pages unchanged) ────────────

async function legacyRequest(url, options = {}) {
  if (!url) throw new Error('SERVICE_NOT_CONFIGURED')
  const res = await fetch(url, options)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Request failed (${res.status})`)
  }
  return res.json()
}

// ── Disease (Phase 3) ────────────────────────────────────────────────────────
// Calls the real backend endpoints — no longer uses the legacy VITE_DISEASE_API_URL.

export async function analyzeDisease(file) {
  if (!BACKEND) throw Object.assign(new Error('SERVICE_NOT_CONFIGURED'), { status: 0 })
  const tokens = getTokens()
  if (!tokens?.access_token) throw Object.assign(new Error('Not authenticated'), { status: 401 })

  // Multipart upload — do NOT set Content-Type; the browser sets it with the boundary.
  const body = new FormData()
  body.append('image', file)

  const res = await fetch(`${BACKEND}/disease/analyze`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    body,
  })
  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try { const j = await res.json(); detail = j.detail || JSON.stringify(j) } catch {}
    throw Object.assign(new Error(detail), { status: res.status })
  }
  return res.json()
}

export async function getDiseaseHistory() {
  return apiFetch('/disease/history')
}

// ── Soil (Phase 4) ───────────────────────────────────────────────────────────
// POST /soil/report — multipart image upload → Cloudinary + OCR → parsed fields (no analysis yet)
export async function uploadSoilReport(file) {
  if (!BACKEND) throw Object.assign(new Error('SERVICE_NOT_CONFIGURED'), { status: 0 })
  const tokens = getTokens()
  if (!tokens?.access_token) throw Object.assign(new Error('Not authenticated'), { status: 401 })

  const body = new FormData()
  body.append('image', file)

  const res = await fetch(`${BACKEND}/soil/report`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    body,
  })
  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try { const j = await res.json(); detail = j.detail || JSON.stringify(j) } catch {}
    throw Object.assign(new Error(detail), { status: res.status })
  }
  return res.json()
}

// POST /soil/report/confirm — farmer confirms/corrects OCR values → returns analysis
export async function confirmSoilReport(payload) {
  return apiFetch('/soil/report/confirm', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// POST /soil/questionnaire — qualitative path
export async function submitSoilQuestionnaire(payload) {
  return apiFetch('/soil/questionnaire', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// GET /soil/latest
export async function getSoilLatest() {
  return apiFetch('/soil/latest')
}

// ── Profile update (PATCH /auth/profile) ────────────────────────────────────
export async function patchProfile(payload) {
  return apiFetch('/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

// ── Weather (Phase 5) ────────────────────────────────────────────────────────
// GET /weather/current — inserts a weather_records row, returns it.
export async function getWeatherCurrent() {
  return apiFetch('/weather/current')
}

// GET /weather/forecast — 5-day daily forecast, does NOT write to DB.
export async function getWeatherForecast() {
  return apiFetch('/weather/forecast')
}

// ── Change Password (POST /auth/change-password) ─────────────────────────────
export async function changePassword(payload) {
  return apiFetch('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// ── History (GET /history) ───────────────────────────────────────────────────
export async function getHistory(type = null, from = null, to = null) {
  const params = new URLSearchParams()
  if (type) params.append('type', type)
  if (from) params.append('from', from)
  if (to) params.append('to', to)
  const qs = params.toString()
  return apiFetch(`/history${qs ? '?' + qs : ''}`)
}
