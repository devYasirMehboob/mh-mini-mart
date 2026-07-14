function SalesPagination({ pagination, onPage }) {
  if (!pagination || pagination.total_pages <= 1) return null;
  return <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-xs sm:flex-row sm:items-center sm:justify-between"><p className="text-slate-500">Page <strong>{pagination.page}</strong> of <strong>{pagination.total_pages}</strong> · {pagination.total} records</p><div className="flex gap-2"><button type="button" disabled={pagination.page<=1} onClick={()=>onPage(pagination.page-1)} className="rounded-lg border border-slate-200 px-3 py-2 font-bold text-slate-600 disabled:opacity-40">Previous</button><button type="button" disabled={pagination.page>=pagination.total_pages} onClick={()=>onPage(pagination.page+1)} className="rounded-lg border border-slate-200 px-3 py-2 font-bold text-slate-600 disabled:opacity-40">Next</button></div></div>;
}
export default SalesPagination;
