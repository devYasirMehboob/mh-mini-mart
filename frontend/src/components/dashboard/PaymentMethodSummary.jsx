import { formatCurrency } from "../../utils/calculateSaleTotals";

const labels = { cash: "Cash", card: "Card", bank_transfer: "Bank transfer", easypaisa: "Easypaisa", jazzcash: "JazzCash" };

function PaymentMethodSummary({ methods }) {
  const total = methods.reduce((sum, item) => sum + Number(item.total), 0);
  return (
    <section className="premium-surface rounded-xl p-5 sm:p-6">
      <h3 className="text-base font-extrabold text-slate-900">Payment methods</h3><p className="mt-1 text-xs text-slate-500">Completed sales for the current month.</p>
      {methods.length === 0 ? <p className="py-14 text-center text-sm text-slate-400">No payment data available.</p> : <div className="mt-5 space-y-4">{methods.map((method) => { const percent = total > 0 ? (Number(method.total) / total) * 100 : 0; return <div key={method.payment_method}><div className="mb-2 flex items-center justify-between gap-3 text-xs"><span className="font-bold text-slate-700">{labels[method.payment_method] || method.payment_method}</span><span className="text-right text-slate-500">{formatCurrency(method.total)} <small className="ml-1 text-slate-400">({method.sales_count})</small></span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${percent}%` }} /></div></div>; })}</div>}
    </section>
  );
}

export default PaymentMethodSummary;
