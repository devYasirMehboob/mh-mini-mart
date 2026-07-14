import { formatCurrency } from "../../utils/calculateSaleTotals";

function BestSellingProducts({ products }) {
  return (
    <section className="premium-surface rounded-xl p-5 sm:p-6">
      <h3 className="text-base font-extrabold text-slate-900">Best sellers</h3><p className="mt-1 text-xs text-slate-500">Top products this month by quantity.</p>
      {products.length === 0 ? <p className="py-14 text-center text-sm text-slate-400">No product sales this month.</p> : <ol className="mt-5 space-y-3">{products.map((product, index) => <li key={product.product_id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-extrabold text-slate-500">{index + 1}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-800">{product.product_name}</strong><small className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">{product.product_code || "No code"}</small></span><span className="text-right"><strong className="block text-sm text-slate-900">{Number(product.quantity_sold).toLocaleString("en-PK")}</strong><small className="text-[10px] text-slate-400">{formatCurrency(product.sales_amount)}</small></span></li>)}</ol>}
    </section>
  );
}

export default BestSellingProducts;
