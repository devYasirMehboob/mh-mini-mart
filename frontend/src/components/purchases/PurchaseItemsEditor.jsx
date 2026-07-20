import React from "react";
import Icon from "../Icon";
import { formatCurrency } from "../../utils/calculateSaleTotals";

function PurchaseItemsEditor({
  products,
  items,
  onChange,
  onAdd,
  onRemove,
  onSearch,
}) {
  return (
    <section className="premium-surface rounded-xl p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold text-slate-600">
          Search products
          <input
            type="search"
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Name, code or barcode..."
            className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
          />
        </label>
        <label className="text-xs font-bold text-slate-600">
          Add product
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                onAdd(Number(e.target.value));
                e.target.value = "";
              }
            }}
            className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
          >
            <option value="">Select a product...</option>
            {products
              .filter((p) => !items.some((i) => i.product_id === Number(p.id)))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.product_code}
                </option>
              ))}
          </select>
        </label>
      </div>

      {items.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-200 py-12 text-center text-xs text-slate-400">
          Add at least one product to the purchase.
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[850px] text-xs">
            <thead className="bg-slate-50 text-[9px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-3 text-left">Product</th>
                <th className="p-3 text-right">Quantity</th>
                <th className="p-3 text-right">Unit cost</th>
                <th className="p-3 text-right">Line discount</th>
                <th className="p-3 text-right">Line total</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y border-b border-slate-100">
              {items.map((item) => {
                const total = Math.max(
                  0,
                  Number(item.quantity || 0) * Number(item.unit_cost || 0) -
                    Number(item.line_discount || 0),
                );

                // Show batch row if the product requires batches or expiry
                const product = products.find(
                  (p) => Number(p.id) === Number(item.product_id),
                );
                const trackBatches =
                  product && Number(product.track_batches) === 1;
                const trackExpiry =
                  product && Number(product.track_expiry) === 1;
                const requiresBatchRow = trackBatches || trackExpiry;

                return (
                  <React.Fragment key={item.product_id}>
                    <tr>
                      <td className="p-3">
                        <strong>{item.name}</strong>
                        <small className="block text-slate-400">
                          {item.product_code} · {item.unit_type}
                        </small>
                      </td>
                      {["quantity", "unit_cost", "line_discount"].map((key) => (
                        <td key={key} className="p-3 align-top">
                          <input
                            type="number"
                            min="0"
                            step={key === "quantity" ? "0.001" : "0.01"}
                            value={item[key]}
                            onChange={(e) =>
                              onChange(item.product_id, key, e.target.value)
                            }
                            className="ml-auto block min-h-10 w-28 rounded-lg border border-slate-200 px-2 text-right"
                          />
                        </td>
                      ))}
                      <td className="p-3 text-right font-extrabold align-top">
                        {formatCurrency(total)}
                      </td>
                      <td className="p-3 align-top">
                        <button
                          type="button"
                          onClick={() => onRemove(item.product_id)}
                          className="grid size-8 place-items-center rounded-lg text-red-500 hover:bg-red-50"
                        >
                          <Icon name="trash" className="size-4" />
                        </button>
                      </td>
                    </tr>
                    {requiresBatchRow && (
                      <tr className="bg-slate-50/50">
                        <td colSpan="6" className="px-3 pb-4 pt-1">
                          <div className="flex flex-wrap gap-4 rounded-xl border border-blue-100 bg-blue-50/30 p-3">
                            {trackBatches && (
                              <label className="flex-1 min-w-[150px]">
                                <span className="mb-1.5 block text-[10px] font-bold uppercase text-blue-600">
                                  Batch Number{" "}
                                  <span className="text-slate-400 font-normal normal-case">
                                    (optional)
                                  </span>
                                </span>
                                <input
                                  type="text"
                                  value={item.batch_number || ""}
                                  onChange={(e) =>
                                    onChange(
                                      item.product_id,
                                      "batch_number",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="e.g. BATCH-001 (auto-generates)"
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                                />
                              </label>
                            )}
                            {(trackBatches || trackExpiry) && (
                              <label className="flex-1 min-w-[150px]">
                                <span className="mb-1.5 block text-[10px] font-bold uppercase text-slate-500">
                                  Mfg Date
                                </span>
                                <input
                                  type="date"
                                  value={item.manufacturing_date || ""}
                                  onChange={(e) =>
                                    onChange(
                                      item.product_id,
                                      "manufacturing_date",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                                />
                              </label>
                            )}
                            {trackExpiry && (
                              <label className="flex-1 min-w-[150px]">
                                <span className="mb-1.5 block text-[10px] font-bold uppercase text-orange-600">
                                  Expiry Date *
                                </span>
                                <input
                                  type="date"
                                  value={item.expiry_date || ""}
                                  onChange={(e) =>
                                    onChange(
                                      item.product_id,
                                      "expiry_date",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                                />
                              </label>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default PurchaseItemsEditor;
