import { useState, useEffect } from "react";
import { getProducts } from "../../api/productsApi";

function FieldError({ message }) {
  return message ? <p className="mt-1.5 text-xs text-red-600">{message}</p> : null;
}

function inputClasses(error) {
  return [
    "min-h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-slate-800 outline-none transition focus:ring-2",
    error
      ? "border-red-300 focus:border-red-400 focus:ring-red-100"
      : "border-slate-200 focus:border-blue-400 focus:ring-blue-100",
  ].join(" ");
}

function ProductForm({
  values,
  errors,
  canViewCosts,
  isEdit,
  categories,
  units,
  imagePreview,
  isSubmitting,
  submitLabel,
  onChange,
  onImageChange,
  onRemoveImage,
  onSubmit,
  onCancel,
  onGenerateBarcode,
}) {
  const [sourceProducts, setSourceProducts] = useState([]);
  const [isLoadingSources, setIsLoadingSources] = useState(false);

  useEffect(() => {
    if (values.stock_mode === 'shared' && sourceProducts.length === 0) {
      setIsLoadingSources(true);
      getProducts({ limit: 1000 }).then(data => {
        setSourceProducts(data.products.filter(p => p.stock_mode !== 'shared'));
      }).catch(console.error).finally(() => setIsLoadingSources(false));
    }
  }, [values.stock_mode]);

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-5">
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Basic information</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="product-name">
                Product name <span className="text-red-500">*</span>
              </label>
              <input className={inputClasses(errors.name)} id="product-name" name="name" value={values.name} onChange={onChange} disabled={isSubmitting} maxLength="150" autoFocus />
              <FieldError message={errors.name} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="product-code">
                Product code <span className="text-red-500">*</span>
              </label>
              <input className={inputClasses(errors.product_code)} id="product-code" name="product_code" value={values.product_code} onChange={onChange} disabled={isSubmitting} maxLength="60" />
              <FieldError message={errors.product_code} />
            </div>
            <div>
              <label className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-700" htmlFor="product-barcode">
                <span>Barcode</span>
                {isEdit && !values.barcode && onGenerateBarcode && (
                  <button type="button" onClick={onGenerateBarcode} disabled={isSubmitting} className="text-xs text-blue-600 hover:underline font-bold">
                    Generate
                  </button>
                )}
              </label>
              <input 
                className={inputClasses(errors.barcode)} 
                id="product-barcode" 
                name="barcode" 
                value={values.barcode} 
                onChange={onChange} 
                disabled={isSubmitting} 
                placeholder="Leave empty to auto-generate"
                maxLength="100" 
              />
              <FieldError message={errors.barcode} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="product-category">
                Category <span className="text-red-500">*</span>
              </label>
              <select className={inputClasses(errors.category_id)} id="product-category" name="category_id" value={values.category_id} onChange={onChange} disabled={isSubmitting}>
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
              <FieldError message={errors.category_id} />
            </div>
          </div>
        </section>

        <section className="border-t border-slate-100 pt-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Units & Measurements</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="base-unit">Base unit <span className="text-red-500">*</span></label>
              <select className={inputClasses(errors.base_unit_id)} id="base-unit" name="base_unit_id" value={values.base_unit_id} onChange={onChange} disabled={isSubmitting}>
                <option value="">Select base unit</option>
                {units?.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
              </select>
              <FieldError message={errors.base_unit_id} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="purchase-unit">Default purchase unit <span className="text-red-500">*</span></label>
              <select className={inputClasses(errors.default_purchase_unit_id)} id="purchase-unit" name="default_purchase_unit_id" value={values.default_purchase_unit_id} onChange={onChange} disabled={isSubmitting}>
                <option value="">Select purchase unit</option>
                {units?.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
              </select>
              <FieldError message={errors.default_purchase_unit_id} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="sale-unit">Default sale unit <span className="text-red-500">*</span></label>
              <select className={inputClasses(errors.default_sale_unit_id)} id="sale-unit" name="default_sale_unit_id" value={values.default_sale_unit_id} onChange={onChange} disabled={isSubmitting}>
                <option value="">Select sale unit</option>
                {units?.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
              </select>
              <FieldError message={errors.default_sale_unit_id} />
            </div>
          </div>
          
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="stock-mode">Stock Mode <span className="text-red-500">*</span></label>
              <select className={inputClasses(errors.stock_mode)} id="stock-mode" name="stock_mode" value={values.stock_mode || 'own'} onChange={onChange} disabled={isSubmitting}>
                <option value="own">Own Stock</option>
                <option value="source">Stock Source (Master Inventory)</option>
                <option value="shared">Shared Variant (Uses Source Stock)</option>
              </select>
              <FieldError message={errors.stock_mode} />
            </div>

            {values.stock_mode === 'shared' && (
              <>
                <div className="sm:col-span-2 mt-2 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-sm text-blue-800 mb-4 font-semibold">Shared Stock Source Details</p>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-slate-700">Source Product</label>
                      <select className={inputClasses(errors.stock_source_id)} name="stock_source_id" value={values.stock_source_id || ''} onChange={onChange} disabled={isSubmitting || isLoadingSources}>
                        <option value="">Select source product...</option>
                        {sourceProducts.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.product_code})</option>
                        ))}
                      </select>
                      {isLoadingSources && <span className="text-xs text-blue-500 mt-1 block">Loading sources...</span>}
                      <FieldError message={errors.stock_source_id} />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-slate-700">Consumption Quantity</label>
                      <input className={inputClasses(errors.consumption_quantity)} name="consumption_quantity" type="number" min="0.001" step="0.001" value={values.consumption_quantity || ''} onChange={onChange} disabled={isSubmitting} />
                      <FieldError message={errors.consumption_quantity} />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-slate-700">Consumption Base Value</label>
                      <input className={inputClasses(errors.consumption_quantity_base)} name="consumption_quantity_base" type="number" min="0.000001" step="0.000001" value={values.consumption_quantity_base || ''} onChange={onChange} disabled={isSubmitting} placeholder="e.g. 1.000 for 1 base unit" />
                      <FieldError message={errors.consumption_quantity_base} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <input className="size-4 accent-emerald-600" name="allow_custom_sale" type="checkbox" checked={values.allow_custom_sale || false} onChange={onChange} disabled={isSubmitting} />
            <span>
              <strong className="block text-sm font-semibold text-slate-700">Allow Custom / Fractional Sale</strong>
              <span className="mt-0.5 block text-xs text-slate-500">Enable this to allow selling in fractional amounts (e.g. 0.25 Kg). Typically for weighable goods or flexible pricing.</span>
            </span>
          </label>
          <FieldError message={errors.allow_custom_sale} />
        </section>

        <section className="border-t border-slate-100 pt-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Pricing and stock</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {canViewCosts && <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="purchase-cost">Purchase cost</label>
              <input className={inputClasses(errors.purchase_cost)} id="purchase-cost" name="purchase_cost" type="number" min="0" step="0.01" value={values.purchase_cost} onChange={onChange} disabled={isSubmitting} />
              <FieldError message={errors.purchase_cost} />
            </div>}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="selling-price">Selling price</label>
              <input className={inputClasses(errors.selling_price)} id="selling-price" name="selling_price" type="number" min="0.01" step="0.01" value={values.selling_price} onChange={onChange} disabled={isSubmitting} />
              <FieldError message={errors.selling_price} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="product-quantity">Quantity</label>
              <input className={inputClasses(errors.quantity)} id="product-quantity" name="quantity" type="number" min="0" step="0.001" value={values.quantity} onChange={onChange} disabled={isSubmitting || !values.track_stock || values.track_batches || values.track_expiry || isEdit || values.stock_mode === 'shared'} />
              {isEdit && values.stock_mode !== 'shared' && <p className="mt-1.5 text-xs text-slate-400">Use Inventory to record quantity changes.</p>}
              {!isEdit && (values.track_batches || values.track_expiry) && values.stock_mode !== 'shared' && (
                <p className="mt-1.5 text-xs text-orange-500">Initial quantity must be 0. Use Purchases to add stock so you can enter the expiry date and batch number.</p>
              )}
              {values.stock_mode === 'shared' && <p className="mt-1.5 text-xs text-slate-400">Stock is managed via the stock source.</p>}
              <FieldError message={errors.quantity} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="minimum-stock">Minimum stock</label>
              <input className={inputClasses(errors.minimum_stock)} id="minimum-stock" name="minimum_stock" type="number" min="0" step="0.001" value={values.minimum_stock} onChange={onChange} disabled={isSubmitting || !values.track_stock} />
              <FieldError message={errors.minimum_stock} />
            </div>
          </div>
          <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <input className="size-4 accent-emerald-600" name="track_stock" type="checkbox" checked={values.track_stock} onChange={onChange} disabled={isSubmitting} />
            <span>
              <strong className="block text-sm font-semibold text-slate-700">Track product stock</strong>
              <span className="mt-0.5 block text-xs text-slate-500">Disable this for services or products without inventory limits.</span>
            </span>
          </label>
          <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <input className="size-4 accent-emerald-600" name="track_batches" type="checkbox" checked={values.track_batches || false} onChange={onChange} disabled={isSubmitting || !values.track_stock} />
            <span>
              <strong className="block text-sm font-semibold text-slate-700">Track product batches</strong>
              <span className="mt-0.5 block text-xs text-slate-500">Require batch numbers when receiving stock. Requires stock tracking.</span>
            </span>
          </label>
          <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <input className="size-4 accent-emerald-600" name="track_expiry" type="checkbox" checked={values.track_expiry || false} onChange={onChange} disabled={isSubmitting || !values.track_stock} />
            <span>
              <strong className="block text-sm font-semibold text-slate-700">Track expiry dates</strong>
              <span className="mt-0.5 block text-xs text-slate-500">Require expiry dates when receiving stock. Requires stock tracking.</span>
            </span>
          </label>
          <FieldError message={errors.track_stock} />
        </section>

        <section className="border-t border-slate-100 pt-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Product image</h3>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
              {imagePreview ? <img src={imagePreview} alt="Product preview" className="size-full object-cover" /> : <span className="text-xs text-slate-400">No image</span>}
            </div>
            <div>
              <input className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-700" type="file" accept="image/jpeg,image/png,image/webp" onChange={onImageChange} disabled={isSubmitting} />
              <p className="mt-2 text-xs text-slate-400">JPG, PNG, or WebP. Maximum 2 MB.</p>
              {imagePreview && <button className="mt-2 text-xs font-semibold text-red-600 hover:text-red-700" type="button" onClick={onRemoveImage} disabled={isSubmitting}>Remove image</button>}
              <FieldError message={errors.image} />
            </div>
          </div>
        </section>
      </div>

      <footer className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
        <button className="min-h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50" type="button" disabled={isSubmitting} onClick={onCancel}>Cancel</button>
        <button className="min-h-10 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : submitLabel}</button>
      </footer>
    </form>
  );
}

export default ProductForm;


