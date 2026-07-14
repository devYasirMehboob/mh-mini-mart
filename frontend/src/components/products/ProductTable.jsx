import Icon from "../Icon";
import ProductImage from "./ProductImage";
import StatusBadge from "../StatusBadge";
import StockBadge from "./StockBadge";

import {formatCurrency} from "../../utils/calculateSaleTotals";

function ProductTable({ products, actionId, canUpdate, canDelete, onView, onEdit, onStatus, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1040px] text-left">
        <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-6 py-3.5">Product</th>
            <th className="px-6 py-3.5">Code / Barcode</th>
            <th className="px-6 py-3.5">Category</th>
            <th className="px-6 py-3.5">Price</th>
            <th className="px-6 py-3.5">Stock</th>
            <th className="px-6 py-3.5">Status</th>
            <th className="px-6 py-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.map((product) => (
            <tr key={product.id} className="transition hover:bg-slate-50/60">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <ProductImage product={product} />
                  <div>
                    <strong className="block text-sm font-semibold text-slate-800">{product.name}</strong>
                    <span className="mt-1 block text-xs capitalize text-slate-400">{product.unit_type}</span>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4"><span className="block text-sm font-medium text-slate-700">{product.product_code}</span><span className="mt-1 block text-xs text-slate-400">{product.barcode || "No barcode"}</span></td>
              <td className="px-6 py-4 text-sm text-slate-500">{product.category_name}</td>
              <td className="px-6 py-4 text-sm font-semibold text-slate-700">{formatCurrency(Number(product.selling_price))}</td>
              <td className="px-6 py-4"><StockBadge product={product} /><span className="mt-1.5 block text-xs text-slate-400">{Number(product.track_stock) !== 0 ? Number(product.quantity).toLocaleString() + " " + product.unit_type : ""}</span></td>
              <td className="px-6 py-4"><StatusBadge status={product.status} /></td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-1">
                  <button className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700" type="button" aria-label={"View " + product.name} onClick={() => onView(product)}><Icon name="eye" className="size-4" /></button>
                  {canUpdate && <button className="rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50" type="button" disabled={actionId === product.id} onClick={() => onStatus(product)}>{product.status === "active" ? "Deactivate" : "Activate"}</button>}
                  {canUpdate && <button className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50" type="button" aria-label={"Edit " + product.name} disabled={actionId === product.id} onClick={() => onEdit(product)}><Icon name="edit" className="size-4" /></button>}
                  {canDelete && <button className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50" type="button" aria-label={"Delete " + product.name} disabled={actionId === product.id} onClick={() => onDelete(product)}><Icon name="trash" className="size-4" /></button>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ProductTable;
