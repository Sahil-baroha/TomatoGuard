import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFarmers, clearAdminTokens } from '../../lib/adminApi'

const PAGE_SIZE = 10

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [farmers, setFarmers] = useState([])
  const [search, setSearch] = useState('')
  const [draftSearch, setDraftSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (q, off) => {
    setLoading(true)
    setError('')
    try {
      const data = await getFarmers({ search: q, offset: off, limit: PAGE_SIZE })
      setFarmers(data)
      setHasMore(data.length === PAGE_SIZE)
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        clearAdminTokens()
        navigate('/admin/login', { replace: true })
        return
      }
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => { load(search, offset) }, [load, search, offset])

  function handleSearch(e) {
    e.preventDefault()
    setOffset(0)
    setSearch(draftSearch.trim())
  }

  function handleLogout() {
    clearAdminTokens()
    navigate('/admin/login', { replace: true })
  }

  const page = Math.floor(offset / PAGE_SIZE) + 1

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a2e', fontFamily: 'system-ui, sans-serif', color: '#e2e8f0' }}>
      {/* Top bar */}
      <div style={{
        background: '#16213e',
        borderBottom: '1px solid #0f3460',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🛡️</span>
          <span style={{ fontWeight: 700, fontSize: 16 }}>TomatoGuard Admin</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => navigate('/admin/diseases')}
            style={{ background: '#0f3460', border: 'none', borderRadius: 8, color: '#e2e8f0', padding: '7px 16px', cursor: 'pointer', fontSize: 14 }}
          >
            🦠 Diseases
          </button>
          <button
            onClick={handleLogout}
            style={{ background: '#2d1515', border: '1px solid #7f1d1d', borderRadius: 8, color: '#fca5a5', padding: '7px 14px', cursor: 'pointer', fontSize: 14 }}
          >
            Sign out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700 }}>Farmer Accounts</h2>

        {/* Search */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <input
            type="text"
            value={draftSearch}
            onChange={e => setDraftSearch(e.target.value)}
            placeholder="Search by name, email or village…"
            style={{
              flex: 1,
              padding: '10px 14px',
              background: '#16213e',
              border: '1px solid #1e3a5f',
              borderRadius: 8,
              color: '#e2e8f0',
              fontSize: 14,
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{ background: '#0f3460', border: 'none', borderRadius: 8, color: '#e2e8f0', padding: '10px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => { setDraftSearch(''); setSearch(''); setOffset(0) }}
              style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#94a3b8', padding: '10px 14px', cursor: 'pointer', fontSize: 13 }}
            >
              Clear
            </button>
          )}
        </form>

        {/* Status */}
        {search && !loading && (
          <p style={{ color: '#64748b', fontSize: 13, marginBottom: 12 }}>
            Showing results for <strong style={{ color: '#94a3b8' }}>"{search}"</strong>
          </p>
        )}

        {error && (
          <div style={{ background: '#2d1515', border: '1px solid #7f1d1d', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#fca5a5', fontSize: 14 }}>
            {error}
          </div>
        )}

        {/* Table */}
        <div style={{ background: '#16213e', border: '1px solid #0f3460', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#0d1b2e', color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Email</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Village</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Farm</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    Loading…
                  </td>
                </tr>
              ) : farmers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    {search ? `No farmers found matching "${search}"` : 'No farmers registered yet.'}
                  </td>
                </tr>
              ) : (
                farmers.map((f, i) => (
                  <tr
                    key={f.user_id}
                    onClick={() => navigate(`/admin/farmers/${f.user_id}`)}
                    style={{
                      borderTop: '1px solid #0f3460',
                      cursor: 'pointer',
                      background: i % 2 === 1 ? '#0d1b2e' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1e3a5f'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 1 ? '#0d1b2e' : 'transparent'}
                  >
                    <td style={{ padding: '13px 16px', fontWeight: 600 }}>{f.name}</td>
                    <td style={{ padding: '13px 16px', color: '#94a3b8' }}>{f.email}</td>
                    <td style={{ padding: '13px 16px', color: '#94a3b8' }}>{f.village || '—'}</td>
                    <td style={{ padding: '13px 16px', color: '#94a3b8' }}>{f.farm_name || '—'}</td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{
                        background: f.is_active ? '#14532d' : '#450a0a',
                        color: f.is_active ? '#86efac' : '#fca5a5',
                        borderRadius: 12,
                        padding: '3px 10px',
                        fontSize: 12,
                        fontWeight: 600,
                      }}>
                        {f.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '13px 16px', color: '#64748b', fontSize: 13 }}>
                      {f.created_at ? new Date(f.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <button
            disabled={offset === 0 || loading}
            onClick={() => setOffset(o => Math.max(0, o - PAGE_SIZE))}
            style={{
              background: offset === 0 ? '#0d1b2e' : '#0f3460',
              border: 'none',
              borderRadius: 8,
              color: offset === 0 ? '#475569' : '#e2e8f0',
              padding: '8px 18px',
              cursor: offset === 0 ? 'not-allowed' : 'pointer',
              fontSize: 14,
            }}
          >
            ← Previous
          </button>
          <span style={{ color: '#64748b', fontSize: 13 }}>Page {page}</span>
          <button
            disabled={!hasMore || loading}
            onClick={() => setOffset(o => o + PAGE_SIZE)}
            style={{
              background: !hasMore ? '#0d1b2e' : '#0f3460',
              border: 'none',
              borderRadius: 8,
              color: !hasMore ? '#475569' : '#e2e8f0',
              padding: '8px 18px',
              cursor: !hasMore ? 'not-allowed' : 'pointer',
              fontSize: 14,
            }}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}
