const actionOptions = [
  ["add", "Add stock"],
  ["reduce", "Reduce stock"],
  ["adjust", "Adjust final quantity"],
  ["opening-stock", "Opening stock"],
  ["damaged", "Damaged stock"],
  ["expired", "Expired stock"],
  ["wastage", "Wastage"],
];

const reasonRequired = ["reduce", "adjust", "damaged", "expired", "wastage"];

function StockActionForm({ product, action, values, errors, isSubmitting, onActionChange, onChange, onSubmit, onCancel }) {
  const isAdjustment = action === "adjust";

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="space-y-5 px-6 py-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Product</p>
          <div className="mt-2 flex items-center justify-between gap-4"><div><strong className="block text-sm text-slate-800">{product.name}</strong><span className="mt-1 block text-xs text-slate-500">{product.product_code} Â· {product.unit_type}</span></div><div className="text-right"><span className="block text-xs text-slate-400">Current stock</span><strong className="mt-1 block text-lg text-slate-900">{Number(product.quantity).toLocaleString()}</strong></div></div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="stock-action">Movement type</label>
          <select className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" id="stock-action" value={action} onChange={onActionChange} disabled={isSubmitting}>{actionOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="stock-quantity">{isAdjustment ? "Final quantity" : "Quantity"} <span className="text-red-500">*</span></label>
          <input className={"min-h-11 w-full rounded-xl border bg-white px-3.5 text-sm outline-none focus:ring-2 " + (errors.quantity ? "border-red-300 focus:ring-red-100" : "border-slate-200 focus:border-blue-400 focus:ring-blue-100")} id="stock-quantity" name="quantity" type="number" min={isAdjustment ? "0" : "0.001"} step="0.001" value={values.quantity} onChange={onChange} disabled={isSubmitting} autoFocus />
          {errors.quantity && <p className="mt-1.5 text-xs text-red-600">{errors.quantity}</p>}
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="stock-reason">Reason {reasonRequired.includes(action) && <span className="text-red-500">*</span>}</label>
          <textarea className={"min-h-24 w-full rounded-xl border bg-white px-3.5 py-3 text-sm outline-none focus:ring-2 " + (errors.reason ? "border-red-300 focus:ring-red-100" : "border-slate-200 focus:border-blue-400 focus:ring-blue-100")} id="stock-reason" name="reason" maxLength="500" value={values.reason} onChange={onChange} disabled={isSubmitting} placeholder="Add a clear note for this stock movement" />
          {errors.reason && <p className="mt-1.5 text-xs text-red-600">{errors.reason}</p>}
        </div>
      </div>
      <footer className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4"><button className="min-h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50" type="button" disabled={isSubmitting} onClick={onCancel}>Cancel</button><button className="min-h-10 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60" type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save movement"}</button></footer>
    </form>
  );
}

export default StockActionForm;


