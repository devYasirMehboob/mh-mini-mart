import { useEffect, useState } from "react";
import apiClient from "../api/apiClient";
import normalizeApiError from "../utils/normalizeApiError";
import Icon from "../components/Icon";
import LoadingState from "../components/feedback/LoadingState";
import useAlert from "../hooks/useAlert";

function PackagingStockPage() {
  const alert = useAlert();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    document.title = "Packaging & Bulk Stock Analytics | MH Mini Mart";
    fetchData();
  }, []);

  function fetchData(query = search) {
    setLoading(true);
    apiClient
      .get("/reports/packaging-stock", { params: { search: query } })
      .then((res) => {
        setData(res.data?.data?.rows || []);
      })
      .catch((err) => {
        alert.error(normalizeApiError(err).message);
        setData([]);
      })
      .finally(() => setLoading(false));
  }

  const filtered = data.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.product_name.toLowerCase().includes(q) ||
      (item.product_code || "").toLowerCase().includes(q) ||
      (item.category_name || "").toLowerCase().includes(q) ||
      (item.pack_unit_name || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[28px] font-extrabold text-slate-900">
            Packaging & Bulk Stock Analytics
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Real-world breakdown of purchased Boriyan, Cartons & Boxes vs remaining sealed packs and open stock.
          </p>
        </div>
      </header>

      <section className="premium-surface flex items-center justify-between gap-4 rounded-xl p-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by product, code, or packaging unit..."
            className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-xs font-medium outline-none focus:border-blue-500"
          />
          <Icon name="search" className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400" />
        </div>
        <button
          type="button"
          onClick={() => fetchData(search)}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
        >
          <Icon name="refresh" className="size-4" />
          Refresh Data
        </button>
      </section>

      {loading ? (
        <LoadingState message="Calculating packaging stock breakdown..." />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center text-xs font-medium text-slate-400 bg-white">
          No packaging products found matching your filter.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3.5">Product Master</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Packaging Unit</th>
                  <th className="px-4 py-3.5 text-right">Total Purchased</th>
                  <th className="px-4 py-3.5 text-right">Total Sold</th>
                  <th className="px-4 py-3.5 text-right">Remaining Base Stock</th>
                  <th className="px-4 py-3.5 text-center">Real-World Stock Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item, idx) => (
                  <tr key={`${item.product_id}-${idx}`} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3.5">
                      <div className="font-extrabold text-slate-900">{item.product_name}</div>
                      <div className="mt-0.5 font-mono text-[10px] text-slate-400">{item.product_code}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                        {item.category_name}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-800">
                        1 {item.pack_unit_name} = {item.pack_conversion} {item.base_unit_symbol}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="font-extrabold text-slate-900">
                        {Number(item.total_purchased_packs).toLocaleString()} {item.pack_unit_name}(s)
                      </div>
                      <div className="text-[10px] text-slate-400">
                        ({Number(item.total_purchased_base).toLocaleString()} {item.base_unit_symbol})
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="font-bold text-slate-700">
                        {Number(item.total_sold_base).toLocaleString()} {item.base_unit_symbol}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <strong className="text-sm font-extrabold text-blue-600">
                        {Number(item.stock_quantity_base).toLocaleString()} {item.base_unit_symbol}
                      </strong>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-block rounded-lg px-3 py-1.5 text-xs font-extrabold border ${
                          item.full_packs_remaining > 0
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : item.partial_base_remaining > 0
                            ? "bg-amber-50 border-amber-200 text-amber-800"
                            : "bg-red-50 border-red-200 text-red-700"
                        }`}
                      >
                        {item.real_world_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default PackagingStockPage;
