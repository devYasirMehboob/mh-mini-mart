import Icon from "../Icon";
import { formatCurrency } from "../../utils/calculateSaleTotals";
import SaleStatusBadge from "./SaleStatusBadge";

function SalesTable({ sales, permissions, onView, onReceipt, onAction }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1400px] text-left text-xs">
        <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
          <tr>
            <th className="px-4 py-3 font-bold">#</th>
            {["Invoice", "Date & Time", "Cashier", "Customer", "Items", "Subtotal", "Discount", "Tax", "Grand total", "Payment", "Payment status", "Sale status", "Actions"].map((label) => (
              <th key={label} className={`px-4 py-3 font-bold ${["Subtotal", "Discount", "Tax", "Grand total", "Actions"].includes(label) ? "text-right" : ""}`}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sales.map((sale, index) => {
            const date = new Date(sale.created_at.replace(" ", "T"));
            
            let paymentLabel = sale.payment_method.replaceAll("_", " ");
            if (sale.payment_method === "cash") {
              const received = Number(sale.amount_received || 0);
              const total = Number(sale.grand_total || 0);
              if (received === 0 && total > 0) paymentLabel = "Khata";
              else if (received > 0 && received < total) paymentLabel = "Cash / Khata";
            }

            const isCancelled = sale.status === "cancelled";

            return (
              <tr key={sale.id} className={`${isCancelled ? "bg-red-50/40 hover:bg-red-50/60" : "hover:bg-slate-50/70"}`}>
                <td className={`px-4 py-3.5 font-medium ${isCancelled ? "text-red-400" : "text-slate-400"}`}>{index + 1}</td>
                <td className={`px-4 py-3.5 font-extrabold ${isCancelled ? "text-red-900 line-through opacity-60" : "text-slate-900"}`}>{sale.invoice_number}</td>
                <td className={`px-4 py-3.5 whitespace-nowrap ${isCancelled ? "text-red-500" : "text-slate-500"}`}>
                  <div>{date.toLocaleDateString("en-PK", { dateStyle: "medium" })}</div>
                  <div className="text-[10px]">{date.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}</div>
                </td>
                <td className={`px-4 py-3.5 capitalize font-medium ${isCancelled ? "text-red-600" : "text-slate-600"}`}>
                  {sale.cashier_name}
                </td>
                <td className="px-4 py-3.5">
                  <strong className={`block ${isCancelled ? "text-red-800" : "text-slate-700"}`}>{sale.customer_name || "Walk-in customer"}</strong>
                  {sale.customer_phone && <small className={isCancelled ? "text-red-400" : "text-slate-400"}>{sale.customer_phone}</small>}
                </td>
                <td className={`px-4 py-3.5 font-bold ${isCancelled ? "text-red-500" : "text-slate-600"}`}>{sale.item_count}</td>
                <td className={`px-4 py-3.5 text-right ${isCancelled ? "text-red-500" : "text-slate-600"}`}>{formatCurrency(sale.subtotal)}</td>
                <td className={`px-4 py-3.5 text-right ${isCancelled ? "text-red-500" : "text-slate-600"}`}>{formatCurrency(sale.discount_amount)}</td>
                <td className={`px-4 py-3.5 text-right ${isCancelled ? "text-red-500" : "text-slate-600"}`}>{formatCurrency(sale.tax_amount)}</td>
                <td className={`px-4 py-3.5 text-right font-extrabold ${isCancelled ? "text-red-900 line-through opacity-60" : "text-slate-950"}`}>{formatCurrency(sale.grand_total)}</td>
                <td className={`px-4 py-3.5 capitalize ${isCancelled ? "text-red-500" : "text-slate-600"}`}>{paymentLabel}</td>
                <td className="px-4 py-3.5">
                  <SaleStatusBadge status={isCancelled ? "cancelled" : sale.payment_status} />
                </td>
                <td className="px-4 py-3.5">
                  <SaleStatusBadge status={sale.status} />
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex flex-col items-end gap-1.5">
                    {/* Row 1: View & Print */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onView(sale)}
                        className="inline-flex size-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-2xs transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                        title="View details"
                      >
                        <Icon name="eye" className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onReceipt(sale)}
                        className="inline-flex size-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-2xs transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                        title="View receipt"
                      >
                        <Icon name="print" className="size-3.5" />
                      </button>
                    </div>

                    {/* Row 2: Cancel & Refund */}
                    {(permissions.can_cancel || permissions.can_refund) && sale.status === "completed" && (
                      <div className="flex items-center gap-1.5">
                        {permissions.can_cancel && (
                          <button
                            type="button"
                            onClick={() => onAction("cancel", sale)}
                            className="inline-flex h-5 items-center rounded-md border border-red-200 bg-red-50/70 px-2 text-[10px] font-bold text-red-600 transition hover:bg-red-100 hover:border-red-300"
                          >
                            Cancel
                          </button>
                        )}
                        {permissions.can_refund && (
                          <button
                            type="button"
                            onClick={() => onAction("refund", sale)}
                            className="inline-flex h-5 items-center rounded-md border border-amber-200 bg-amber-50/70 px-2 text-[10px] font-bold text-amber-700 transition hover:bg-amber-100 hover:border-amber-300"
                          >
                            Refund
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default SalesTable;
