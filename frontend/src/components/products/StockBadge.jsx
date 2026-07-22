function StockBadge({ product }) {
  if (Number(product.track_stock) === 0) {
    return <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Not tracked</span>;
  }

  if (product.stock_mode === 'shared') {
    return <span className="inline-flex rounded-full bg-blue-50 ring-1 ring-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-600">Shared Stock</span>;
  }

  const quantity = Number(product.quantity);
  const minimum = Number(product.minimum_stock);
  let label = "In stock";
  let styles = "bg-emerald-50 text-emerald-700 ring-emerald-100";

  if (quantity <= 0) {
    label = "Out of stock";
    styles = "bg-red-50 text-red-700 ring-red-100";
  } else if (quantity <= minimum) {
    label = "Low stock";
    styles = "bg-amber-50 text-amber-700 ring-amber-100";
  }

  return (
    <span className={"inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 " + styles}>
      {label}
    </span>
  );
}

export default StockBadge;
