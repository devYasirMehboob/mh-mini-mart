import { useState } from "react";
import Modal from "../Modal";
import { receiveKhataPayment } from "../../api/customersApi";
import normalizeApiError from "../../utils/normalizeApiError";
import { formatCurrency } from "../../utils/calculateSaleTotals";

function newToken() {
  return `kpay-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const METHODS = [
  ["cash", "Cash"],
  ["card", "Card"],
  ["bank_transfer", "Bank Transfer"],
  ["mobile_wallet", "Mobile Wallet"],
  ["other", "Other"],
];

function ReceiveKhataPaymentDialog({ open, onClose, onSuccess, customer }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [token] = useState(newToken());

  if (!open || !customer) return null;

  const outstanding = Number(customer.current_balance || 0);

  function handleClose() {
    setAmount(""); setMethod("cash"); setReference(""); setNotes("");
    setError(""); setFieldErrors({});
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const amtNum = Number(amount);
    if (!amount || amtNum <= 0) {
      setFieldErrors({ amount: ["Enter a positive payment amount."] });
      return;
    }
    setSubmitting(true);
    setError(""); setFieldErrors({});
    try {
      const res = await receiveKhataPayment(customer.id, {
        request_token: token,
        amount: amtNum.toFixed(2),
        payment_method: method,
        reference_number: reference.trim() || undefined,
        payment_date: date,
        notes: notes.trim() || undefined,
      });
      onSuccess(res.data?.payment, res.message);
      handleClose();
    } catch (err) {
      const norm = normalizeApiError(err);
      setError(norm.message);
      setFieldErrors(norm.errors || {});
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal isOpen={open} title="Receive Khata Payment" onClose={handleClose}>
      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        {/* Customer info */}
        <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
          <p className="text-xs font-bold text-slate-800">{customer.name}
            <span className="ml-2 text-[10px] font-normal text-slate-400">{customer.customer_code}</span>
          </p>
          <p className="mt-0.5 text-xs">
            Outstanding: <strong className="text-red-600">{formatCurrency(outstanding)}</strong>
          </p>
        </div>

        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 border border-red-100">{error}</div>}

        {/* Amount */}
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Amount (Rs.) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            step="0.01"
            max={outstanding > 0 ? outstanding : undefined}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            autoFocus
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-base font-extrabold text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
          />
          {fieldErrors.amount && <p className="mt-1 text-xs text-red-500">{fieldErrors.amount[0]}</p>}
        </div>

        {/* Payment method */}
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Payment Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="min-h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          >
            {METHODS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="min-h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Reference</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Optional"
              maxLength={150}
              className="min-h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !amount}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Record Payment"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default ReceiveKhataPaymentDialog;
