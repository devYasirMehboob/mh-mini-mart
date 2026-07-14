import Icon from "../Icon";
import {formatCurrency} from "../../utils/calculateSaleTotals";
const cards=[['Filtered total','total_amount','expenses','blue'],['Entries','expense_count','sales','slate'],['Today','today_amount','clock','emerald'],['This week','week_amount','trend','amber'],['This month','month_amount','reports','violet'],['Highest','highest_amount','trend','amber']];
const tones={blue:'bg-blue-50 text-blue-600',slate:'bg-slate-100 text-slate-600',emerald:'bg-emerald-50 text-emerald-600',amber:'bg-amber-50 text-amber-600',violet:'bg-violet-50 text-violet-600'};
function ExpenseSummaryCards({summary}){return <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{cards.map(([label,key,icon,tone])=><article key={key} className="premium-surface rounded-xl p-4"><div className="flex justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><strong className="mt-2 block text-lg font-extrabold text-slate-950">{key==='expense_count'?Number(summary[key]||0):formatCurrency(summary[key])}</strong></div><span className={`grid size-8 place-items-center rounded-lg ${tones[tone]}`}><Icon name={icon} className="size-4"/></span></div></article>)}</section>}
export default ExpenseSummaryCards;

