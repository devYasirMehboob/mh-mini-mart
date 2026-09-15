// KhataSettlementPreview — shows running settlement calculation in POS cart
// Renders the mini summary of: prev balance + current bill - received = new outstanding

import { formatCurrency } from "../../utils/calculateSaleTotals";

function Row({ label, value, className = "" }) {
  return (
    <div className={`flex items-center justify-between py-0.5 ${className}`}>
      <span className="text-[10px] text-slate-500">{label}</span>
      <span className="text-[10px] font-bold text-slate-800">{value}</span>
    </div>
  );
}

function KhataSettlementPreview({ customer, grandTotal, amountReceived, paymentMethod }) {
  if (!customer || !customer.id) return null;

  const prevBalance = Number(customer.current_balance || 0);
  const bill = Number(grandTotal || 0);
  const received = paymentMethod === "khata" ? 0 : (paymentMethod === "cash" ? Number(amountReceived || 0) : bill);

  const net = prevBalance + bill - received;
  const newOutstanding = Math.max(0, net);
  const creditAmount = Math.max(0, bill - Math.min(received, bill));

  const isCreditSale = creditAmount > 0;
  const isFullyPaid = net <= 0 && prevBalance === 0;
  const hasOldBalance = prevBalance > 0;

  return (
    <div className={`mt-3 rounded-xl border px-3 py-2 ${isCreditSale ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
      <p className="mb-1.5 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
        Khata Settlement
      </p>

      {hasOldBalance && (
        <Row label="Previous outstanding" value={formatCurrency(prevBalance)} className="text-red-600" />
      )}
      <Row label="This sale" value={formatCurrency(bill)} />
      {received > 0 && (
        <Row label="Amount received" value={`– ${formatCurrency(received)}`} className="text-emerald-700" />
      )}

      <div className="my-1.5 border-t border-slate-200" />

      {isCreditSale ? (
        <>
          <Row
            label="Credit added to khata"
            value={formatCurrency(creditAmount)}
            className="text-amber-700"
          />
          <Row
            label="New outstanding"
            value={formatCurrency(newOutstanding)}
            className="font-extrabold text-red-700"
          />
        </>
      ) : (
        <Row
          label="Balance after sale"
          value={formatCurrency(newOutstanding)}
          className={newOutstanding === 0 ? "text-emerald-700" : "text-red-700"}
        />
      )}
    </div>
  );
}

export default KhataSettlementPreview;
