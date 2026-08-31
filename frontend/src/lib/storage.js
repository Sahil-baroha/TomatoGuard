export const readJSON = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
export const writeJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value))

export const defaultNotifications = [
  { id: 1, title: 'Tomato plot inspection due', message: 'Inspect lower leaves for early disease symptoms today.', read: false, time: 'Today' },
  { id: 2, title: 'Weather check', message: 'Review rainfall probability before scheduling irrigation.', read: false, time: 'Today' },
  { id: 3, title: 'Soil report ready', message: 'Your last soil-analysis summary is available in Reports.', read: true, time: 'Yesterday' }
]

export const defaultTasks = [
  { id: 1, title: 'Morning tomato leaf inspection', category: 'Crop health', due: '07:30', done: false },
  { id: 2, title: 'Check soil moisture near root zone', category: 'Soil', due: '09:00', done: false },
  { id: 3, title: 'Review weather before irrigation', category: 'Weather', due: '11:00', done: false },
  { id: 4, title: 'Record pest/disease observations', category: 'Monitoring', due: '17:00', done: false },
]
