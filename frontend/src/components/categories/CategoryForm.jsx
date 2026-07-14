function CategoryForm({
  values,
  errors,
  isSubmitting,
  submitLabel,
  onChange,
  onSubmit,
  onCancel,
}) {
  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="space-y-5 px-6 py-5">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="category-name">
            Category name <span className="text-red-500">*</span>
          </label>
          <input
            className={[
              "min-h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-slate-800 outline-none transition focus:ring-2",
              errors.name
                ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                : "border-slate-200 focus:border-blue-400 focus:ring-blue-100",
            ].join(" ")}
            id="category-name"
            name="name"
            type="text"
            maxLength="100"
            value={values.name}
            onChange={onChange}
            disabled={isSubmitting}
            autoFocus
          />
          {errors.name && <p className="mt-1.5 text-xs text-red-600">{errors.name}</p>}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="block text-sm font-semibold text-slate-700" htmlFor="category-description">
              Description
            </label>
            <span className="text-xs text-slate-400">{values.description.length}/1000</span>
          </div>
          <textarea
            className={[
              "min-h-28 w-full resize-y rounded-xl border bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition focus:ring-2",
              errors.description
                ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                : "border-slate-200 focus:border-blue-400 focus:ring-blue-100",
            ].join(" ")}
            id="category-description"
            name="description"
            maxLength="1000"
            value={values.description}
            onChange={onChange}
            disabled={isSubmitting}
          />
          {errors.description && <p className="mt-1.5 text-xs text-red-600">{errors.description}</p>}
        </div>
      </div>

      <footer className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
        <button
          className="min-h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          type="button"
          disabled={isSubmitting}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="min-h-10 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
      </footer>
    </form>
  );
}

export default CategoryForm;


