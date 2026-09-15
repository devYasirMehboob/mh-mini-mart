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
              <th key={label} className={`px-4 py-3 font-bold ${["Subtotal", "Discount", "Tax", "Grand total"].includes(label) ? "text-right" : ""}`}>
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
                <td className="px-4 py-3.5">
                  <div className="grid grid-cols-2 gap-1 w-max">
                    <button type="button" onClick={() => onView(sale)} className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600" title="View details">
                      <Icon name="eye" className="size-4" />
                    </button>
                    <button type="button" onClick={() => onReceipt(sale)} className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600" title="View receipt">
                      <Icon name="print" className="size-4" />
                    </button>
                    {permissions.can_cancel && sale.status === "completed" && (
                      <button type="button" onClick={() => onAction("cancel", sale)} className="rounded-lg px-2 py-1 text-[10px] font-bold text-red-600 hover:bg-red-50 text-center">
                        Cancel
                      </button>
                    )}
                    {permissions.can_refund && sale.status === "completed" && (
                      <button type="button" onClick={() => onAction("refund", sale)} className="rounded-lg px-2 py-1 text-[10px] font-bold text-amber-700 hover:bg-amber-50 text-center">
                        Refund
                      </button>
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
