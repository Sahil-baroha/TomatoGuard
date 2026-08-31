import { Bell, CheckCheck, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { defaultNotifications, readJSON, writeJSON } from '../lib/storage'

export default function NotificationMenu() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState(() => readJSON('tomatoNotifications', defaultNotifications))
  useEffect(() => writeJSON('tomatoNotifications', items), [items])
  const unread = items.filter(x => !x.read).length
  const mark = (id) => setItems(v => v.map(n => n.id === id ? { ...n, read: true } : n))
  return <div className="relative">
    <button onClick={() => setOpen(!open)} className="relative rounded-xl p-2 hover:bg-stone-100 dark:hover:bg-stone-800" aria-label="Notifications">
      <Bell size={21} />
      {unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">{unread}</span>}
    </button>
    {open && <div className="absolute right-0 top-12 z-50 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-stone-700 dark:bg-stone-900">
      <div className="flex items-center justify-between border-b border-stone-100 p-4 dark:border-stone-800"><div><p className="font-black">Notifications</p><p className="text-xs text-stone-500">{unread} unread</p></div><div className="flex gap-1"><button onClick={() => setItems(v => v.map(n => ({ ...n, read: true })))} className="rounded-lg p-2 hover:bg-stone-100 dark:hover:bg-stone-800" title="Mark all read"><CheckCheck size={18} /></button><button onClick={() => setItems([])} className="rounded-lg p-2 hover:bg-stone-100 dark:hover:bg-stone-800" title="Clear all"><Trash2 size={18} /></button></div></div>
      <div className="max-h-96 overflow-auto">{items.length ? items.map(n => <button key={n.id} onClick={() => mark(n.id)} className={`w-full border-b border-stone-100 p-4 text-left hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-800 ${!n.read ? 'bg-red-50/70 dark:bg-red-950/20' : ''}`}><div className="flex justify-between gap-3"><p className="font-bold">{n.title}</p><span className="text-[11px] text-stone-400">{n.time}</span></div><p className="mt-1 text-sm leading-5 text-stone-500">{n.message}</p></button>) : <p className="p-8 text-center text-sm text-stone-500">No notifications.</p>}</div>
    </div>}
  </div>
}
