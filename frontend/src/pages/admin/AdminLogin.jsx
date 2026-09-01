import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminLogin, setAdminTokens } from '../../lib/adminApi'

const BASE = import.meta.env.VITE_BACKEND_API_URL || ''

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!BASE) {
      setError('Backend service not configured — set VITE_BACKEND_API_URL')
      return
    }
    setLoading(true)
    try {
      const tokens = await adminLogin(email, password)
      setAdminTokens(tokens)
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#1a1a2e',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        background: '#16213e',
        border: '1px solid #0f3460',
        borderRadius: 12,
        padding: '40px 36px',
        width: '100%',
        maxWidth: 400,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        {/* Header — visually distinct from the farmer login */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: 12,
            background: '#0f3460',
            marginBottom: 16,
          }}>
            <span style={{ fontSize: 26 }}>🛡️</span>
          </div>
          <h1 style={{ color: '#e2e8f0', fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>
            TomatoGuard Admin
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
            Administration panel — authorised personnel only
          </p>
        </div>

        {!BASE && (
          <div style={{
            background: '#2d1515',
            border: '1px solid #7f1d1d',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 20,
            color: '#fca5a5',
            fontSize: 13,
          }}>
            ⚠️ Backend not configured — set <code>VITE_BACKEND_API_URL</code> in <code>.env</code>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: 16 }}>
            <span style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 6 }}>
              Email address
            </span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="admin@tomatoguard.app"
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#0d1b2e',
                border: '1px solid #1e3a5f',
                borderRadius: 8,
                color: '#e2e8f0',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </label>

          <label style={{ display: 'block', marginBottom: 24 }}>
            <span style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 6 }}>
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#0d1b2e',
                border: '1px solid #1e3a5f',
                borderRadius: 8,
                color: '#e2e8f0',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </label>

          {error && (
            <div style={{
              background: '#2d1515',
              border: '1px solid #7f1d1d',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 20,
              color: '#fca5a5',
              fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !BASE}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#1e3a5f' : '#0f3460',
              border: 'none',
              borderRadius: 8,
              color: '#e2e8f0',
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in to admin panel'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#475569', fontSize: 12, marginTop: 24 }}>
          No sign-up link — admin accounts are provisioned directly
        </p>
      </div>
    </div>
  )
}
