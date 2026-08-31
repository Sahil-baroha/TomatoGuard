import { Leaf, Droplets, CloudSun, ListChecks, ScanLine, FlaskConical, PlugZap, FileCheck2 } from 'lucide-react'
import Page from '../components/Page'
import StatCard from '../components/StatCard'
import { defaultTasks, readJSON } from '../lib/storage'
import { endpoints } from '../lib/api'

export default function Dashboard(){
 const user=readJSON('tomatoUser',{})
 const tasks=readJSON('tomatoTasks',defaultTasks)
 const soil=readJSON('tomatoSoilReport',null)
 const disease=readJSON('tomatoDiseaseResult',null)
 const weather=readJSON('tomatoWeatherResult',null)
 const pending=tasks.filter(t=>!t.done).length

 return <Page title={`Farm Dashboard${user.name?` — ${user.name.split(' ')[0]}`:''}`} sub="Your latest crop, soil, weather and task information appears here as soon as the corresponding services return real results.">
   <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <StatCard icon={Leaf} label="Latest leaf analysis" value={disease?.label || 'Not analyzed'} note={disease?.createdAt || 'Upload a leaf image to begin'} tone="green"/>
    <StatCard icon={Droplets} label="Latest soil report" value={soil ? 'Available' : 'Not analyzed'} note={soil?.date || 'Upload a report and complete the questionnaire'} tone="blue"/>
    <StatCard icon={CloudSun} label="Weather" value={weather?.temperature ? `${weather.temperature}°C` : 'Not synced'} note={weather?.location || 'Connect the weather backend/API'} />
    <StatCard icon={ListChecks} label="Pending tasks" value={String(pending)} note="Based on your saved daily task list"/>
   </div>

   <div className="mt-5 grid gap-5 lg:grid-cols-3">
     <StatusCard icon={ScanLine} title="Disease model" connected={!!endpoints.disease} text={endpoints.disease?'Endpoint configured. Results will come from your team model.':'Waiting for disease-model API endpoint.'}/>
     <StatusCard icon={FlaskConical} title="Soil model" connected={!!endpoints.soil} text={endpoints.soil?'Endpoint configured. Combined soil inputs can be sent to backend.':'Waiting for soil-analysis API endpoint.'}/>
     <StatusCard icon={PlugZap} title="Weather service" connected={!!endpoints.weather} text={endpoints.weather?'Weather endpoint configured.':'Waiting for weather backend/API endpoint.'}/>
   </div>

   <div className="card mt-5 p-7">
     <div className="flex gap-4"><FileCheck2 className="mt-1 text-red-700"/><div>
       <h2 className="text-2xl font-black">No fabricated farm values</h2>
       <p className="mt-2 max-w-4xl leading-7 text-stone-500">Until a model or API returns data, the interface intentionally shows an empty or “not analyzed” state. This keeps the frontend realistic and prevents demo numbers from being mistaken for actual farm results.</p>
     </div></div>
   </div>
 </Page>
}
function StatusCard({icon:Icon,title,connected,text}){return <div className="card p-6"><div className={`inline-block rounded-2xl p-3 ${connected?'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300':'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}><Icon/></div><h3 className="mt-4 text-xl font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-stone-500">{text}</p><span className={`mt-4 inline-block rounded-full px-3 py-1 text-xs font-black ${connected?'bg-green-100 text-green-800':'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300'}`}>{connected?'Connected':'Integration pending'}</span></div>}
