import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getFarmerDetail, setFarmerStatus, clearAdminTokens } from '../../lib/adminApi'

export default function AdminFarmerDetail() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(null) // 'activate' | 'deactivate' | null
  const [toggling, setToggling] = useState(false)

  async function loadDetail() {
    setLoading(true)
    setError('')
    try {
      const d = await getFarmerDetail(userId)
      setData(d)
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
  }

  useEffect(() => { loadDetail() }, [userId])

  async function confirmToggle() {
    if (!confirm) return
    setToggling(true)
    try {
      const newState = confirm === 'activate'
      await setFarmerStatus(userId, newState)
      setConfirm(null)
      await loadDetail()
    } catch (err) {
      setError(err.message)
    } finally {
      setToggling(false)
    }
  }

  const CardSection = ({ title, children }) => (
    <div style={{
      background: '#16213e',
      border: '1px solid #0f3460',
      borderRadius: 10,
      padding: '20px 20px 8px',
      marginBottom: 20,
    }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </h3>
      {children}
    </div>
  )

  const Field = ({ label, value }) => (
    <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
      <span style={{ color: '#64748b', fontSize: 13, minWidth: 110 }}>{label}</span>
      <span style={{ color: '#e2e8f0', fontSize: 14, fontWeight: value ? 500 : 400 }}>
        {value || <em style={{ color: '#475569' }}>—</em>}
      </span>
    </div>
  )

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontFamily: 'system-ui, sans-serif' }}>
      Loading farmer details…
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#1a1a2e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ color: '#fca5a5', fontSize: 15 }}>{error}</div>
      <button onClick={() => navigate('/admin/dashboard')} style={{ background: '#0f3460', border: 'none', borderRadius: 8, color: '#e2e8f0', padding: '10px 20px', cursor: 'pointer' }}>
        Back to Dashboard
      </button>
    </div>
  )

  if (!data) return null

  const { profile, farm, recent_disease_scans, recent_soil_analyses, recent_weather_records } = data

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a2e', fontFamily: 'system-ui, sans-serif', color: '#e2e8f0' }}>
      {/* Top bar */}
      <div style={{
        background: '#16213e',
        borderBottom: '1px solid #0f3460',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <button
          onClick={() => navigate('/admin/dashboard')}
          style={{ background: '#0d1b2e', border: '1px solid #1e3a5f', borderRadius: 8, color: '#94a3b8', padding: '7px 14px', cursor: 'pointer', fontSize: 13 }}
        >
          ← Back
        </button>
        <span style={{ fontSize: 22 }}>🛡️</span>
        <span style={{ fontWeight: 700 }}>Farmer Detail</span>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
        {/* Profile header */}
        <div style={{
          background: '#16213e',
          border: '1px solid #0f3460',
          borderRadius: 10,
          padding: '20px',
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>{profile.name}</h2>
            <p style={{ margin: '0 0 8px', color: '#94a3b8', fontSize: 14 }}>{profile.email}</p>
            <span style={{
              background: profile.is_active ? '#14532d' : '#450a0a',
              color: profile.is_active ? '#86efac' : '#fca5a5',
              borderRadius: 12,
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 600,
            }}>
              {profile.is_active ? '✓ Active' : '✗ Deactivated'}
            </span>
          </div>

          {/* Activate/Deactivate button */}
          <button
            onClick={() => setConfirm(profile.is_active ? 'deactivate' : 'activate')}
            disabled={toggling}
            style={{
              background: profile.is_active ? '#450a0a' : '#14532d',
              border: `1px solid ${profile.is_active ? '#7f1d1d' : '#166534'}`,
              borderRadius: 8,
              color: profile.is_active ? '#fca5a5' : '#86efac',
              padding: '10px 18px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {profile.is_active ? 'Deactivate account' : 'Reactivate account'}
          </button>
        </div>

        {/* Confirmation modal */}
        {confirm && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
          }}>
            <div style={{
              background: '#16213e',
              border: '1px solid #0f3460',
              borderRadius: 12,
              padding: 32,
              maxWidth: 400,
              width: '90%',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>{confirm === 'deactivate' ? '⚠️' : '✅'}</div>
              <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>
                {confirm === 'deactivate' ? 'Deactivate this account?' : 'Reactivate this account?'}
              </h3>
              <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.5, margin: '0 0 24px' }}>
                {confirm === 'deactivate'
                  ? `${profile.name}'s account will be deactivated. They will be blocked from logging in. Any active sessions expire within 30 minutes.`
                  : `${profile.name}'s account will be reactivated and they can log in again.`
                }
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                  onClick={() => setConfirm(null)}
                  disabled={toggling}
                  style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', padding: '10px 20px', cursor: 'pointer', fontSize: 14 }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmToggle}
                  disabled={toggling}
                  style={{
                    background: confirm === 'deactivate' ? '#7f1d1d' : '#166534',
                    border: 'none',
                    borderRadius: 8,
                    color: '#e2e8f0',
                    padding: '10px 20px',
                    cursor: toggling ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  {toggling ? 'Saving…' : (confirm === 'deactivate' ? 'Yes, deactivate' : 'Yes, reactivate')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Profile info */}
        <CardSection title="Profile">
          <Field label="User ID" value={String(profile.user_id)} />
          <Field label="Phone" value={profile.phone} />
          <Field label="Village" value={profile.village} />
          <Field label="District" value={profile.district} />
          <Field label="State" value={profile.state} />
          <Field label="Address" value={profile.address} />
          <Field label="Joined" value={profile.created_at ? new Date(profile.created_at).toLocaleString() : null} />
        </CardSection>

        {/* Farm info */}
        <CardSection title="Farm">
          {farm ? (
            <>
              <Field label="Farm ID" value={String(farm.farm_id)} />
              <Field label="Farm name" value={farm.farm_name} />
              <Field label="Location" value={farm.location} />
              <Field label="Area (acres)" value={farm.area_acres !== null ? String(farm.area_acres) : null} />
              <Field label="Soil type" value={farm.soil_type} />
              <Field label="Latitude" value={farm.latitude !== null ? String(farm.latitude) : null} />
              <Field label="Longitude" value={farm.longitude !== null ? String(farm.longitude) : null} />
            </>
          ) : (
            <p style={{ color: '#475569', fontSize: 14, marginBottom: 12 }}>No farm record found.</p>
          )}
        </CardSection>

        {/* Recent disease scans */}
        <CardSection title="Recent Disease Scans (last 5)">
          {recent_disease_scans.length === 0 ? (
            <p style={{ color: '#475569', fontSize: 14, marginBottom: 12 }}>No disease scans yet.</p>
          ) : (
            recent_disease_scans.map(s => (
              <div key={s.scan_id} style={{ borderTop: '1px solid #0f3460', padding: '10px 0', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontWeight: 500 }}>{s.predicted_disease}</span>
                <span style={{ color: '#64748b', fontSize: 13 }}>
                  Confidence: {s.confidence ?? '—'}% &middot; {s.scan_date ? new Date(s.scan_date).toLocaleDateString() : '—'}
                </span>
              </div>
            ))
          )}
        </CardSection>

        {/* Recent soil analyses */}
        <CardSection title="Recent Soil Analyses (last 5)">
          {recent_soil_analyses.length === 0 ? (
            <p style={{ color: '#475569', fontSize: 14, marginBottom: 12 }}>No soil analyses yet.</p>
          ) : (
            recent_soil_analyses.map(a => (
              <div key={a.analysis_id} style={{ borderTop: '1px solid #0f3460', padding: '10px 0', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontWeight: 500 }}>{a.fertility_rating || 'Analysis recorded'}</span>
                <span style={{ color: '#64748b', fontSize: 13 }}>
                  {a.analysis_date ? new Date(a.analysis_date).toLocaleDateString() : '—'}
                </span>
              </div>
            ))
          )}
        </CardSection>

        {/* Recent weather records */}
        <CardSection title="Recent Weather Records (last 5)">
          {recent_weather_records.length === 0 ? (
            <p style={{ color: '#475569', fontSize: 14, marginBottom: 12 }}>No weather records yet.</p>
          ) : (
            recent_weather_records.map(w => (
              <div key={w.weather_id} style={{ borderTop: '1px solid #0f3460', padding: '10px 0', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontWeight: 500 }}>{w.weather_condition || 'Record'}</span>
                <span style={{ color: '#64748b', fontSize: 13 }}>
                  {w.temperature_c !== null ? `${w.temperature_c}°C` : '—'} &middot; {w.recorded_at ? new Date(w.recorded_at).toLocaleDateString() : '—'}
                </span>
              </div>
            ))
          )}
        </CardSection>
      </div>
    </div>
  )
}
