import { Link } from 'react-router-dom'
import { ArrowRight, ScanLine, FlaskConical, CloudSun, ListChecks, Landmark, ShieldCheck, Heart, Sprout, Sun, Droplets, Mail, MapPin, MessageCircle } from 'lucide-react'
import Brand from '../components/Brand'

const features=[
 [ScanLine,'Tomato Disease Detection','Upload a tomato leaf image, validate it and send it for disease analysis.'],
 [FlaskConical,'Soil Intelligence','OCR a soil-test report, answer farmer questions and build one combined soil summary.'],
 [CloudSun,'Real-time Weather','Search a farm location and retrieve live forecast data for irrigation and crop planning.'],
 [ListChecks,'Daily Tomato Tasks','Turn analysis results into a simple daily crop-care tracking routine.'],
 [Landmark,'Government Schemes','Keep relevant farmer-support schemes visible from the same workspace.']
]

export default function Landing(){
 return <div className="bg-[#faf9f5] text-stone-800">
  <section className="hero-tomato min-h-[96vh] text-white">
   <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6">
    <Brand light/>
    <div className="hidden items-center gap-7 text-sm font-bold lg:flex"><a href="#about">Tomato Farming</a><a href="#features">Platform</a><a href="#guide">Growing Guide</a><a href="#contact">Contact</a></div>
    <div className="flex gap-2"><Link to="/login" className="rounded-xl px-4 py-2 font-black hover:bg-white/10">Sign in</Link><Link to="/signup" className="rounded-xl bg-red-600 px-4 py-2 font-black text-white hover:bg-red-500">Register</Link></div>
   </nav>
   <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-24 lg:grid-cols-[1.2fr_.8fr] lg:py-32">
    <div>
      <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[1.02] md:text-7xl">Grow healthier tomatoes with <span className="text-red-400">data-driven decisions.</span></h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-red-50/90">Track leaf health, understand soil reports, review field observations, check weather and organize daily crop-care activities from one place.</p>
      <div className="mt-8 flex flex-wrap gap-3"><Link to="/signup" className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-black hover:bg-red-500">Start tomato workspace <ArrowRight size={19}/></Link><a href="#about" className="rounded-xl border border-white/30 bg-white/10 px-6 py-3 font-black">Learn about tomato farming</a></div>
    </div>
    <div className="hidden rounded-[2rem] border border-white/15 bg-white/10 p-5 backdrop-blur-xl lg:block">
      <div className="rounded-3xl bg-[#fffaf7] p-6 text-stone-900"><p className="text-xs font-black uppercase tracking-[.18em] text-red-700">Tomato crop snapshot</p><h2 className="mt-2 text-2xl font-black">A clearer view of your tomato field.</h2><div className="mt-5 space-y-3">{[['Leaf health','Disease image screening'],['Root zone','Soil nutrients + questionnaire'],['Field conditions','Weather-aware decisions'],['Daily work','Track crop-care tasks']].map(([a,b])=><div key={a} className="rounded-2xl bg-red-50 p-4"><p className="font-black">{a}</p><p className="text-sm text-stone-500">{b}</p></div>)}</div></div>
    </div>
   </div>
  </section>

  <section id="about" className="mx-auto max-w-7xl px-5 py-24">
    <p className="text-xs font-black uppercase tracking-[.2em] text-red-700">Why tomato farming?</p>
    <div className="mt-3 grid gap-10 lg:grid-cols-2"><div><h2 className="text-4xl font-black md:text-5xl">Tomato is valuable, but crop decisions need timing.</h2><p className="mt-5 text-lg leading-8 text-stone-600">Tomato is a widely grown horticultural crop used fresh and in processed foods. Good production depends on healthy seedlings, suitable soil, balanced water and nutrients, disease monitoring and timely harvesting. This platform keeps those tomato-specific signals together instead of treating every crop the same.</p></div>
    <div className="grid gap-4 sm:grid-cols-2">{[[Heart,'Food value','Tomatoes contribute nutrients including vitamin C and carotenoids such as lycopene.'],[Sprout,'High management value','Regular observation helps farmers react earlier to crop stress.'],[Sun,'Climate-sensitive','Temperature, rainfall and humidity can influence flowering, disease pressure and irrigation needs.'],[Droplets,'Water decisions','Tomato performs best when water management avoids both prolonged stress and unnecessary excess.']].map(([I,t,d])=><div className="card p-5" key={t}><I className="text-red-700"/><h3 className="mt-4 font-black">{t}</h3><p className="mt-2 text-sm leading-6 text-stone-500">{d}</p></div>)}</div></div>
  </section>

  <section id="features" className="bg-[#421c15] py-24 text-white"><div className="mx-auto max-w-7xl px-5"><p className="text-xs font-black uppercase tracking-[.2em] text-red-300">Platform modules</p><h2 className="mt-3 max-w-3xl text-4xl font-black md:text-5xl">Everything you need for day-to-day crop management.</h2><div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-5">{features.map(([I,t,d])=><div key={t} className="rounded-3xl border border-white/10 bg-white/5 p-6"><I className="text-red-300"/><h3 className="mt-5 text-xl font-black">{t}</h3><p className="mt-3 text-sm leading-6 text-red-50/80">{d}</p></div>)}</div></div></section>

  <section id="guide" className="mx-auto max-w-7xl px-5 py-24"><p className="text-xs font-black uppercase tracking-[.2em] text-red-700">Tomato growing flow</p><h2 className="mt-3 text-4xl font-black">A simple crop lifecycle view.</h2><div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{[['01','Seedling & nursery','Start with healthy seedlings and clean growing conditions.'],['02','Transplant & establish','Monitor water, root-zone condition and early stress after transplanting.'],['03','Flowering & fruiting','Watch crop health, nutrient balance, weather and disease risk closely.'],['04','Harvest & records','Harvest at the required maturity and keep records for the next cycle.']].map(([n,t,d])=><div className="card p-6" key={n}><span className="text-3xl font-black text-red-600">{n}</span><h3 className="mt-4 text-xl font-black">{t}</h3><p className="mt-2 leading-6 text-stone-500">{d}</p></div>)}</div><p className="mt-5 text-sm text-stone-500">Actual field recommendations depend on tomato variety, local climate, soil test, irrigation system and local agronomy guidance.</p></section>

  <section className="bg-red-50 py-20"><div className="mx-auto max-w-7xl px-5"><div className="grid gap-6 md:grid-cols-3">{[['1','Register / Sign in','Create a farmer profile or access an existing account.'],['2','Analyze tomato field data','Use disease, soil and weather modules.'],['3','Follow daily decisions','Track tasks, notifications, reports and relevant schemes.']].map(([n,t,d])=><div className="rounded-3xl bg-white p-6"><span className="grid h-10 w-10 place-items-center rounded-xl bg-red-600 font-black text-white">{n}</span><h3 className="mt-4 text-xl font-black">{t}</h3><p className="mt-2 text-stone-500">{d}</p></div>)}</div></div></section>

  <section id="contact" className="mx-auto max-w-7xl px-5 py-24"><div className="grid gap-8 rounded-[2rem] bg-stone-900 p-8 text-white md:p-12 lg:grid-cols-2"><div><p className="text-xs font-black uppercase tracking-[.2em] text-red-300">Contact</p><h2 className="mt-3 text-4xl font-black">Need help with the platform?</h2><div className="mt-7 space-y-3 text-sm"><p className="flex gap-3"><Mail size={18}/> tomatoguard@example.com</p><p className="flex gap-3"><MapPin size={18}/> Nagpur, Maharashtra 440036</p><p className="flex gap-3"><MessageCircle size={18}/> +91 xxxxxxxxxx</p></div></div><ContactForm/></div></section>
  <footer className="border-t border-stone-200 bg-white py-8"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 text-sm text-stone-500 md:flex-row md:items-center md:justify-between"><Brand/><p>TomatoGuard AI · Smart Tomato Farm Management</p></div></footer>
 </div>
}
function ContactForm(){return <form onSubmit={e=>{e.preventDefault();e.currentTarget.reset();alert('Demo: message captured. Connect this form to your backend/email service.')}} className="rounded-3xl bg-white p-6 text-stone-900"><input className="input" placeholder="Your name" required/><input className="input mt-3" type="email" placeholder="Email" required/><textarea className="input mt-3 min-h-28" placeholder="How can we help?" required/><button className="mt-3 w-full rounded-xl bg-red-600 py-3 font-black text-white">Send message</button></form>}
