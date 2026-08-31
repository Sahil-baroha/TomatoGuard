import { ExternalLink, Landmark, ShieldCheck, TestTube2, Flower2 } from 'lucide-react'
import Page from '../components/Page'

const schemes=[
 {name:'PM-KISAN',desc:'Central government income-support scheme for eligible landholding farmer families.',url:'https://pmkisan.gov.in/',icon:Landmark},
 {name:'Pradhan Mantri Fasal Bima Yojana (PMFBY)',desc:'Government-sponsored crop insurance platform. Crop/season eligibility depends on notified implementation.',url:'https://pmfby.gov.in/',icon:ShieldCheck},
 {name:'Soil Health Card',desc:'Government soil-health platform for soil nutrient information and soil testing support.',url:'https://soilhealth.dac.gov.in/',icon:TestTube2},
 {name:'Mission for Integrated Development of Horticulture (MIDH)',desc:'Horticulture-focused government mission. Availability and assistance depend on programme components and local implementation.',url:'https://midh.gov.in/',icon:Flower2}
]
export default function Schemes(){return <Page title="Government Schemes" sub="Quick links to official farmer and horticulture portals. Always verify current eligibility, notified crops, dates and state-specific rules on the official portal."><div className="grid gap-5 md:grid-cols-2">{schemes.map(s=><div className="card p-6" key={s.name}><div className="inline-block rounded-2xl bg-red-100 p-3 text-red-700 dark:bg-red-950 dark:text-red-300"><s.icon/></div><h2 className="mt-4 text-xl font-black">{s.name}</h2><p className="mt-2 min-h-16 leading-6 text-stone-500">{s.desc}</p><a href={s.url} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-3 text-sm font-black text-white dark:bg-white dark:text-stone-900">Open official portal <ExternalLink size={16}/></a></div>)}</div></Page>}
