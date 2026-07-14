function SaleStatusBadge({ status }) {
  const styles = { completed: "bg-emerald-50 text-emerald-700 ring-emerald-100", cancelled: "bg-slate-100 text-slate-600 ring-slate-200", refunded: "bg-amber-50 text-amber-700 ring-amber-100", paid: "bg-blue-50 text-blue-700 ring-blue-100", pending: "bg-amber-50 text-amber-700 ring-amber-100", failed: "bg-red-50 text-red-700 ring-red-100" };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ring-1 ${styles[status] || styles.cancelled}`}>{String(status).replaceAll("_", " ")}</span>;
}
export default SaleStatusBadge;
