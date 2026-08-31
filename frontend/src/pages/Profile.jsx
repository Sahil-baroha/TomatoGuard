import { useState } from 'react'
import { Camera, Save } from 'lucide-react'
import Page from '../components/Page'
import { readJSON, writeJSON } from '../lib/storage'

async function resizeImage(file){
 const url=URL.createObjectURL(file),img=new Image();await new Promise((r,j)=>{img.onload=r;img.onerror=j;img.src=url});const s=240,c=document.createElement('canvas');c.width=s;c.height=s;const x=c.getContext('2d');const m=Math.min(img.width,img.height),sx=(img.width-m)/2,sy=(img.height-m)/2;x.drawImage(img,sx,sy,m,m,0,0,s,s);URL.revokeObjectURL(url);return c.toDataURL('image/jpeg',.82)
}
export default function Profile(){
 const user=readJSON('tomatoUser',{}),[p,setP]=useState(()=>readJSON('tomatoProfile',{name:user.name||'',email:user.email||'',farm:'My Tomato Farm',location:'',variety:'Tomato',area:'',photo:''})),[saved,setSaved]=useState(false)
 const photo=async e=>{const f=e.target.files?.[0];if(!f)return;setP({...p,photo:await resizeImage(f)})}
 const submit=e=>{e.preventDefault();writeJSON('tomatoProfile',p);setSaved(true);setTimeout(()=>setSaved(false),2000)}
 return <Page title="Farmer & Tomato Farm Profile" sub="Profile photo and farm details are stored locally for this frontend demo."><form onSubmit={submit} className="card max-w-3xl p-7"><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><div className="relative h-28 w-28 overflow-hidden rounded-3xl bg-red-100">{p.photo?<img src={p.photo} className="h-full w-full object-cover"/>:<div className="grid h-full place-items-center text-4xl">👨‍🌾</div>}<label className="absolute bottom-1 right-1 cursor-pointer rounded-xl bg-stone-900 p-2 text-white"><Camera size={17}/><input type="file" accept="image/*" className="hidden" onChange={photo}/></label></div><div><h2 className="text-2xl font-black">{p.name||'Farm User'}</h2><p className="text-stone-500">{p.farm}</p><p className="mt-1 text-sm font-bold text-red-700">Dedicated crop: Tomato 🍅</p></div></div><div className="mt-7 grid gap-5 md:grid-cols-2">{[['name','Full name'],['email','Email'],['farm','Farm name'],['location','Farm location'],['area','Tomato cultivation area']].map(([k,l])=><label key={k}><span className="mb-2 block text-sm font-bold">{l}</span><input className="input" value={p[k]||''} onChange={e=>setP({...p,[k]:e.target.value})}/></label>)}<label><span className="mb-2 block text-sm font-bold">Crop</span><input className="input bg-stone-100" value="Tomato" readOnly/></label></div><button className="mt-6 flex items-center gap-2 rounded-xl bg-red-700 px-5 py-3 font-black text-white"><Save size={18}/>Save profile</button>{saved&&<p className="mt-4 text-sm font-bold text-green-700">Profile saved. Refresh to see updated photo/name in the header.</p>}</form></Page>
}
