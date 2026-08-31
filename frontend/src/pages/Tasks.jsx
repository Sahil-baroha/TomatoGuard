import { useEffect, useState } from 'react'
import { CheckCircle2, Circle, Plus, Trash2, RotateCcw } from 'lucide-react'
import Page from '../components/Page'
import { defaultTasks, readJSON, writeJSON, defaultNotifications } from '../lib/storage'

export default function Tasks(){
 const [tasks,setTasks]=useState(()=>readJSON('tomatoTasks',defaultTasks)),[title,setTitle]=useState('')
 useEffect(()=>writeJSON('tomatoTasks',tasks),[tasks])
 const toggle=id=>{setTasks(v=>v.map(t=>t.id===id?{...t,done:!t.done}:t));const n=readJSON('tomatoNotifications',defaultNotifications);writeJSON('tomatoNotifications',[{id:Date.now(),title:'Daily task updated',message:'A tomato crop-care task status was changed.',read:false,time:'Now'},...n])}
 const add=e=>{e.preventDefault();if(!title.trim())return;setTasks([...tasks,{id:Date.now(),title,category:'Custom',due:'Today',done:false}]);setTitle('')}
 return <Page title="Daily Tomato Task Tracking" sub="Turn your analysis and farm routine into trackable daily actions. Tasks persist in the browser.">
  <div className="grid gap-5 lg:grid-cols-[1fr_.45fr]"><div className="card p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Today's tomato tasks</h2><button onClick={()=>setTasks(defaultTasks)} className="flex gap-2 text-sm font-bold text-red-700"><RotateCcw size={17}/>Reset template</button></div><div className="mt-5 space-y-3">{tasks.map(t=><div key={t.id} className={`flex items-center gap-3 rounded-2xl border p-4 ${t.done?'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20':'border-stone-200 dark:border-stone-700'}`}><button onClick={()=>toggle(t.id)}>{t.done?<CheckCircle2 className="text-green-700"/>:<Circle className="text-stone-400"/>}</button><div className="flex-1"><p className={`font-black ${t.done?'line-through opacity-60':''}`}>{t.title}</p><p className="text-xs text-stone-500">{t.category} · {t.due}</p></div><button onClick={()=>setTasks(tasks.filter(x=>x.id!==t.id))} className="text-stone-400 hover:text-red-700"><Trash2 size={18}/></button></div>)}</div></div>
  <div className="card h-fit p-6"><h2 className="text-xl font-black">Add task</h2><form onSubmit={add} className="mt-4"><input className="input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Inspect lower leaves"/><button className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 py-3 font-black text-white"><Plus size={18}/>Add daily task</button></form><div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm leading-6 text-stone-600 dark:bg-red-950/20 dark:text-stone-300">Future backend integration can automatically create tasks from disease results, soil findings and weather alerts.</div></div></div>
 </Page>
}
