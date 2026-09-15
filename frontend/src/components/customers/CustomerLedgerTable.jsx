import { formatCurrency } from "../../utils/calculateSaleTotals";

const ENTRY_TYPES = {
  credit_sale: { label: "Credit Sale", color: "text-red-600" },
  sale_payment: { label: "Sale Payment", color: "text-emerald-600" },
  customer_payment: { label: "Khata Payment", color: "text-emerald-600" },
  opening_balance: { label: "Opening Balance", color: "text-slate-500" },
  refund: { label: "Refund", color: "text-blue-600" },
  sale_cancellation: { label: "Sale Cancelled", color: "text-slate-500" },
  debit_adjustment: { label: "Debit Adj.", color: "text-red-600" },
  credit_adjustment: { label: "Credit Adj.", color: "text-emerald-600" },
  payment_reversal: { label: "Payment Reversed", color: "text-amber-600" },
};

function CustomerLedgerTable({ entries = [] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-slate-100 bg-white py-12 text-center">
        <p className="text-sm text-slate-400">No ledger entries yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              <th className="px-4 py-2.5 text-left">Date</th>
              <th className="px-4 py-2.5 text-left">Entry #</th>
              <th className="px-4 py-2.5 text-left">Type</th>
              <th className="px-4 py-2.5 text-left">Description</th>
              <th className="px-4 py-2.5 text-right">Debit</th>
              <th className="px-4 py-2.5 text-right">Credit</th>
              <th className="px-4 py-2.5 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const typeInfo = ENTRY_TYPES[entry.entry_type] || { label: entry.entry_type, color: "text-slate-600" };
              const debit = Number(entry.debit_amount || 0);
              const credit = Number(entry.credit_amount || 0);
              const balance = Number(entry.balance_after || 0);
              return (
                <tr key={entry.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{entry.entry_date}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-600 whitespace-nowrap">{entry.entry_number}</td>
                  <td className={`px-4 py-2.5 font-semibold whitespace-nowrap ${typeInfo.color}`}>{typeInfo.label}</td>
                  <td className="px-4 py-2.5 text-slate-600 max-w-xs truncate">{entry.description}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-red-600 whitespace-nowrap">
                    {debit > 0 ? formatCurrency(debit) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-emerald-600 whitespace-nowrap">
                    {credit > 0 ? formatCurrency(credit) : "—"}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-bold whitespace-nowrap ${balance > 0 ? "text-red-700" : "text-slate-700"}`}>
                    {formatCurrency(balance)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CustomerLedgerTable;
