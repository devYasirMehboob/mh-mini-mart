import ProductImage from "./ProductImage";
import StatusBadge from "../StatusBadge";
import StockBadge from "./StockBadge";

import {formatCurrency} from "../../utils/calculateSaleTotals";

function Detail({ label, value }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</dt><dd className="mt-1 text-sm font-semibold text-slate-700">{value || "—"}</dd></div>;
}

function ProductDetails({ product, canViewCosts, onClose }) {
  return (
    <>
      <div className="space-y-6 px-6 py-5">
        <div className="flex items-center gap-4">
          <ProductImage product={product} className="size-20" />
          <div>
            <h3 className="text-xl font-bold text-slate-900">{product.name}</h3>
            <p className="mt-1 text-sm text-slate-500">{product.category_name}</p>
            <div className="mt-2 flex flex-wrap gap-2"><StatusBadge status={product.status} /><StockBadge product={product} /></div>
          </div>
        </div>
        <dl className="grid gap-5 border-t border-slate-100 pt-5 sm:grid-cols-3">
          <Detail label="Product code" value={product.product_code} />
          <Detail label="Barcode" value={product.barcode} />
          <Detail label="Unit" value={product.unit_type} />
          {canViewCosts && <Detail label="Purchase cost" value={formatCurrency(Number(product.purchase_cost))} />}
          <Detail label="Selling price" value={formatCurrency(Number(product.selling_price))} />
          <Detail label="Quantity" value={Number(product.track_stock) !== 0 ? Number(product.quantity).toLocaleString() : "Not tracked"} />
          <Detail label="Minimum stock" value={Number(product.track_stock) !== 0 ? Number(product.minimum_stock).toLocaleString() : "Not tracked"} />
          <Detail label="Created" value={new Date(product.created_at.replace(" ", "T")).toLocaleDateString("en-PK")} />
          <Detail label="Updated" value={new Date(product.updated_at.replace(" ", "T")).toLocaleDateString("en-PK")} />
        </dl>
      </div>
      <footer className="flex justify-end border-t border-slate-100 bg-slate-50/70 px-6 py-4">
        <button className="min-h-10 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700" type="button" onClick={onClose}>Close</button>
      </footer>
    </>
  );
}

export default ProductDetails;


