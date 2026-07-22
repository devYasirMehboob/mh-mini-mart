import ReadableStock from "../products/ReadableStock";

const typeStyles = {
  addition: "bg-emerald-50 text-emerald-700",
  opening: "bg-blue-50 text-blue-700",
  reduction: "bg-amber-50 text-amber-700",
  adjustment: "bg-violet-50 text-violet-700",
  damaged: "bg-red-50 text-red-700",
  expired: "bg-orange-50 text-orange-700",
  wastage: "bg-rose-50 text-rose-700",
  sale: "bg-slate-100 text-slate-700",
  refund: "bg-cyan-50 text-cyan-700",
};

function TransactionTable({ transactions }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[920px] text-left">
        <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500"><tr><th className="px-6 py-3.5">Date</th><th className="px-6 py-3.5">Product</th><th className="px-6 py-3.5">Type</th><th className="px-6 py-3.5">Quantity</th><th className="px-6 py-3.5">Previous</th><th className="px-6 py-3.5">New stock</th><th className="px-6 py-3.5">Reason</th><th className="px-6 py-3.5">User</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{transactions.map((item) => <tr key={item.id} className="hover:bg-slate-50/60"><td className="px-6 py-4 text-xs text-slate-500">{new Date(item.created_at.replace(" ", "T")).toLocaleString("en-PK")}</td><td className="px-6 py-4"><strong className="block text-sm text-slate-800">{item.product_name}</strong><span className="mt-1 block text-xs text-slate-400">{item.product_code}</span></td><td className="px-6 py-4"><span className={"inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize " + (typeStyles[item.transaction_type] || "bg-slate-100 text-slate-700")}>{item.transaction_type}</span></td><td className="px-6 py-4 text-sm font-semibold text-slate-700"><ReadableStock quantity={item.quantity} unitType={item.unit_type} /></td><td className="px-6 py-4 text-sm text-slate-500"><ReadableStock quantity={item.previous_stock} unitType={item.unit_type} /></td><td className="px-6 py-4 text-sm font-semibold text-slate-800"><ReadableStock quantity={item.new_stock} unitType={item.unit_type} /></td><td className="max-w-xs px-6 py-4 text-sm text-slate-500">{item.reason || "—"}</td><td className="px-6 py-4 text-sm text-slate-500">{item.user_name}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

export default TransactionTable;
