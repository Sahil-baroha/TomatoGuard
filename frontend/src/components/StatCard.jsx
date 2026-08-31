export default function StatCard({icon:Icon,label,value,note,tone='red'}){
 const colors=tone==='green'?'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300':tone==='blue'?'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300':'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
 return <div className="card p-5"><div className="flex items-center justify-between"><div><p className="text-sm text-stone-500">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div><div className={`rounded-2xl p-3 ${colors}`}><Icon/></div></div><p className="mt-3 text-xs font-medium text-stone-500">{note}</p></div>
}
