import { Cherry } from 'lucide-react'
export default function Brand({ light=false, compact=false }) {
  return (
    <div className="flex items-center gap-2.5 font-black tracking-tight">
      <span className={`grid h-10 w-10 place-items-center rounded-2xl ${light ? 'bg-white/15 text-white' : 'bg-red-700 text-white'}`}>
        <Cherry size={22}/>
      </span>
      {!compact && <span className={light ? 'text-white' : 'text-stone-900 dark:text-white'}>TomatoGuard <span className="text-red-500">AI</span></span>}
    </div>
  )
}
