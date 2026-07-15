import Icon from "../Icon";
import { display } from "./reportFormat";
const sortable = {
  sale_date: "date",
  purchase_date: "date",
  payment_date: "date",
  return_date: "date",
  expense_date: "date",
  transaction_date: "date",
  period_start: "date",
  invoice_number: "invoice_number",
  grand_total: "grand_total",
  amount: "amount",
  title: "title",
  product_name: "name",
  category_name: "name",
  quantity: "quantity",
  quantity_sold: "quantity_sold",
  net_sales: "net_sales",
  gross_sales: "gross_sales",
  gross_profit: "gross_profit",
  current_quantity: "stock",
  shortage: "shortage",
  cost_impact: "cost_impact",
  transaction_count: "transaction_count",
  status: "status",
};
function ReportTable({ rows, columns, filters, onSort }) {
  if (rows.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm overflow-x-auto">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-slate-50/80 border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-500">
          <tr>
            {columns.map(([key, title]) => (
              <th key={key} className="whitespace-nowrap px-5 py-4 font-bold">
                {sortable[key] ? (
                  <button
                    type="button"
                    onClick={() => onSort(sortable[key])}
                    className="group inline-flex items-center gap-1.5 hover:text-blue-600 transition"
                  >
                    {title}
                    {filters.sort_by === sortable[key] ? (
                      <Icon
                        name="arrow"
                        className={`size-3.5 text-blue-500 ${
                          filters.sort_direction === "asc"
                            ? "-rotate-90"
                            : "rotate-90"
                        }`}
                      />
                    ) : (
                      <Icon
                        name="arrow"
                        className="size-3.5 opacity-0 group-hover:opacity-30 rotate-90"
                      />
                    )}
                  </button>
                ) : (
                  title
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr
              key={
                row.id ||
                row.product_id ||
                row.category_id ||
                row.user_id ||
                row.period_key ||
                row.payment_method ||
                JSON.stringify(row)
              }
              className="hover:bg-slate-50/50 transition"
            >
              {columns.map(([key]) => (
                <td
                  key={key}
                  className={`max-w-64 px-5 py-4 ${
                    key.includes("status") ? "capitalize" : ""
                  } ${
                    [
                      "grand_total",
                      "amount",
                      "net_sales",
                      "gross_sales",
                      "gross_profit",
                      "cost_of_goods",
                      "estimated_net_profit",
                      "estimated_stock_value",
                      "cost_impact",
                    ].includes(key)
                      ? "font-extrabold text-slate-900"
                      : "text-slate-600"
                  }`}
                >
                  {key.includes("status") ? (
                    <span
                      className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        String(row[key]).includes("out") ||
                        row[key] === "cancelled" ||
                        row[key] === "voided"
                          ? "bg-red-50 text-red-700"
                          : String(row[key]).includes("low") ||
                              row[key] === "refunded"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {display(key, row[key])}
                    </span>
                  ) : (
                    display(key, row[key])
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default ReportTable;
