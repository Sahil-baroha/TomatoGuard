import { useState } from 'react'
import { UploadCloud, ScanLine, AlertTriangle, CheckCircle2, Trash2, ImageOff, PlugZap } from 'lucide-react'
import Page from '../components/Page'
import { analyzeDisease, endpoints } from '../lib/api'
import { writeJSON } from '../lib/storage'

async function imageLooksLeafLike(file){
  const dataUrl=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)})
  const img=new Image(); await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=dataUrl})
  const c=document.createElement('canvas'),s=150;c.width=s;c.height=s
  const ctx=c.getContext('2d');ctx.drawImage(img,0,0,s,s)
  const d=ctx.getImageData(0,0,s,s).data;let green=0,pixels=0
  for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],b=d[i+2],a=d[i+3];if(a<50)continue;pixels++;if(g>r*1.05&&g>b*1.08&&g>55)green++}
  return { ok:pixels>0 && green/pixels>=0.10, dataUrl }
}

export default function Disease(){
 const [preview,setPreview]=useState(null),[file,setFile]=useState(null),[msg,setMsg]=useState(null),[loading,setLoading]=useState(false),[result,setResult]=useState(null)
 const reset=()=>{setPreview(null);setFile(null);setMsg(null);setResult(null)}
 const choose=async e=>{
   const f=e.target.files?.[0]; if(!f)return
   reset()
   if(!['image/jpeg','image/png','image/webp'].includes(f.type)){setMsg({ok:false,text:'Please choose a valid image file (JPG, PNG or WEBP).'});return}
   if(f.size>8*1024*1024){setMsg({ok:false,text:'Please choose an image smaller than 8 MB.'});return}
   setLoading(true)
   try{
     const check=await imageLooksLeafLike(f)
     if(!check.ok){setMsg({ok:false,text:'We could not identify a suitable leaf image. Please upload a clear tomato leaf photo.'});return}
     setPreview(check.dataUrl);setFile(f);setMsg({ok:true,text:'Image ready for analysis.'})
   }catch{setMsg({ok:false,text:'This image could not be read. Please try another image.'})}
   finally{setLoading(false)}
 }
 const run=async()=>{
   if(!file)return
   if(!endpoints.disease){setMsg({ok:false,text:'Disease analysis service is not connected yet. The image is ready; connect your team model API to continue.'});return}
   setLoading(true);setResult(null)
   try{
     const data=await analyzeDisease(file)
     const normalized={label:data.label||data.disease||data.class||'Result received',confidence:data.confidence,details:data.details||data.recommendation||'',createdAt:new Date().toLocaleString()}
     setResult(normalized);writeJSON('tomatoDiseaseResult',normalized);setMsg({ok:true,text:'Analysis completed.'})
   }catch(e){setMsg({ok:false,text:'Could not analyze the image. Please check the model service and try again.'})}
   finally{setLoading(false)}
 }
 return <Page title="Leaf Disease Analysis" sub="Upload a clear tomato leaf image. Your model result will appear here once the disease-analysis service is connected.">
   <div className="grid gap-5 lg:grid-cols-2">
    <div className="card p-6">
      {!preview?<label className="grid min-h-80 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-red-200 bg-red-50/50 p-5 text-center dark:border-red-900 dark:bg-red-950/20"><div><UploadCloud className="mx-auto text-red-700" size={46}/><p className="mt-4 font-black">Choose leaf image</p><p className="mt-2 text-sm text-stone-500">JPG / PNG / WEBP · maximum 8 MB</p></div><input type="file" accept="image/jpeg,image/png,image/webp" onChange={choose} className="hidden"/></label>:
      <div><div className="relative grid min-h-80 place-items-center rounded-2xl bg-stone-100 p-4 dark:bg-stone-800"><img src={preview} className="max-h-72 rounded-2xl object-contain"/><button onClick={reset} className="absolute right-3 top-3 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-black text-red-700 shadow dark:bg-stone-900"><Trash2 size={16}/>Remove</button></div></div>}
      {msg&&<div className={`mt-4 flex gap-3 rounded-xl p-4 text-sm ${msg.ok?'bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300':'bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300'}`}>{msg.ok?<CheckCircle2 size={19}/>:<AlertTriangle size={19}/>}<p>{msg.text}</p></div>}
      <button onClick={run} disabled={!file||loading} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 py-3 font-black text-white disabled:opacity-40"><ScanLine size={19}/>{loading?'Processing...':'Analyze image'}</button>
    </div>
    <div className="rounded-3xl bg-[#421c15] p-7 text-white">
      {result?<><CheckCircle2 className="text-green-300" size={36}/><p className="mt-5 text-xs font-black uppercase tracking-[.16em] text-red-300">Model result</p><h2 className="mt-2 text-3xl font-black">{result.label}</h2>{result.confidence!==undefined&&<p className="mt-3">Confidence: <b>{typeof result.confidence==='number'&&result.confidence<=1?`${Math.round(result.confidence*100)}%`:String(result.confidence)}</b></p>}{result.details&&<div className="mt-6 rounded-2xl bg-white/10 p-5"><p className="leading-7 text-red-50">{result.details}</p></div>}</>:
      <div className="grid h-full min-h-80 place-items-center text-center"><div>{endpoints.disease?<ImageOff className="mx-auto text-red-300" size={50}/>:<PlugZap className="mx-auto text-red-300" size={50}/>}<h2 className="mt-4 text-2xl font-black">{endpoints.disease?'No analysis yet':'Model integration pending'}</h2><p className="mt-2 max-w-sm text-red-50/80">{endpoints.disease?'Upload an image to receive the model response.':'No disease label or confidence is generated until your team API is connected.'}</p></div></div>}
    </div>
   </div>
 </Page>
}
