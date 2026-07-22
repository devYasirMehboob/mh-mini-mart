import ProductImage from "../products/ProductImage";
import Icon from "../Icon";
import { formatCurrency } from "../../utils/calculateSaleTotals";

function ProductCard({ product, onAdd }) {
  const tracked = Number(product.track_stock) !== 0;
  const out = product.status !== "active" || (tracked && Number(product.quantity) <= 0);
  const low = tracked && !out && Number(product.quantity) <= Number(product.minimum_stock);
  const label = !tracked ? "Not tracked" : out ? "Out of stock" : low ? "Low stock" : "In stock";
  const tone = !tracked ? "bg-slate-100 text-slate-600" : out ? "bg-red-50 text-red-700" : low ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700";

  const isWeightUnit = ["gram", "grams", "g", "kilogram", "kg", "kilos", "millilitre", "ml", "litre", "liter", "l"].includes(String(product.unit_type || "").toLowerCase());
  const displayUnit = product.stock_mode === "shared" && isWeightUnit ? "Pcs / Packs" : (product.unit_type || "Pcs");
  const stockText = !tracked ? "Stock not tracked" : `${Number(product.quantity)} ${displayUnit} available`;

  return (
    <div
      role="button"
      tabIndex={out ? -1 : 0}
      onClick={() => { if (!out) onAdd(product); }}
      onKeyDown={(e) => { if (!out && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onAdd(product); } }}
      className={`premium-surface group overflow-hidden rounded-xl text-left transition focus:outline-none focus:ring-4 focus:ring-blue-100 ${out ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_12px_28px_rgba(16,24,40,0.08)]'}`}
    >
      <span className="relative block overflow-hidden border-b border-slate-100 bg-slate-50">
        <ProductImage product={product} className="h-28 w-full rounded-none border-0 transition duration-300 group-hover:scale-[1.025]" />
        <span className={`absolute right-2.5 top-2.5 rounded-lg px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.08em] ${tone}`}>{label}</span>
      </span>
      <span className="block p-3.5">
        <span className="block truncate text-sm font-extrabold text-slate-900">{product.name}</span>
        <span className="mt-1 block truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{product.product_code} · {product.category_name}</span>
        <span className="mt-3 flex items-end justify-between gap-2">
          <span><strong className="block text-[15px] font-extrabold text-slate-950">{formatCurrency(product.selling_price)}</strong><small className="mt-0.5 block text-[10px] font-medium text-slate-400">{stockText}</small></span>
          <span className="flex items-center gap-1">
            {Number(product.allow_custom_sale) === 1 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onAdd(product, true); }}
                className="grid h-8 px-2 place-items-center rounded-lg bg-amber-50 text-xs font-bold text-amber-700 transition hover:bg-amber-100"
              >
                Custom Sale
              </button>
            )}
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white"><Icon name="plus" className="size-4" strokeWidth={2.2} /></span>
          </span>
        </span>
      </span>
    </div>
  );
}

export default ProductCard;
