import Icon from "../Icon";
import { formatCurrency } from "../../utils/calculateSaleTotals";

const tones = {
  blue: "bg-blue-50 text-blue-700 ring-blue-100",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  violet: "bg-violet-50 text-violet-700 ring-violet-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  red: "bg-red-50 text-red-700 ring-red-100",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
};

function SummaryCards({ summary, canViewFinancials }) {
  const cards = [
    { label: "Today's sales", value: formatCurrency(summary.today_sales), detail: "Net completed sales", icon: "trend", tone: "emerald" },
    { label: "Sales count", value: summary.sales_count, detail: "Completed transactions today", icon: "sales", tone: "blue" },
    { label: "Active products", value: summary.total_products, detail: "Available catalogue products", icon: "products", tone: "violet" },
    { label: "Low stock", value: summary.low_stock_count, detail: "Tracked items needing attention", icon: "alert", tone: "amber" },
    { label: "Out of stock", value: summary.out_of_stock_count, detail: "Tracked items at zero", icon: "inventory", tone: "red" },
    ...(canViewFinancials ? [
      { label: "Today's expenses", value: formatCurrency(summary.today_expenses), detail: "Recorded expenses today", icon: "expenses", tone: "slate" },
      { label: "Estimated profit", value: formatCurrency(summary.estimated_profit), detail: "Net sales minus cost and expenses", icon: "profit", tone: "emerald" },
    ] : []),
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Shop summary">
      {cards.map((card) => (
        <article key={card.label} className="premium-surface rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0"><p className="text-xs font-bold text-slate-500">{card.label}</p><p className="mt-3 truncate text-2xl font-extrabold tracking-tight text-slate-950">{card.value}</p></div>
            <span className={`grid size-10 shrink-0 place-items-center rounded-xl ring-1 ${tones[card.tone]}`}><Icon name={card.icon} className="size-[18px]" /></span>
          </div>
          <p className="mt-4 text-xs text-slate-400">{card.detail}</p>
        </article>
      ))}
    </section>
  );
}

export default SummaryCards;
