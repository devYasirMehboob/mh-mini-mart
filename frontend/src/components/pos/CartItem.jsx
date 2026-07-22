import { useEffect, useState } from "react";
import ProductImage from "../products/ProductImage";
import Icon from "../Icon";
import ReadableStock from "../products/ReadableStock";
import { formatCurrency } from "../../utils/calculateSaleTotals";

const WHOLE = new Set(["piece", "pack", "dozen", "box", "bottle"]);

function CartItem({ item, onQuantity, onRemove }) {
  const tracked = Number(item.track_stock) !== 0;
  const step = WHOLE.has(String(item.unit_type || "").toLowerCase()) ? 1 : 0.001;

  const [localValue, setLocalValue] = useState(item.cartQuantity);
  useEffect(() => {
    setLocalValue(item.cartQuantity);
  }, [item.cartQuantity]);

  function handleChange(event) {
    const val = event.target.value;
    setLocalValue(val);
    if (val !== "" && val !== "0" && val !== "0.") {
      onQuantity(item, val);
    }
  }

  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 transition hover:border-slate-300 hover:bg-white">
      <div className="flex gap-3">
        <ProductImage product={item} className="size-12 rounded-xl" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0"><h4 className="truncate text-[13px] font-extrabold text-slate-900">{item.name}</h4><p className="mt-1 text-[10px] font-medium text-slate-400">{formatCurrency(item.selling_price)} / {item.unit_type}</p></div>
            <button type="button" className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600" onClick={() => onRemove(item)} aria-label={`Remove ${item.name}`}><Icon name="trash" className="size-3.5" /></button>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 items-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <button type="button" className="grid size-9 place-items-center text-base text-slate-500 transition hover:bg-slate-50" onClick={() => onQuantity(item, Math.round((item.cartQuantity - step) * 1000) / 1000)} aria-label="Decrease quantity">−</button>
                <input aria-label={`${item.name} quantity`} type="number" min={step} step={step} value={localValue} onChange={handleChange} className="h-9 w-14 border-x border-slate-200 bg-white text-center text-xs font-extrabold text-slate-800 outline-none" />
                <button type="button" className="grid size-9 place-items-center text-base text-blue-600 transition hover:bg-blue-50" onClick={() => onQuantity(item, Math.round((item.cartQuantity + step) * 1000) / 1000)} aria-label="Increase quantity">+</button>
              </div>
              {step < 1 && (
                <div className="text-[11px] font-bold text-slate-500">
                  <ReadableStock quantity={item.cartQuantity} unitType={item.unit_type} />
                </div>
              )}
            </div>
            <strong className="text-sm font-extrabold text-slate-950">{formatCurrency(Number(item.selling_price) * item.cartQuantity)}</strong>
          </div>
          {tracked && <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">{Number(item.quantity)} available</p>}
        </div>
      </div>
    </article>
  );
}

export default CartItem;
