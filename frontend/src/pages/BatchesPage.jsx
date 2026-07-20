import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import LoadingState from "../components/feedback/LoadingState";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import useAlert from "../hooks/useAlert";
import useConfirmation from "../hooks/useConfirmation";
import normalizeApiError from "../utils/normalizeApiError";
import apiClient from "../api/apiClient";

const defaultFilters = {
  search: "",
  product_id: "",
  status: "",
  expiry_state: "",
  page: 1,
  limit: 20,
};

function BatchesPage() {
  const [batches, setBatches] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });
  const [filters, setFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
  const [loading, setLoading] = useState(true);
  const alert = useAlert();
  const confirm = useConfirmation();

  const [disposeBatch, setDisposeBatch] = useState(null);
  const [disposeQty, setDisposeQty] = useState("");
  const [disposeReason, setDisposeReason] = useState("");
  const [busy, setBusy] = useState(false);

  const loadBatches = useCallback(async (f) => {
    setLoading(true);
    try {
      const { data: responseBody } = await apiClient.get("/batches", { params: f });
      setBatches(responseBody.data?.batches || []);
      setPagination(responseBody.data?.pagination || { page: 1, total_pages: 1, total: 0 });
      setAppliedFilters(f);
    } catch (e) {
      alert.error(normalizeApiError(e).message);
    } finally {
      setLoading(false);
    }
  }, [alert]);

  useEffect(() => {
    document.title = "Batches & Expiry | MH Mini Mart";
    loadBatches(defaultFilters);
  }, [loadBatches]);

  function applyFilters(e) {
    e.preventDefault();
    loadBatches({ ...filters, page: 1 });
  }

  function clearFilters() {
    setFilters(defaultFilters);
    loadBatches(defaultFilters);
  }

  async function handleBlock(batch) {
    const isBlocked = batch.status === "blocked";
    const confirmed = await confirm({
      title: isBlocked ? "Unblock Batch" : "Block Batch",
      description: isBlocked 
        ? `Are you sure you want to unblock batch ${batch.batch_number}? It will be available for sales again.`
        : `Are you sure you want to block batch ${batch.batch_number}? It will not be used in future sales.`,
      confirmText: isBlocked ? "Unblock" : "Block",
      tone: isBlocked ? "primary" : "danger"
    });
    if (!confirmed) return;

    try {
      const endpoint = isBlocked ? `/batches/${batch.id}/unblock` : `/batches/${batch.id}/block`;
      const { data } = await apiClient.post(endpoint);
      alert.success(data.message || "Batch status updated.");
      loadBatches(appliedFilters);
    } catch (e) {
      alert.error(normalizeApiError(e).message);
    }
  }

  async function handleDisposeSubmit(e) {
    e.preventDefault();
    if (!disposeQty || Number(disposeQty) <= 0) {
      alert.error("Enter a valid quantity to dispose.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await apiClient.post(`/batches/${disposeBatch.id}/dispose`, {
        quantity: disposeQty,
        reason: disposeReason,
      });
      alert.success(data.message || "Batch disposed.");
      setDisposeBatch(null);
      setDisposeQty("");
      setDisposeReason("");
      loadBatches(appliedFilters);
    } catch (e) {
      alert.error(normalizeApiError(e).message);
    } finally {
      setBusy(false);
    }
  }

  const hasFilters = appliedFilters.search || appliedFilters.status || appliedFilters.expiry_state;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-blue-600">Inventory management</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
          Batches & Expiry
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Track product batches, monitor expirations, and manage blocked stock.
        </p>
      </header>

      <section className="premium-surface overflow-hidden rounded-2xl p-5">
        <form onSubmit={applyFilters} className="grid gap-4 sm:grid-cols-4 items-end mb-6">
          <label className="text-xs font-bold text-slate-600">
            Search
            <input
              type="text"
              placeholder="Batch or Product..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 font-normal"
            />
          </label>
          <label className="text-xs font-bold text-slate-600">
            Status
            <select
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 font-normal"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
              <option value="depleted">Depleted</option>
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">
            Expiry State
            <select
              value={filters.expiry_state}
              onChange={e => setFilters(f => ({ ...f, expiry_state: e.target.value }))}
              className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 font-normal"
            >
              <option value="">All</option>
              <option value="valid">Valid (Unexpired)</option>
              <option value="near_expiry">Near Expiry (30 days)</option>
              <option value="expired">Expired</option>
            </select>
          </label>
          <div className="flex gap-2">
            <button type="submit" className="min-h-11 flex-1 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700">Apply</button>
            {hasFilters && <button type="button" onClick={clearFilters} className="min-h-11 flex-1 rounded-xl bg-slate-100 text-sm font-semibold text-slate-600 hover:bg-slate-200">Clear</button>}
          </div>
        </form>

        {loading ? (
          <LoadingState message="Loading batches..." />
        ) : !batches || batches.length === 0 ? (
          <EmptyState title="No batches found" description="Adjust your filters or add batch-tracked stock via Purchases." icon="cube" />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Batch Number</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-right">Remaining</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map(b => {
                  const isExpired = b.expiry_date && new Date(b.expiry_date) < new Date();
                  return (
                    <tr key={b.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-bold text-slate-900">{b.batch_number}</td>
                      <td className="px-4 py-3">
                        <Link to={`/products`} className="text-blue-600 hover:underline">{b.product_name}</Link>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-700">
                        {Number(b.remaining_quantity)}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="text-slate-500">Mfg: {b.manufacturing_date || '-'}</div>
                        <div className={isExpired ? 'font-bold text-red-600' : 'text-slate-500'}>
                          Exp: {b.expiry_date || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {b.status === "active" && <span className="rounded-md bg-emerald-100 px-2 py-1 font-bold text-emerald-800">Active</span>}
                        {b.status === "blocked" && <span className="rounded-md bg-red-100 px-2 py-1 font-bold text-red-800">Blocked</span>}
                        {b.status === "depleted" && <span className="rounded-md bg-slate-100 px-2 py-1 font-bold text-slate-800">Depleted</span>}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {b.status !== "depleted" && (
                          <button onClick={() => handleBlock(b)} className="text-xs font-bold text-slate-600 hover:text-slate-900">
                            {b.status === "blocked" ? "Unblock" : "Block"}
                          </button>
                        )}
                        {b.status !== "depleted" && Number(b.remaining_quantity) > 0 && (
                          <button onClick={() => { setDisposeBatch(b); setDisposeQty(Number(b.remaining_quantity)); }} className="text-xs font-bold text-red-600 hover:text-red-800">
                            Dispose
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && pagination.total_pages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-medium text-slate-500">
            <span>Page {pagination.page} of {pagination.total_pages}</span>
            <div className="flex gap-2">
              <button disabled={pagination.page <= 1} onClick={() => loadBatches({ ...appliedFilters, page: pagination.page - 1 })} className="rounded-lg border px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50">Prev</button>
              <button disabled={pagination.page >= pagination.total_pages} onClick={() => loadBatches({ ...appliedFilters, page: pagination.page + 1 })} className="rounded-lg border px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </section>

      <Modal isOpen={!!disposeBatch} onClose={() => setDisposeBatch(null)} title="Dispose Batch Stock" size="sm">
        <form onSubmit={handleDisposeSubmit} className="space-y-4 p-5">
          <p className="text-sm text-slate-600">
            Dispose remaining stock for batch <strong>{disposeBatch?.batch_number}</strong>. This cannot be undone.
          </p>
          <label className="block">
            <span className="text-xs font-bold text-slate-600 mb-1 block">Quantity to dispose</span>
            <input type="number" min="0.001" step="0.001" max={disposeBatch?.remaining_quantity} required value={disposeQty} onChange={e => setDisposeQty(e.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 px-3" />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-600 mb-1 block">Reason</span>
            <input type="text" required placeholder="e.g. Expired, damaged" value={disposeReason} onChange={e => setDisposeReason(e.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 px-3" />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setDisposeBatch(null)} className="min-h-10 rounded-lg border px-4 text-sm font-semibold text-slate-600" disabled={busy}>Cancel</button>
            <button type="submit" className="min-h-10 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white" disabled={busy}>{busy ? "Processing..." : "Dispose Stock"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default BatchesPage;
