import Icon from "../Icon";
import { formatCurrency } from "../../utils/calculateSaleTotals";
const cards = [
  ["Total sales", "total_sales", "sales", "blue"], ["Gross sales", "gross_sales", "trend", "emerald"],
  ["Discounts", "total_discounts", "expenses", "violet"], ["Net sales", "net_sales", "profit", "emerald"],
  ["Refunded", "refunded_amount", "refund", "amber"], ["Cancelled", "cancelled_sales", "alert", "slate"],
];
const tones={blue:"bg-blue-50 text-blue-700",emerald:"bg-emerald-50 text-emerald-700",violet:"bg-violet-50 text-violet-700",amber:"bg-amber-50 text-amber-700",slate:"bg-slate-100 text-slate-600"};
function SalesSummaryCards({ summary }) { return <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{cards.map(([label,key,icon,tone])=><article key={key} className="premium-surface rounded-xl p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><strong className="mt-2 block text-lg font-extrabold text-slate-950">{key.includes("sales")&&key!=="gross_sales"&&key!=="net_sales"?Number(summary[key]||0):formatCurrency(summary[key])}</strong></div><span className={`grid size-8 place-items-center rounded-lg ${tones[tone]}`}><Icon name={icon} className="size-4" /></span></div></article>)}</section>; }
export default SalesSummaryCards;
