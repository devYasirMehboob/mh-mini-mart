import React from "react";
import Icon from "../Icon";
import { formatCurrency } from "../../utils/calculateSaleTotals";
import PurchaseProductCombobox from "./PurchaseProductCombobox";

function PurchaseItemsEditor({
  products,
  units,
  items,
  supplierId,
  onChange,
  onAddProduct,
  onRemove,
  onQuickAdd,
  onConfigureUnit,
}) {
  return (
    <section className="premium-surface rounded-xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex-1 max-w-xl">
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Search & Add Product to Purchase
          </label>
          <PurchaseProductCombobox
            supplierId={supplierId}
            onSelectProduct={onAddProduct}
            onQuickAdd={onQuickAdd}
          />
        </div>

        {onQuickAdd && (
          <button
            type="button"
            onClick={() => onQuickAdd("")}
            className="self-end inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
          >
            <Icon name="plus" className="size-4" />
            Quick Add Product
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-200 py-12 text-center text-xs text-slate-400 bg-white">
          Use the search box above or scan a barcode to add items to the purchase.
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[900px] text-xs">
            <thead className="bg-slate-50 text-[9px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-3 text-left">Product & Packaging Unit</th>
                <th className="p-3 text-right">Pack Quantity</th>
                <th className="p-3 text-right">Cost Per Pack</th>
                <th className="p-3 text-right">Base Stock Conversion</th>
                <th className="p-3 text-right">Line Discount</th>
                <th className="p-3 text-right">Line Total</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y border-b border-slate-100">
              {items.map((item) => {
                const total = Math.max(
                  0,
                  Number(item.quantity || 0) * Number(item.unit_cost || 0) -
                    Number(item.line_discount || 0)
                );

                const product = products.find(
                  (p) => Number(p.id) === Number(item.product_id)
                ) || item.product;

                // Packaging unit list for this product (from product_units table)
                const purchaseUnits = item.purchase_units || product?.purchase_units || [];

                // Resolve selected unit object:
                // 1. Try product_units (has conversion_to_base, unit_name, unit_symbol keyed differently)
                // 2. Fallback to global units list
                const selectedFromProductUnits = purchaseUnits.find(
                  (u) => String(u.unit_id) === String(item.unit_id)
                );
                const selectedFromGlobalUnits = units.find(
                  (u) => String(u.id) === String(item.unit_id)
                );
                const selectedUnitObj = selectedFromProductUnits || selectedFromGlobalUnits;

                // conversion_to_base: how many base units is 1 of the selected unit?
                // product_units row has `conversion_to_base` directly
                // global units row does NOT have conversion (it's 1:1 by default if same as base)
                const conversion = selectedFromProductUnits
                  ? parseFloat(selectedFromProductUnits.conversion_to_base || "1")
                  : 1;

                const baseQty = Number(item.quantity || 0) * conversion;

                // Base unit: find the row with is_base_unit=1 in product_units list
                // This gives us "kg" even when Bori is selected as purchase unit
                const baseUnitRow = purchaseUnits.find((u) => Number(u.is_base_unit) === 1);
                const baseUnitSymbol =
                  baseUnitRow?.unit_symbol ||
                  product?.base_unit_symbol ||
                  "unit";

                // Display name/symbol for selected unit
                const unitSymbol = selectedFromProductUnits?.unit_symbol
                  || selectedFromProductUnits?.symbol
                  || selectedFromGlobalUnits?.symbol
                  || "unit";
                const unitName = selectedFromProductUnits?.unit_name
                  || selectedFromProductUnits?.name
                  || selectedFromGlobalUnits?.name
                  || unitSymbol;

                // Is the selected unit the same as the base unit? (no packaging conversion needed)
                const isBaseUnit = conversion === 1 && (
                  !selectedFromProductUnits || Number(selectedFromProductUnits.is_base_unit) === 1
                );

                const trackBatches = product && Number(product.track_batches) === 1;
                const trackExpiry = product && Number(product.track_expiry) === 1;
                const requiresBatchRow = trackBatches || trackExpiry;

                return (
                  <React.Fragment key={item.product_id}>
                    <tr>
                      <td className="p-3 align-top">
                        <div className="font-extrabold text-slate-900">{item.name}</div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-400">
                            {item.product_code}
                          </span>
                          
                          <select
                            value={item.unit_id || ""}
                            onChange={(e) => onChange(item.product_id, "unit_id", e.target.value)}
                            className="h-7 rounded-md border border-slate-200 px-2 text-xs text-slate-700 outline-none focus:border-blue-500 font-bold bg-white"
                          >
                            <option value="">Select unit</option>
                            {purchaseUnits.length > 0
                              ? purchaseUnits.map((u) => (
                                  <option key={u.unit_id} value={u.unit_id}>
                                    {u.unit_name} ({u.unit_symbol})
                                  </option>
                                ))
                              : units.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.name} ({u.symbol})
                                  </option>
                                ))}
                          </select>

                          {onConfigureUnit && (
                            <button
                              type="button"
                              title="Configure Packaging Unit"
                              onClick={() => onConfigureUnit(product || item, item)}
                              className="text-[10px] font-bold text-blue-600 hover:underline shrink-0"
                            >
                              + Unit
                            </button>
                          )}
                        </div>

                        {(() => {
                          const lastCost = item.last_purchase_cost ? parseFloat(item.last_purchase_cost) : null;
                          const currentCost = parseFloat(item.unit_cost || 0);
                          const costDiff = lastCost && currentCost > 0 && Math.abs(currentCost - lastCost) > 0.01
                            ? (((currentCost - lastCost) / lastCost) * 100).toFixed(1)
                            : null;
                          return (
                            <>
                              {lastCost && (
                                <div className="mt-1.5 flex items-center gap-2 text-[10px]">
                                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-bold text-slate-600">
                                    Last Cost: {formatCurrency(lastCost)} / {unitSymbol}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => onChange(item.product_id, "unit_cost", String(lastCost))}
                                    className="font-bold text-blue-600 hover:underline"
                                  >
                                    Use Last
                                  </button>
                                </div>
                              )}
                              {costDiff && (
                                <div className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-extrabold ${
                                  Number(costDiff) > 0
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                }`}>
                                  {Number(costDiff) > 0 ? "▲ Cost +" : "▼ Cost "}{costDiff}% vs last purchase
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </td>

                      <td className="p-3 align-top text-right">
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">
                          {isBaseUnit ? `Quantity (${unitSymbol})` : `Packs (${unitName})`}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={item.quantity}
                          onChange={(e) => onChange(item.product_id, "quantity", e.target.value)}
                          className="ml-auto block h-9 w-24 rounded-lg border border-slate-200 px-2 text-right font-extrabold text-slate-800"
                        />
                      </td>

                      <td className="p-3 align-top text-right">
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">
                          Cost / {unitSymbol}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_cost}
                          onChange={(e) => onChange(item.product_id, "unit_cost", e.target.value)}
                          className="ml-auto block h-9 w-28 rounded-lg border border-slate-200 px-2 text-right font-extrabold text-slate-800"
                        />
                      </td>

                      <td className="p-3 align-top text-right shrink-0">
                        {isBaseUnit ? (
                          <div className="text-xs font-extrabold text-slate-900">
                            + {Number(item.quantity || 0).toLocaleString()} {baseUnitSymbol}
                          </div>
                        ) : (
                          <>
                            <div className="text-xs font-extrabold text-emerald-700">
                              + {baseQty.toLocaleString()} {baseUnitSymbol}
                            </div>
                            <div className="text-[10px] font-medium text-slate-400 mt-0.5">
                              1 {unitSymbol} = {conversion} {baseUnitSymbol}
                            </div>
                          </>
                        )}
                      </td>

                      <td className="p-3 align-top text-right">
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">
                          Discount
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.line_discount}
                          onChange={(e) => onChange(item.product_id, "line_discount", e.target.value)}
                          className="ml-auto block h-9 w-24 rounded-lg border border-slate-200 px-2 text-right"
                        />
                      </td>

                      <td className="p-3 align-top text-right font-extrabold text-slate-950 text-sm">
                        {formatCurrency(total)}
                      </td>

                      <td className="p-3 align-top text-right">
                        <button
                          type="button"
                          onClick={() => onRemove(item.product_id)}
                          className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition"
                        >
                          <Icon name="trash" className="size-4" />
                        </button>
                      </td>
                    </tr>

                    {requiresBatchRow && (
                      <tr className="bg-slate-50/50">
                        <td colSpan="7" className="px-3 pb-4 pt-1">
                          <div className="flex flex-wrap gap-4 rounded-xl border border-blue-100 bg-blue-50/30 p-3">
                            {trackBatches && (
                              <label className="flex-1 min-w-[150px]">
                                <span className="mb-1.5 block text-[10px] font-bold uppercase text-blue-600">
                                  Batch Number (optional)
                                </span>
                                <input
                                  type="text"
                                  value={item.batch_number || ""}
                                  onChange={(e) =>
                                    onChange(item.product_id, "batch_number", e.target.value)
                                  }
                                  placeholder="e.g. BATCH-001"
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
                                    onChange(item.product_id, "manufacturing_date", e.target.value)
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
                                    onChange(item.product_id, "expiry_date", e.target.value)
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
