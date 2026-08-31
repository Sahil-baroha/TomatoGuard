import { useState } from 'react'
import { createWorker } from 'tesseract.js'
import { UploadCloud, FileText, LoaderCircle, ClipboardList, CheckCircle2, Trash2, PlugZap } from 'lucide-react'
import Page from '../components/Page'
import { analyzeSoil, endpoints } from '../lib/api'
import { writeJSON } from '../lib/storage'

const initial={n:'',p:'',k:'',ph:'',ec:'',oc:''}
function parseSoil(text){
 const grab=(patterns)=>{for(const p of patterns){const m=text.match(p);if(m)return m[1]}return ''}
 return {
  n:grab([/(?:nitrogen|\bN\b)\s*[:=-]?\s*(\d+(?:\.\d+)?)/i]),
  p:grab([/(?:phosphorus|phosphorous|\bP\b)\s*[:=-]?\s*(\d+(?:\.\d+)?)/i]),
  k:grab([/(?:potassium|\bK\b)\s*[:=-]?\s*(\d+(?:\.\d+)?)/i]),
  ph:grab([/\bpH\s*[:=-]?\s*(\d+(?:\.\d+)?)/i]),
  ec:grab([/(?:electrical conductivity|\bEC\b)\s*[:=-]?\s*(\d+(?:\.\d+)?)/i]),
  oc:grab([/(?:organic carbon|\bOC\b)\s*[:=-]?\s*(\d+(?:\.\d+)?)/i]),
 }
}
function looksLikeSoilReport(text){
 const terms=['soil','ph','nitrogen','phosphorus','potassium','organic carbon','electrical conductivity','n p k','sample']
 const low=text.toLowerCase()
 return terms.filter(t=>low.includes(t)).length>=2
}

