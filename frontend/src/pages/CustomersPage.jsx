import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { getCustomers, patchCustomerStatus, getCustomersMetrics } from "../api/customersApi";
import normalizeApiError from "../utils/normalizeApiError";
import CustomerForm from "../components/customers/CustomerForm";
import ReceiveKhataPaymentDialog from "../components/customers/ReceiveKhataPaymentDialog";
import { formatCurrency } from "../utils/calculateSaleTotals";
import Icon from "../components/Icon";

function CustomersPage() {
  const [data, setData] = useState({ customers: [], pagination: null });
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [customerType, setCustomerType] = useState("");
  const [status, setStatus] = useState("active");
  const [hasOutstanding, setHasOutstanding] = useState(false);
  const [page, setPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [paymentCustomer, setPaymentCustomer] = useState(null);
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [res, metricsRes] = await Promise.all([
        getCustomers({
          search, customer_type: customerType, status,
          has_outstanding: hasOutstanding ? 1 : "",
          page, limit: 25,
        }),
        getCustomersMetrics()
      ]);
      setData({ customers: res.data?.customers || [], pagination: res.data?.pagination || null });
      setMetrics(metricsRes.data?.metrics || null);
    } catch (err) {
      setError(normalizeApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [search, customerType, status, hasOutstanding, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, customerType, status, hasOutstanding]);

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(""), 3500); };

  async function handleStatusChange(customer, newStatus) {
    try {
      await patchCustomerStatus(customer.id, newStatus);
      flash(`${customer.name} ${newStatus}.`);
      load();
    } catch (err) {
      setError(normalizeApiError(err).message);
    }
  }

  const pagination = data.pagination;

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Customers</h1>
          <p className="mt-0.5 text-xs text-slate-400">Manage customer profiles and khata accounts.</p>
        </div>
        <button
          type="button"
          onClick={() => { setEditCustomer(null); setShowForm(true); }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
        >
          <Icon name="plus" className="size-3.5" />
          New Customer
        </button>
      </div>

      {success && (
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 border border-emerald-100">{success}</div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 border border-red-100">{error}</div>
      )}

      {/* KPI Cards */}
      {metrics && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Sales</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{formatCurrency(metrics.total_sales)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Outstanding</p>
            <p className="mt-2 text-2xl font-black text-red-600">{formatCurrency(metrics.total_outstanding)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Udhar Recovered</p>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-2xl font-black text-emerald-600">{metrics.recovery_percentage}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, phone, code..."
          className="min-h-9 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
        />
        <select
          value={customerType}
          onChange={(e) => setCustomerType(e.target.value)}
          className="min-h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
        >
          <option value="">All Types</option>
          <option value="regular">Regular</option>
          <option value="walk_in_khata">Walk-in Khata</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="min-h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hasOutstanding}
            onChange={(e) => setHasOutstanding(e.target.checked)}
            className="rounded border-slate-300 text-blue-600"
          />
          <span className="text-xs text-slate-600">Has Outstanding</span>
        </label>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading...</div>
        ) : data.customers.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">No customers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Code</th>
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Phone</th>
                  <th className="px-6 py-3.5 text-center">Type</th>
                  <th className="px-6 py-3.5 text-center">Khata</th>
                  <th className="px-6 py-3.5 text-right">Outstanding</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.customers.map((c) => {
                  const outstanding = Number(c.current_balance || 0);
                  return (
                    <tr key={c.id} className="transition hover:bg-slate-50/60">
                      <td className="px-6 py-4 font-mono text-sm text-slate-500">{c.customer_code}</td>
                      <td className="px-6 py-4">
                        <Link to={`/customers/${c.id}`} className="text-sm font-semibold text-slate-900 hover:text-blue-600 hover:underline">
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{c.phone || "—"}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${c.customer_type === "walk_in_khata" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                          {c.customer_type === "walk_in_khata" ? "Walk-in" : "Regular"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {c.khata_enabled == 1 ? (
                          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-bold text-blue-700">✓ Enabled</span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className={`px-6 py-4 text-right text-sm font-bold ${outstanding > 0 ? "text-red-600" : "text-slate-400"}`}>
                        {outstanding > 0 ? formatCurrency(outstanding) : "—"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${c.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/customers/${c.id}`}
                            className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition hover:bg-slate-100"
                          >
                            View
                          </Link>
                          <button
                            type="button"
                            onClick={() => { setEditCustomer(c); setShowForm(true); }}
                            className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition hover:bg-slate-100"
                          >
                            Edit
                          </button>
                          {outstanding > 0 && c.khata_enabled == 1 && c.status === "active" && (
                            <button
                              type="button"
                              onClick={() => setPaymentCustomer(c)}
                              className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100"
                            >
                              Receive
                            </button>
                          )}
                          {!c.is_system_walk_in && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(c, c.status === "active" ? "inactive" : "active")}
                              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${c.status === "active" ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                            >
                              {c.status === "active" ? "Deactivate" : "Activate"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{pagination.total} customer{pagination.total !== 1 ? "s" : ""}</span>
          <div className="flex gap-1">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded border border-slate-200 bg-white px-2 py-1 hover:bg-slate-50 disabled:opacity-40">Prev</button>
            <span className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-blue-700 font-bold">{page} / {pagination.total_pages}</span>
            <button type="button" onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))} disabled={page >= pagination.total_pages} className="rounded border border-slate-200 bg-white px-2 py-1 hover:bg-slate-50 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <CustomerForm
          open={showForm}
          onClose={() => { setShowForm(false); setEditCustomer(null); }}
          onSuccess={(customer, msg) => { flash(msg || "Customer saved."); load(); }}
          initial={editCustomer}
        />
      )}
      {paymentCustomer && (
        <ReceiveKhataPaymentDialog
          open={Boolean(paymentCustomer)}
          onClose={() => setPaymentCustomer(null)}
          onSuccess={(payment, msg) => { flash(msg || "Payment recorded."); setPaymentCustomer(null); load(); }}
          customer={paymentCustomer}
        />
      )}
    </div>
  );
}

export default CustomersPage;
