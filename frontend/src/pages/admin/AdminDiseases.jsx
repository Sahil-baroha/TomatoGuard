import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDiseases, createDisease, updateDisease, clearAdminTokens } from '../../lib/adminApi'

const EMPTY_FORM = { disease_name: '', description: '', symptoms: '', causes: '', prevention: '', treatment: '' }

export default function AdminDiseases() {
  const navigate = useNavigate()
  const [diseases, setDiseases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null) // null = add mode, number = edit mode
  const [showForm, setShowForm] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await getDiseases()
      setDiseases(data)
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

  useEffect(() => { load() }, [])

  function openAdd() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setSaveError('')
    setSaveSuccess('')
    setShowForm(true)
  }

  function openEdit(d) {
    setForm({
      disease_name: d.disease_name || '',
      description: d.description || '',
      symptoms: d.symptoms || '',
      causes: d.causes || '',
      prevention: d.prevention || '',
      treatment: d.treatment || '',
    })
    setEditingId(d.disease_id)
    setSaveError('')
    setSaveSuccess('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setSaveError('')
    setSaveSuccess('')
  }

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    setSaveSuccess('')
    try {
      const payload = {}
      Object.entries(form).forEach(([k, v]) => { if (v !== '') payload[k] = v })

      if (editingId !== null) {
        await updateDisease(editingId, payload)
        setSaveSuccess('Disease updated successfully.')
      } else {
        if (!form.disease_name) { setSaveError('Disease name is required.'); setSaving(false); return }
        await createDisease(payload)
        setSaveSuccess('Disease added successfully.')
      }
      await load()
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    background: '#0d1b2e',
    border: '1px solid #1e3a5f',
    borderRadius: 7,
    color: '#e2e8f0',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: 12,
  }

  const FIELDS = [
    { key: 'disease_name', label: 'Disease name *', multiline: false },
    { key: 'description', label: 'Description', multiline: true },
    { key: 'symptoms', label: 'Symptoms', multiline: true },
    { key: 'causes', label: 'Causes', multiline: true },
    { key: 'prevention', label: 'Prevention', multiline: true },
    { key: 'treatment', label: 'Treatment', multiline: true },
  ]

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
        <span style={{ fontSize: 22 }}>🦠</span>
        <span style={{ fontWeight: 700 }}>Disease Lookup Table</span>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Diseases</h2>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
              These entries appear directly on the farmer-facing Disease Detection page — treat copy quality as farmer-facing.
            </p>
          </div>
          <button
            onClick={openAdd}
            style={{ background: '#0f3460', border: 'none', borderRadius: 8, color: '#e2e8f0', padding: '10px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            + Add disease
          </button>
        </div>

        {error && (
          <div style={{ background: '#2d1515', border: '1px solid #7f1d1d', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#fca5a5', fontSize: 14 }}>
            {error}
          </div>
        )}

        {/* Add/Edit form */}
        {showForm && (
          <div style={{
            background: '#16213e',
            border: '1px solid #0f3460',
            borderRadius: 10,
            padding: 24,
            marginBottom: 24,
          }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>
              {editingId !== null ? `Edit disease (ID ${editingId})` : 'Add new disease'}
            </h3>
            <form onSubmit={handleSave}>
              {FIELDS.map(f => (
                <label key={f.key} style={{ display: 'block' }}>
                  <span style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 4 }}>{f.label}</span>
                  {f.multiline ? (
                    <textarea
                      name={f.key}
                      value={form[f.key]}
                      onChange={handleChange}
                      rows={3}
                      disabled={f.key === 'disease_name' && editingId !== null}
                      style={{ ...inputStyle, resize: 'vertical', height: 72 }}
                    />
                  ) : (
                    <input
                      type="text"
                      name={f.key}
                      value={form[f.key]}
                      onChange={handleChange}
                      required={f.key === 'disease_name' && editingId === null}
                      style={inputStyle}
                    />
                  )}
                </label>
              ))}

              {saveError && (
                <div style={{ background: '#2d1515', border: '1px solid #7f1d1d', borderRadius: 8, padding: '10px 14px', marginBottom: 12, color: '#fca5a5', fontSize: 13 }}>
                  {saveError}
                </div>
              )}
              {saveSuccess && (
                <div style={{ background: '#052e16', border: '1px solid #166534', borderRadius: 8, padding: '10px 14px', marginBottom: 12, color: '#86efac', fontSize: 13 }}>
                  {saveSuccess}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={closeForm}
                  style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#94a3b8', padding: '10px 18px', cursor: 'pointer', fontSize: 14 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ background: saving ? '#1e3a5f' : '#0f3460', border: 'none', borderRadius: 8, color: '#e2e8f0', padding: '10px 18px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14 }}
                >
                  {saving ? 'Saving…' : editingId !== null ? 'Save changes' : 'Add disease'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Table */}
        <div style={{ background: '#16213e', border: '1px solid #0f3460', borderRadius: 10, overflow: 'hidden' }}>
          {loading ? (
            <p style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading…</p>
          ) : diseases.length === 0 ? (
            <p style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No diseases in the lookup table yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#0d1b2e', color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>ID</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Name</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Description</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Updated</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}></th>
                </tr>
              </thead>
              <tbody>
                {diseases.map((d, i) => (
                  <tr
                    key={d.disease_id}
                    style={{
                      borderTop: '1px solid #0f3460',
                      background: i % 2 === 1 ? '#0d1b2e' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '12px 16px', color: '#475569', fontSize: 12 }}>{d.disease_id}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{d.disease_name}</td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8', maxWidth: 320 }}>
                      {d.description
                        ? (d.description.length > 80 ? d.description.slice(0, 80) + '…' : d.description)
                        : <em style={{ color: '#475569' }}>No description</em>}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 12 }}>
                      {d.updated_at ? new Date(d.updated_at).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => openEdit(d)}
                        style={{ background: '#0f3460', border: 'none', borderRadius: 6, color: '#e2e8f0', padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