export default function Soil(){
 const [tab,setTab]=useState('ocr'),[file,setFile]=useState(null),[progress,setProgress]=useState(0),[ocr,setOcr]=useState(''),[vals,setVals]=useState(initial),[qs,setQs]=useState({texture:'',drainage:'',irrigation:'',history:'',symptoms:''}),[report,setReport]=useState(null),[err,setErr]=useState(''),[ok,setOk]=useState('')
 const remove=()=>{setFile(null);setProgress(0);setOcr('');setVals(initial);setErr('');setOk('');setReport(null)}
 const runOCR=async()=>{
   if(!file)return setErr('Please upload a soil-test report image first.')
   setErr('');setOk('');setProgress(1)
   try{
     const worker=await createWorker('eng',1,{logger:m=>{if(m.status==='recognizing text')setProgress(Math.round((m.progress||0)*100))}})
     const {data:{text}}=await worker.recognize(file);await worker.terminate()
     if(!looksLikeSoilReport(text)){setProgress(0);setOcr('');setVals(initial);return setErr('We could not identify this as a readable soil-test report. Please upload a clearer report image.')}
     setOcr(text);const parsed=parseSoil(text);setVals(v=>({...v,...Object.fromEntries(Object.entries(parsed).filter(([,x])=>x))}));setProgress(100);setOk('Report text extracted. Please review the values before continuing.')
   }catch{setErr('The report could not be read. Please try a sharper, well-lit image.');setProgress(0)}
 }
 const generate=async()=>{
   setErr('');setOk('')
   const missing=['n','p','k','ph'].filter(k=>!vals[k])
   if(missing.length)return setErr('Please review and complete N, P, K and pH values before continuing.')
   if(!qs.texture||!qs.drainage||!qs.irrigation)return setErr('Please complete the farmer questionnaire before continuing.')
   const payload={soil_values:vals,questionnaire:qs,ocr_text:ocr}
   if(!endpoints.soil){const local={...payload,status:'ready-for-backend',date:new Date().toLocaleString()};writeJSON('tomatoSoilReport',local);setReport(local);setOk('Inputs are complete and saved. Soil-analysis service is not connected yet, so no recommendation has been generated.');return}
   try{
     const data=await analyzeSoil(payload)
     const r={...payload,analysis:data,date:new Date().toLocaleString()}
     writeJSON('tomatoSoilReport',r);setReport(r);setOk('Soil analysis completed.')
   }catch{setErr('Could not reach the soil-analysis service. Please try again after checking the backend connection.')}
 }
 return <Page title="Soil Analysis" sub="Upload a soil-test report, review extracted values, answer field questions and then send the combined inputs to your soil-analysis service.">
   <div className="mb-5 flex gap-2 rounded-2xl bg-stone-100 p-1 dark:bg-stone-900"><button onClick={()=>setTab('ocr')} className={`flex-1 rounded-xl px-4 py-3 font-black ${tab==='ocr'?'bg-white shadow dark:bg-stone-800':''}`}>Soil report</button><button onClick={()=>setTab('q')} className={`flex-1 rounded-xl px-4 py-3 font-black ${tab==='q'?'bg-white shadow dark:bg-stone-800':''}`}>Farmer questionnaire</button></div>
   {tab==='ocr'?<div className="grid gap-5 lg:grid-cols-2"><div className="card p-6">
     {!file?<label className="grid min-h-56 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-stone-300 p-5 text-center dark:border-stone-700"><div><UploadCloud className="mx-auto text-red-700" size={42}/><p className="mt-3 font-black">Choose soil-test report image</p><p className="mt-2 text-sm text-stone-500">JPG / PNG / WEBP</p></div><input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e=>{setFile(e.target.files?.[0]||null);setErr('');setOk('')}}/></label>:
     <div className="rounded-2xl border border-stone-200 p-4 dark:border-stone-700"><div className="flex items-center justify-between gap-3"><div><p className="font-black">{file.name}</p><p className="text-xs text-stone-500">{(file.size/1024/1024).toFixed(2)} MB</p></div><button onClick={remove} className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-black text-red-700 dark:bg-red-950/30"><Trash2 size={16}/>Remove</button></div></div>}
     <button onClick={runOCR} disabled={!file||progress>0&&progress<100} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 py-3 font-black text-white disabled:opacity-50">{progress>0&&progress<100?<LoaderCircle className="animate-spin" size={18}/>:<FileText size={18}/>} {progress>0&&progress<100?`Reading ${progress}%`:'Read report'}</button>
     {ocr&&<textarea value={ocr} onChange={e=>setOcr(e.target.value)} className="input mt-4 min-h-36 text-xs"/>}
   </div><Values vals={vals} setVals={setVals}/></div>:<Questionnaire qs={qs} setQs={setQs}/>}
   {err&&<p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700 dark:bg-red-950/30 dark:text-red-300">{err}</p>}
   {ok&&<p className="mt-5 rounded-xl bg-green-50 p-4 text-sm font-bold text-green-700 dark:bg-green-950/30 dark:text-green-300">{ok}</p>}
   <div className="mt-5 flex justify-end"><button onClick={generate} className="flex items-center gap-2 rounded-xl bg-[#421c15] px-6 py-3 font-black text-white"><ClipboardList size={18}/>Continue to analysis</button></div>
   {report&&<div className="mt-5 card p-7"><div className="flex gap-3">{endpoints.soil?<CheckCircle2 className="text-green-700"/>:<PlugZap className="text-amber-700"/>}<div><h2 className="text-2xl font-black">{endpoints.soil?'Soil result received':'Inputs ready for backend'}</h2>{report.analysis?<pre className="mt-4 overflow-auto rounded-2xl bg-stone-100 p-4 text-xs dark:bg-stone-800">{JSON.stringify(report.analysis,null,2)}</pre>:<p className="mt-2 text-stone-500">No fertility class, nutrient recommendation or fertilizer dose is invented by the frontend. Those outputs will appear only after your soil model/API is connected.</p>}</div></div></div>}
 </Page>
}
function Values({vals,setVals}){return <div className="card p-6"><h2 className="text-xl font-black">Review report values</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">{[['n','Nitrogen (N)'],['p','Phosphorus (P)'],['k','Potassium (K)'],['ph','pH'],['ec','EC'],['oc','Organic Carbon']].map(([k,l])=><label key={k}><span className="mb-2 block text-sm font-bold">{l}</span><input value={vals[k]} onChange={e=>setVals({...vals,[k]:e.target.value})} className="input" placeholder="Extracted / manual"/></label>)}</div></div>}
function Questionnaire({qs,setQs}){return <div className="card p-6"><h2 className="text-xl font-black">Field questionnaire</h2><div className="mt-5 grid gap-5 md:grid-cols-2"><Select label="Soil texture" value={qs.texture} onChange={v=>setQs({...qs,texture:v})} options={['','Sandy','Sandy loam','Loamy','Clay loam','Clay']}/><Select label="Drainage" value={qs.drainage} onChange={v=>setQs({...qs,drainage:v})} options={['','Good','Moderate','Poor']}/><Select label="Irrigation method" value={qs.irrigation} onChange={v=>setQs({...qs,irrigation:v})} options={['','Drip','Furrow','Sprinkler','Manual']}/><label><span className="mb-2 block text-sm font-bold">Previous crop / field history</span><input className="input" value={qs.history} onChange={e=>setQs({...qs,history:e.target.value})}/></label><label className="md:col-span-2"><span className="mb-2 block text-sm font-bold">Current observations</span><textarea className="input min-h-28" value={qs.symptoms} onChange={e=>setQs({...qs,symptoms:e.target.value})}/></label></div></div>}
function Select({label,value,onChange,options}){return <label><span className="mb-2 block text-sm font-bold">{label}</span><select className="input" value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o} value={o}>{o||'Select'}</option>)}</select></label>}
