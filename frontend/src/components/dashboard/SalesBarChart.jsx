import { formatCurrency } from "../../utils/calculateSaleTotals";

function SalesBarChart({ title, subtitle, data = [], compact = false }) {
  const max = Math.max(...data.map((item) => Number(item.total)), 0);
  const hasSales = max > 0;

  return (
    <section className="premium-surface rounded-xl p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
        {hasSales && (
          <div className="flex items-center gap-2 self-start sm:self-auto rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            <span>Peak:</span>
            <span>{formatCurrency(max)}</span>
          </div>
        )}
      </div>

      {!hasSales ? (
        <div className="grid min-h-56 place-items-center text-center">
          <div>
            <p className="text-sm font-bold text-slate-600">No completed sales yet</p>
            <p className="mt-1 text-xs text-slate-400">Sales activity will appear here.</p>
          </div>
        </div>
      ) : (
        <div
          className={`mt-6 flex ${
            compact ? "h-52" : "h-64"
          } items-end gap-1 sm:gap-1.5 overflow-x-auto border-b border-slate-200 pb-2 pt-8 px-1 ${
            data.length < 8 ? "justify-center" : ""
          }`}
        >
          {data.map((item, index) => {
            const val = Number(item.total);
            const height = val > 0 ? Math.max(8, (val / max) * 100) : 0;
            const showLabel = compact
              ? index % 3 === 0 || index === data.length - 1
              : data.length <= 15
                ? true
                : index === 0 || index % 5 === 0 || index === data.length - 1;

            return (
              <div
                key={item.key}
                className="group relative flex h-full min-w-[12px] max-w-[32px] flex-1 flex-col items-center justify-end"
              >
                {/* Floating tooltip on hover */}
                <div className="pointer-events-none absolute -top-8 left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-bold text-white shadow-md group-hover:block">
                  {item.label}: {formatCurrency(item.total)} ({item.sales_count} sale{item.sales_count !== 1 ? "s" : ""})
                </div>

                {/* Bar column */}
                <div className="relative flex w-full flex-1 items-end justify-center">
                  <div
                    className={`w-full max-w-[20px] rounded-t-md transition-all duration-300 ${
                      val > 0
                        ? "bg-blue-600 group-hover:bg-blue-700 shadow-sm"
                        : "h-0.5 bg-slate-200 group-hover:bg-slate-300"
                    }`}
                    style={{ height: val > 0 ? `${height}%` : "2px" }}
                  />
                </div>

                {/* X-axis day / hour label */}
                <span className="mt-2 h-4 text-center text-[10px] font-semibold text-slate-400 select-none">
                  {showLabel ? item.label : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default SalesBarChart;
