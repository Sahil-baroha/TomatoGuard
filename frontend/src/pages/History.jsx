import { useState, useEffect } from 'react'
import { FileBarChart, Filter, Leaf, FlaskConical, CloudSun, Calendar } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Page from '../components/Page'
import { getHistory } from '../lib/api'

export default function History() {
  const { t } = useTranslation()
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Filters
  const [type, setType] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const fetchHistory = async () => {
    setLoading(true)
    setError('')
    try {
      // Create date strings in ISO format if dates are selected
      let fromIso = fromDate ? new Date(fromDate).toISOString() : null
      let toIso = toDate ? new Date(toDate + 'T23:59:59').toISOString() : null
      
      const data = await getHistory(type || null, fromIso, toIso)
      setItems(data)
    } catch (err) {
      setError(err.message || t('history.errorFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, []) // Load initially

  const iconForType = (t) => {
    if (t === 'scan') return <Leaf className="text-green-600" />
    if (t === 'soil') return <FlaskConical className="text-amber-600" />
    if (t === 'weather') return <CloudSun className="text-blue-500" />
    return <FileBarChart className="text-stone-500" />
  }

  const labelForType = (type) => {
    if (type === 'scan') return t('history.diseaseScan')
    if (type === 'soil') return t('history.soilAnalysis')
    if (type === 'weather') return t('history.weatherRecord')
    return t('history.record')
  }

  return (
    <Page title={t('history.title')} sub={t('history.sub')}>
      
      <div className="card p-5 mb-6 flex flex-col md:flex-row gap-4 items-end bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">{t('history.recordType')}</label>
          <select 
            value={type} 
            onChange={e => setType(e.target.value)}
            className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2"
          >
            <option value="">{t('history.allRecords')}</option>
            <option value="scan">{t('history.diseaseScans')}</option>
            <option value="soil">{t('history.soilAnalyses')}</option>
            <option value="weather">{t('history.weatherRecords')}</option>
          </select>
        </div>
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">{t('history.fromDate')}</label>
          <input 
            type="date" 
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2"
          />
        </div>
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">{t('history.toDate')}</label>
          <input 
            type="date" 
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2"
          />
        </div>
        <button 
          onClick={fetchHistory}
          disabled={loading}
          className="w-full md:w-auto bg-red-700 hover:bg-red-800 text-white px-6 py-2 rounded-xl font-bold flex items-center justify-center gap-2"
        >
          <Filter size={18} />
          {loading ? t('history.filtering') : t('history.applyFilters')}
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6">{error}</div>}

      {items === null || loading ? (
        <div className="text-stone-500 text-center py-10">{t('history.loadingHistory')}</div>
      ) : items.length === 0 ? (
        <div className="card p-10 text-center flex flex-col items-center">
          <FileBarChart className="text-stone-300 mb-4" size={48} />
          <h3 className="text-xl font-bold mb-2">{t('history.noRecordsFound')}</h3>
          <p className="text-stone-500 max-w-md">{t('history.noRecordsSub')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <div key={`${item.type}-${item.id}`} className="card p-5 border border-stone-200 dark:border-stone-800 flex flex-col md:flex-row gap-5 items-start md:items-center">
              <div className="flex items-center gap-4 flex-1">
                <div className="bg-stone-100 dark:bg-stone-800 p-3 rounded-full">
                  {iconForType(item.type)}
                </div>
                <div>
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">{labelForType(item.type)}</span>
                  <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">{item.quick_status}</h3>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-stone-500 whitespace-nowrap">
                <Calendar size={16} />
                {new Date(item.normalized_date).toLocaleString()}
              </div>
              {item.type === 'scan' && item.details?.severity && (
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                  item.details.severity === 'High' ? 'bg-red-100 text-red-700' : 
                  item.details.severity === 'Moderate' ? 'bg-yellow-100 text-yellow-700' : 
                  'bg-green-100 text-green-700'
                }`}>
                  {t('history.severity', { level: item.details.severity })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </Page>
  )
}
