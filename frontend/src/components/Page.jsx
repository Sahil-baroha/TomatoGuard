export default function Page({eyebrow='TOMATOGUARD AI',title,sub,children,action}){
 return <div><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-xs font-black uppercase tracking-[.2em] text-red-700 dark:text-red-400">{eyebrow}</p><h1 className="mt-1 text-3xl font-black text-stone-900 dark:text-white">{title}</h1><p className="mt-2 max-w-3xl text-stone-500">{sub}</p></div>{action}</div><div className="mt-7">{children}</div></div>
}
