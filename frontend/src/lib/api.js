const request = async (url, options={}) => {
  if (!url) throw new Error('SERVICE_NOT_CONFIGURED')
  const res = await fetch(url, options)
  if (!res.ok) {
    const text = await res.text().catch(()=> '')
    throw new Error(text || `Request failed (${res.status})`)
  }
  return res.json()
}

export const endpoints = {
  disease: import.meta.env.VITE_DISEASE_API_URL || '',
  soil: import.meta.env.VITE_SOIL_API_URL || '',
  weather: import.meta.env.VITE_WEATHER_API_URL || '',
}

export async function analyzeDisease(file){
  if(!endpoints.disease) throw new Error('SERVICE_NOT_CONFIGURED')
  const body = new FormData()
  body.append('image', file)
  return request(endpoints.disease, { method:'POST', body })
}

export async function analyzeSoil(payload){
  if(!endpoints.soil) throw new Error('SERVICE_NOT_CONFIGURED')
  return request(endpoints.soil, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(payload)
  })
}

export async function getWeather(query){
  if(!endpoints.weather) throw new Error('SERVICE_NOT_CONFIGURED')
  const join = endpoints.weather.includes('?') ? '&' : '?'
  return request(`${endpoints.weather}${join}location=${encodeURIComponent(query)}`)
}
