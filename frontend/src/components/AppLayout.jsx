import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ScanLine, FlaskConical, CloudSun, ListChecks, Landmark, FileBarChart, Settings, UserRound, LogOut, Menu, X, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import Brand from './Brand'
import NotificationMenu from './NotificationMenu'
import { readJSON } from '../lib/storage'

const links = [
  ['/dashboard','Dashboard',LayoutDashboard],
  ['/disease','Disease Detection',ScanLine],
  ['/soil','Soil Analysis',FlaskConical],
  ['/weather','Weather',CloudSun],
  ['/tasks','Daily Tasks',ListChecks],
  ['/schemes','Govt. Schemes',Landmark],
  ['/reports','Reports',FileBarChart],
]

export default function AppLayout(){
  const [open,setOpen]=useState(false),[profileOpen,setProfileOpen]=useState(false)
  const nav=useNavigate()
  const user=readJSON('tomatoUser',{})
  const profile=readJSON('tomatoProfile',{})
  const logout=()=>{localStorage.removeItem('tomatoUser');nav('/')}
  return <div className="min-h-screen bg-[#faf9f5] text-stone-800 dark:bg-stone-950 dark:text-stone-100">
    <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#421c15] p-5 text-white transition-transform lg:translate-x-0 ${open?'translate-x-0':'-translate-x-full'}`}>
      <div className="flex items-center justify-between"><Brand light/><button className="lg:hidden" onClick={()=>setOpen(false)}><X/></button></div>
      <div className="mt-8 rounded-2xl bg-white/10 p-4"><p className="text-xs font-black uppercase tracking-[.18em] text-red-200">Dedicated crop</p><p className="mt-1 text-xl font-black">🍅 Tomato Farming</p><p className="mt-1 text-xs text-red-100">Decision support workspace</p></div>
      <nav className="mt-5 space-y-1">
        {links.map(([to,label,Icon])=><NavLink key={to} to={to} onClick={()=>setOpen(false)} className={({isActive})=>`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${isActive?'bg-white text-[#421c15]':'text-red-50 hover:bg-white/10'}`}><Icon size={19}/>{label}</NavLink>)}
      </nav>
      <button onClick={logout} className="absolute bottom-5 left-5 right-5 flex items-center gap-3 rounded-xl border border-white/15 px-4 py-3 font-semibold hover:bg-white/10"><LogOut size={19}/>Logout</button>
    </aside>
    <div className="lg:pl-72">
      <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-stone-200/70 bg-white/90 px-4 backdrop-blur dark:border-stone-800 dark:bg-stone-900/90 lg:px-8">
        <div className="flex items-center gap-3"><button className="lg:hidden" onClick={()=>setOpen(true)}><Menu/></button><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-red-700 dark:text-red-400">Tomato Decision Support</p><p className="font-black">Smart Farm Console</p></div></div>
        <div className="flex items-center gap-2">
          <NotificationMenu/>
          <div className="relative">
            <button onClick={()=>setProfileOpen(!profileOpen)} className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800">
              {profile.photo?<img src={profile.photo} className="h-9 w-9 rounded-xl object-cover"/>:<span className="grid h-9 w-9 place-items-center rounded-xl bg-red-100 text-red-700"><UserRound size={19}/></span>}
              <span className="hidden text-left sm:block"><span className="block max-w-32 truncate text-xs font-black">{profile.name||user.name||'Farm User'}</span><span className="block text-[10px] text-stone-500">Tomato grower</span></span><ChevronDown size={15}/>
            </button>
            {profileOpen&&<div className="absolute right-0 top-12 z-50 w-52 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl dark:border-stone-700 dark:bg-stone-900">
              <button onClick={()=>{nav('/profile');setProfileOpen(false)}} className="flex w-full gap-2 rounded-xl px-3 py-2 text-sm font-bold hover:bg-stone-100 dark:hover:bg-stone-800"><UserRound size={17}/>Profile</button>
              <button onClick={()=>{nav('/settings');setProfileOpen(false)}} className="flex w-full gap-2 rounded-xl px-3 py-2 text-sm font-bold hover:bg-stone-100 dark:hover:bg-stone-800"><Settings size={17}/>Settings</button>
              <button onClick={logout} className="flex w-full gap-2 rounded-xl px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"><LogOut size={17}/>Logout</button>
            </div>}
          </div>
        </div>
      </header>
      <main className="p-4 lg:p-8"><Outlet/></main>
    </div>
  </div>
}
