import { useEffect, useRef, useState } from "react";
import Icon from "../Icon";
import { formatCurrency } from "../../utils/calculateSaleTotals";

function AmountWeightModal({ product, open, onClose, onAdd }) {
  const [amount, setAmount] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setAmount("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  if (!open || !product) return null;

  const handleAdd = (e) => {
    e.preventDefault();
    const money = parseFloat(amount);
    if (!Number.isFinite(money) || money <= 0) return;

    // product.selling_price is price per base unit (e.g. price per 1000g if unit is kg and base is gram)
    // Wait, selling_price is price per default_sale_unit usually. But right now we don't have unit selection on POS yet.
    // Let's assume selling_price is price per product.unit_type (the base unit).
    // So quantity = money / selling_price
    
    const quantity = money / Number(product.selling_price);
    
    onAdd(product, quantity);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Enter Amount</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition">
            <Icon name="x" className="size-5" />
          </button>
        </div>
        
        <form onSubmit={handleAdd} className="p-6">
          <div className="mb-4">
            <p className="text-sm text-slate-600 mb-4">
              Enter the amount of money for <strong>{product.name}</strong>. The quantity will be automatically calculated.
            </p>
            <div className="flex items-center justify-between mb-4 px-4 py-3 bg-blue-50 rounded-xl text-blue-900">
              <span className="font-semibold text-sm">Unit Price</span>
              <span className="font-bold">{formatCurrency(product.selling_price)} / {product.unit_type}</span>
            </div>
          </div>
          
          <div className="mb-6">
            <label className="mb-2 block text-sm font-bold text-slate-700">Amount (₨)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₨</span>
              <input
                ref={inputRef}
                type="number"
                step="any"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border-slate-200 pl-10 pr-4 py-3 font-bold text-lg text-slate-900 placeholder:font-normal focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                placeholder="e.g. 25"
              />
            </div>
            {amount > 0 && (
              <p className="mt-3 text-center text-sm font-semibold text-emerald-600">
                Calculated Quantity: {Number(amount / product.selling_price).toFixed(3)} {product.unit_type}
              </p>
            )}
          </div>
          
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-slate-100 px-4 py-3 font-bold text-slate-700 hover:bg-slate-200 transition">Cancel</button>
            <button type="submit" disabled={!amount || amount <= 0} className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700 transition disabled:opacity-50">Add to Cart</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AmountWeightModal;
