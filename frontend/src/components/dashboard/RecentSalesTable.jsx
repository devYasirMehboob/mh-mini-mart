import { formatCurrency, formatDateTime } from "../../utils/calculateSaleTotals";

function RecentSalesTable({ sales }) {
  return (
    <section className="premium-surface overflow-hidden rounded-xl">
      <div className="border-b border-slate-100 p-5 sm:px-6"><h3 className="text-base font-extrabold text-slate-900">Recent sales</h3><p className="mt-1 text-xs text-slate-500">Latest completed transactions.</p></div>
      {sales.length === 0 ? <p className="px-6 py-14 text-center text-sm text-slate-400">No completed sales to show.</p> : (
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-6 py-3 font-bold">Invoice</th><th className="px-4 py-3 font-bold">Date</th><th className="px-4 py-3 font-bold">Cashier</th><th className="px-4 py-3 font-bold">Payment</th><th className="px-4 py-3 font-bold">Status</th><th className="px-6 py-3 text-right font-bold">Total</th></tr></thead><tbody className="divide-y divide-slate-100">{sales.map((sale) => <tr key={sale.id} className="hover:bg-slate-50/70"><td className="px-6 py-3.5 font-bold text-slate-800">{sale.invoice_number}</td><td className="px-4 py-3.5 text-slate-500">{formatDateTime(sale.created_at)}</td><td className="px-4 py-3.5 capitalize text-slate-500">{sale.cashier_role}</td><td className="px-4 py-3.5 capitalize text-slate-500">{sale.payment_method.replace("_", " ")}</td><td className="px-4 py-3.5"><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold capitalize text-emerald-700">{sale.status}</span></td><td className="px-6 py-3.5 text-right font-extrabold text-slate-900">{formatCurrency(sale.grand_total)}</td></tr>)}</tbody></table></div>
      )}
    </section>
  );
}

export default RecentSalesTable;
