import { formatCurrency } from "../../utils/calculateSaleTotals";

function SalesBarChart({ title, subtitle, data, compact = false }) {
  const max = Math.max(...data.map((item) => Number(item.total)), 0);
  const hasSales = max > 0;

  return (
    <section className="premium-surface rounded-xl p-5 sm:p-6">
      <div><h3 className="text-base font-extrabold text-slate-900">{title}</h3><p className="mt-1 text-xs text-slate-500">{subtitle}</p></div>
      {!hasSales ? (
        <div className="grid min-h-56 place-items-center text-center"><div><p className="text-sm font-bold text-slate-600">No completed sales yet</p><p className="mt-1 text-xs text-slate-400">Sales activity will appear here.</p></div></div>
      ) : (
        <div className={`mt-6 flex ${compact ? "h-52" : "h-64"} items-end gap-1.5 overflow-x-auto border-b border-slate-200 pb-1`}>
          {data.map((item, index) => {
            const height = Math.max(4, (Number(item.total) / max) * 100);
            const showLabel = compact ? index % 3 === 0 : index % Math.max(1, Math.ceil(data.length / 12)) === 0;
            return (
              <div key={item.key} className="group flex h-full min-w-5 flex-1 flex-col justify-end" title={`${item.label}: ${formatCurrency(item.total)} · ${item.sales_count} sale(s)`}>
                <div className="relative flex flex-1 items-end"><div className="w-full rounded-t-md bg-blue-500 transition-colors group-hover:bg-blue-600" style={{ height: `${height}%` }} /></div>
                <span className="mt-2 h-4 text-center text-[9px] font-semibold text-slate-400">{showLabel ? item.label : ""}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default SalesBarChart;
