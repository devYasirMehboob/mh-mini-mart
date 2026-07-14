import Icon from "../Icon";
function UserFilters({ filters, roles, onChange, onClear, onRefresh, isLoading }) {
  return <section className="premium-surface rounded-xl p-4"><div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_180px_auto_auto]">
    <label className="relative"><span className="sr-only">Search users</span><Icon name="search" className="pointer-events-none absolute left-3.5 top-3 size-4 text-slate-400"/><input className="min-h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50" placeholder="Search by name" value={filters.search} onChange={(event)=>onChange("search",event.target.value)}/></label>
    <select className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus:border-blue-400" value={filters.role} onChange={(event)=>onChange("role",event.target.value)}><option value="">All roles</option>{roles.map((role)=><option key={role.id} value={role.slug}>{role.name}</option>)}</select>
    <select className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus:border-blue-400" value={filters.status} onChange={(event)=>onChange("status",event.target.value)}><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
    <button type="button" className="min-h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-600 hover:bg-slate-50" onClick={onClear}>Clear</button>
    <button type="button" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50" onClick={onRefresh} disabled={isLoading}><Icon name="refresh" className={`size-4 ${isLoading?"animate-spin":""}`}/>Refresh</button>
  </div></section>;
}
export default UserFilters;