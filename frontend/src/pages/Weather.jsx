import { useState } from 'react'
import { Search, CloudSun, LoaderCircle, PlugZap } from 'lucide-react'
import Page from '../components/Page'
import { endpoints, getWeather } from '../lib/api'
import { writeJSON } from '../lib/storage'

export default function Weather(){
 const [q,setQ]=useState(''),[loading,setLoading]=useState(false),[error,setError]=useState(''),[data,setData]=useState(null)
 const search=async e=>{e.preventDefault();setError('');if(!q.trim())return setError('Enter a farm location.');if(!endpoints.weather)return setError('Weather service is not connected yet. Add the backend/API endpoint when your team provides it.');setLoading(true);try{const w=await getWeather(q);setData(w);writeJSON('tomatoWeatherResult',{...w,location:q,createdAt:new Date().toLocaleString()})}catch{setError('Could not load weather. Please check the backend/API connection.')}finally{setLoading(false)}}
 return <Page title="Weather" sub="Live conditions will be requested from your team weather service after the API endpoint is connected.">
  <form onSubmit={search} className="card flex flex-col gap-3 p-4 sm:flex-row"><input value={q} onChange={e=>setQ(e.target.value)} className="input flex-1" placeholder="Enter farm city / location"/><button className="flex items-center justify-center gap-2 rounded-xl bg-red-700 px-6 py-3 font-black text-white">{loading?<LoaderCircle className="animate-spin" size={18}/>:<Search size={18}/>}Load weather</button></form>
  {error&&<p className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
  {data?<pre className="card mt-5 overflow-auto p-6 text-xs">{JSON.stringify(data,null,2)}</pre>:<div className="mt-5 rounded-3xl bg-[#421c15] p-8 text-white"><div className="flex gap-4">{endpoints.weather?<CloudSun className="text-red-300" size={40}/>:<PlugZap className="text-red-300" size={40}/>}<div><h2 className="text-2xl font-black">{endpoints.weather?'Ready to request live weather':'Weather integration pending'}</h2><p className="mt-2 max-w-2xl text-red-50/80">{endpoints.weather?'Search a location to load the real API response.':'No temperature, humidity, rain or forecast values are shown until the weather backend/API is connected.'}</p></div></div></div>}
 </Page>
}
