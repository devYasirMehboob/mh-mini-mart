import Icon from "../Icon";
import { moneyKeys } from "./reportConfig";
import { display, label } from "./reportFormat";
const preferred = [
  "gross_sales",
  "net_sales",
  "total_discounts",
  "discounts",
  "cost_of_goods",
  "gross_profit",
  "total_expenses",
  "estimated_net_profit",
  "completed_sales",
  "expense_count",
  "total_expenses",
  "stock_value",
  "low_stock_count",
  "out_of_stock_count",
  "refunded_amount",
  "average_sale_value",
  "transaction_count",
  "estimated_cost_impact",
  "total_purchases",
  "amount_paid",
  "balance_due",
  "total_supplier_balance",
  "total_paid",
  "total_returned",
  "total_refunded",
];
function ReportSummaryCards({ summary = {} }) {
  const keys = [...new Set([...preferred, ...Object.keys(summary)])]
    .filter(
      (key) =>
        summary[key] !== undefined &&
        summary[key] !== null &&
        !Array.isArray(summary[key]) &&
        typeof summary[key] !== "object",
    )
    .slice(0, 8);
  if (keys.length === 0) return null;
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {keys.map((key, index) => (
        <article
          key={key}
          className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div className="flex items-center gap-4">
            <span
              className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
                index % 4 === 0
                  ? "bg-blue-50 text-blue-600"
                  : index % 4 === 1
                    ? "bg-emerald-50 text-emerald-600"
                    : index % 4 === 2
                      ? "bg-amber-50 text-amber-600"
                      : "bg-violet-50 text-violet-600"
              }`}
            >
              <Icon
                name={
                  moneyKeys.has(key)
                    ? "cash"
                    : key.includes("stock")
                      ? "inventory"
                      : "reports"
                }
                className="size-5"
              />
            </span>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                {label(key)}
              </p>
              <strong className="mt-1 block text-xl font-black text-slate-900">
                {display(key, summary[key])}
              </strong>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
export default ReportSummaryCards;
