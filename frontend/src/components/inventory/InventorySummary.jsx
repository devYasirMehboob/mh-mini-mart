import Icon from "../Icon";

const cards = [
  { key: "total_tracked", label: "Tracked products", icon: "inventory", styles: "bg-blue-50 text-blue-700 ring-blue-100" },
  { key: "in_stock", label: "In stock", icon: "check", styles: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  { key: "low_stock", label: "Low stock", icon: "alert", styles: "bg-amber-50 text-amber-700 ring-amber-100" },
  { key: "out_of_stock", label: "Out of stock", icon: "products", styles: "bg-red-50 text-red-700 ring-red-100" },
  { key: "movements_today", label: "Movements today", icon: "trend", styles: "bg-violet-50 text-violet-700 ring-violet-100" },
];

function InventorySummary({ summary }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Inventory summary">
      {cards.map((card) => (
        <article key={card.key} className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs font-semibold text-slate-500">{card.label}</p><p className="mt-3 text-2xl font-bold text-slate-900">{summary?.[card.key] ?? "—"}</p></div>
            <span className={"grid size-9 place-items-center rounded-xl ring-1 " + card.styles}><Icon name={card.icon} className="size-4" /></span>
          </div>
        </article>
      ))}
    </section>
  );
}

export default InventorySummary;
