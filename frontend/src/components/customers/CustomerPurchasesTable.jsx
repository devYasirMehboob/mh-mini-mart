import { Link } from "react-router-dom";
import { formatCurrency } from "../../utils/calculateSaleTotals";

const STATUS_COLORS = {
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-500",
  refunded: "bg-red-100 text-red-600",
};

const PAYMENT_COLORS = {
  paid: "bg-emerald-100 text-emerald-700",
  partial: "bg-amber-100 text-amber-700",
  pending: "bg-red-100 text-red-600",
};

function CustomerPurchasesTable({ purchases = [], onViewSale }) {
  if (purchases.length === 0) {
    return (
      <div className="rounded-xl border border-slate-100 bg-white py-12 text-center">
        <p className="text-sm text-slate-400">No purchases found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              <th className="px-4 py-2.5 text-left">Invoice</th>
              <th className="px-4 py-2.5 text-left">Date</th>
              <th className="px-4 py-2.5 text-left">Cashier</th>
              <th className="px-4 py-2.5 text-right">Total</th>
              <th className="px-4 py-2.5 text-right">Received</th>
              <th className="px-4 py-2.5 text-right">Credit</th>
              <th className="px-4 py-2.5 text-center">Payment</th>
              <th className="px-4 py-2.5 text-center">Status</th>
              <th className="px-4 py-2.5 text-center">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                <td className="px-4 py-2.5 font-mono font-semibold text-slate-700">{p.invoice_number}</td>
                <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                  {new Date(p.created_at).toLocaleDateString("en-PK")}
                </td>
                <td className="px-4 py-2.5 text-slate-600">{p.cashier_name}</td>
                <td className="px-4 py-2.5 text-right font-bold text-slate-900">{formatCurrency(p.grand_total)}</td>
                <td className="px-4 py-2.5 text-right text-slate-600">{formatCurrency(p.amount_received)}</td>
                <td className="px-4 py-2.5 text-right text-red-600 font-semibold">
                  {Number(p.credit_amount || 0) > 0 ? formatCurrency(p.credit_amount) : "—"}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${PAYMENT_COLORS[p.status === 'cancelled' ? 'cancelled' : p.payment_status] || "bg-slate-100 text-slate-500"}`}>
                    {p.status === 'cancelled' ? 'cancelled' : p.payment_status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${STATUS_COLORS[p.status] || "bg-slate-100 text-slate-500"}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <button
                    type="button"
                    onClick={() => onViewSale(p.id)}
                    className="text-blue-600 hover:text-blue-800 hover:underline text-[10px] font-bold"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CustomerPurchasesTable;
