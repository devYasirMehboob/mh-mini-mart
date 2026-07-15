const unitTypes = [
  ["piece", "Piece"],
  ["pack", "Pack"],
  ["kilogram", "Kilogram"],
  ["gram", "Gram"],
  ["dozen", "Dozen"],
  ["box", "Box"],
  ["bottle", "Bottle"],
];

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
              <input className={inputClasses(errors.barcode)} id="product-barcode" name="barcode" value={values.barcode} onChange={onChange} disabled={isSubmitting} maxLength="100" />
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
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="product-unit">Unit type</label>
              <select className={inputClasses(errors.unit_type)} id="product-unit" name="unit_type" value={values.unit_type} onChange={onChange} disabled={isSubmitting}>
                {unitTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <FieldError message={errors.unit_type} />
            </div>
          </div>
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
              <input className={inputClasses(errors.quantity)} id="product-quantity" name="quantity" type="number" min="0" step="0.001" value={values.quantity} onChange={onChange} disabled={isSubmitting || !values.track_stock || isEdit} />
              {isEdit && <p className="mt-1.5 text-xs text-slate-400">Use Inventory to record quantity changes.</p>}
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


