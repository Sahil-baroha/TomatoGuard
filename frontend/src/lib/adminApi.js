// Admin API — all calls go to VITE_BACKEND_API_URL.
// Never exposed to Cloudinary or Neon directly.
// Shows explicit 'service not connected' if the env var is unset.

const BASE = import.meta.env.VITE_BACKEND_API_URL || ''

const ADMIN_KEY = 'tomatoAdminTokens'

export function getAdminTokens() {
  try { return JSON.parse(localStorage.getItem(ADMIN_KEY)) } catch { return null }
}

export function setAdminTokens(tokens) {
  localStorage.setItem(ADMIN_KEY, JSON.stringify(tokens))
}

export function clearAdminTokens() {
  localStorage.removeItem(ADMIN_KEY)
}

export function isAdminLoggedIn() {
  const t = getAdminTokens()
  return !!(t && t.access_token)
}

async function adminRequest(path, options = {}) {
  if (!BASE) throw new Error('SERVICE_NOT_CONFIGURED')
  const tokens = getAdminTokens()
  const headers = {
    'Content-Type': 'application/json',
    ...(tokens ? { Authorization: `Bearer ${tokens.access_token}` } : {}),
    ...(options.headers || {}),
  }
  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  if (res.status === 401 || res.status === 403) {
    const body = await res.json().catch(() => ({}))
    throw Object.assign(new Error(body.detail || 'Unauthorized'), { status: res.status })
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Request failed (${res.status})`)
  }
  return res.json()
}

// Auth
export async function adminLogin(email, password) {
  if (!BASE) throw new Error('SERVICE_NOT_CONFIGURED')
  const res = await fetch(`${BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || 'Login failed')
  }
  return res.json()
}

// Farmers
export async function getFarmers({ search = '', offset = 0, limit = 20 } = {}) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  params.set('offset', String(offset))
  params.set('limit', String(limit))
  return adminRequest(`/admin/farmers?${params}`)
}

export async function getFarmerDetail(userId) {
  return adminRequest(`/admin/farmers/${userId}`)
}

export async function setFarmerStatus(userId, isActive) {
  return adminRequest(`/admin/farmers/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: isActive }),
  })
}

// Diseases
export async function getDiseases() {
  return adminRequest('/admin/diseases')
}

export async function createDisease(data) {
  return adminRequest('/admin/diseases', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateDisease(diseaseId, data) {
  return adminRequest(`/admin/diseases/${diseaseId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}
