import Icon from "../Icon";
import { formatCurrency } from "../../utils/calculateSaleTotals";

const methods = [
  ["cash", "Cash", "cash"],
  ["card", "Card", "card"],
  ["bank_transfer", "Bank", "bank"],
  ["mobile_wallet", "Wallet", "wallet"],
  ["other", "Other", "other"],
];

const inputClass = "min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50";

function PaymentPanel({ values, total, onChange }) {
  const change = values.payment_method === "cash" ? Math.max(0, Number(values.amount_received || 0) - total) : 0;

  return (
    <section className="border-t border-slate-100 bg-white p-5">
      <div className="flex items-start justify-between gap-3"><div><h4 className="text-sm font-extrabold text-slate-900">Payment</h4><p className="mt-1 text-[10px] text-slate-400">Choose how the customer is paying.</p></div><span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon name="cash" className="size-4" /></span></div>
      <div className="mt-4 grid grid-cols-5 gap-1.5">
        {methods.map(([value, label, icon]) => (
          <label key={value} className={`cursor-pointer rounded-xl border px-1 py-2.5 text-center transition ${values.payment_method === value ? "border-blue-200 bg-blue-50 text-blue-700 ring-1 ring-blue-100" : "border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-700"}`}>
            <input className="sr-only" type="radio" name="payment_method" value={value} checked={values.payment_method === value} onChange={onChange} />
            <Icon name={icon} className="mx-auto size-4" />
            <span className="mt-1.5 block text-[9px] font-extrabold">{label}</span>
          </label>
        ))}
      </div>
      {values.payment_method === "cash" ? (
        <div className="mt-4 grid grid-cols-[1fr_auto] items-end gap-3">
          <label><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Cash received</span><input name="amount_received" value={values.amount_received} onChange={onChange} type="number" min="0" step="0.01" className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-base font-extrabold text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50" placeholder="0.00" /></label>
          <div className="min-w-28 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-right"><small className="block text-[9px] font-extrabold uppercase tracking-wider text-emerald-600">Change</small><strong className="mt-1 block text-sm text-emerald-800">{formatCurrency(change)}</strong></div>
        </div>
      ) : (
        <label className="mt-4 block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment reference (optional)</span><input name="payment_reference" maxLength="150" value={values.payment_reference} onChange={onChange} className={inputClass} placeholder="Transaction or reference number" /></label>
      )}
      <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 open:bg-white">
        <summary className="cursor-pointer px-3.5 py-3 text-xs font-bold text-slate-600">Customer details & note <span className="font-medium text-slate-400">(optional)</span></summary>
        <div className="grid gap-2 border-t border-slate-200 p-3 sm:grid-cols-2"><input name="customer_name" maxLength="150" value={values.customer_name} onChange={onChange} placeholder="Customer name" className={inputClass} /><input name="customer_phone" maxLength="30" value={values.customer_phone} onChange={onChange} placeholder="Customer phone" className={inputClass} /><textarea name="note" maxLength="1000" value={values.note} onChange={onChange} placeholder="Sale note" className={`${inputClass} min-h-16 py-2 sm:col-span-2`} /></div>
      </details>
    </section>
  );
}

export default PaymentPanel;
