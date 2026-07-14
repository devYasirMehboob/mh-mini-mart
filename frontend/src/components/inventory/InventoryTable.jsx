import Icon from "../Icon";
import ProductImage from "../products/ProductImage";
import StockBadge from "../products/StockBadge";

function InventoryTable({ products, actionId, onAction, onHistory }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-left">
        <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500"><tr><th className="px-6 py-3.5">Product</th><th className="px-6 py-3.5">Category</th><th className="px-6 py-3.5">Current stock</th><th className="px-6 py-3.5">Minimum</th><th className="px-6 py-3.5">Status</th><th className="px-6 py-3.5">Last updated</th><th className="px-6 py-3.5 text-right">Actions</th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {products.map((product) => (
            <tr key={product.id} className="hover:bg-slate-50/60">
              <td className="px-6 py-4"><div className="flex items-center gap-3"><ProductImage product={product} /><div><strong className="block text-sm text-slate-800">{product.name}</strong><span className="mt-1 block text-xs text-slate-400">{product.product_code}</span></div></div></td>
              <td className="px-6 py-4 text-sm text-slate-500">{product.category_name}</td>
              <td className="px-6 py-4"><strong className="text-sm text-slate-800">{Number(product.track_stock) !== 0 ? Number(product.quantity).toLocaleString() : "—"}</strong><span className="ml-1 text-xs capitalize text-slate-400">{product.unit_type}</span></td>
              <td className="px-6 py-4 text-sm text-slate-500">{Number(product.track_stock) !== 0 ? Number(product.minimum_stock).toLocaleString() : "—"}</td>
              <td className="px-6 py-4"><StockBadge product={product} /></td>
              <td className="px-6 py-4 text-sm text-slate-500">{new Date(product.updated_at.replace(" ", "T")).toLocaleDateString("en-PK")}</td>
              <td className="px-6 py-4"><div className="flex justify-end gap-1"><button className="rounded-lg px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-40" type="button" disabled={actionId === product.id || Number(product.track_stock) === 0} onClick={() => onAction(product, "add")}>Add</button><button className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40" type="button" disabled={actionId === product.id || Number(product.track_stock) === 0} onClick={() => onAction(product, "reduce")}>Reduce</button><button className="rounded-lg px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-40" type="button" disabled={actionId === product.id || Number(product.track_stock) === 0} onClick={() => onAction(product, "adjust")}>Adjust</button><button className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" type="button" aria-label={"View stock history for " + product.name} onClick={() => onHistory(product)}><Icon name="clock" className="size-4" /></button></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default InventoryTable;
