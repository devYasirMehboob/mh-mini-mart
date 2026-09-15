import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getCustomerSummary,
  getCustomerLedger,
  getCustomerStatement,
  getCustomerPurchases,
  getCustomerPayments,
} from "../api/customersApi";
import normalizeApiError from "../utils/normalizeApiError";
import CustomerLedgerTable from "../components/customers/CustomerLedgerTable";
import CustomerPurchasesTable from "../components/customers/CustomerPurchasesTable";
import ReceiveKhataPaymentDialog from "../components/customers/ReceiveKhataPaymentDialog";
import SaleDetailsModal from "../components/sales/SaleDetailsModal";
import { getSale } from "../api/salesApi";
import { formatCurrency } from "../utils/calculateSaleTotals";
import Icon from "../components/Icon";

const TABS = ["Profile", "Purchases", "Ledger", "Statement"];

function SummaryCard({ label, value, color = "text-slate-900", sub }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-extrabold ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-slate-400">{sub}</p>}
    </div>
  );
}

function CustomerDetailsPage() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("Profile");
  const [success, setSuccess] = useState("");

  // Ledger
  const [ledger, setLedger] = useState({ entries: [], pagination: null });
  const [ledgerPage, setLedgerPage] = useState(1);

  // Purchases
  const [purchases, setPurchases] = useState({ purchases: [], pagination: null });
  const [purchasePage, setPurchasePage] = useState(1);

  // Statement
  const [statementFrom, setStatementFrom] = useState("");
  const [statementTo, setStatementTo] = useState(new Date().toISOString().slice(0, 10));
  const [statement, setStatement] = useState(null);
  const [statementLoading, setStatementLoading] = useState(false);

  // Payment modal
  const [showPayment, setShowPayment] = useState(false);

  // Sale Details Modal
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [saleDetails, setSaleDetails] = useState(null);
  const [isSaleLoading, setIsSaleLoading] = useState(false);

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(""), 3500); };

  useEffect(() => {
    async function load() {
      setLoading(true); setError("");
      try {
        const res = await getCustomerSummary(Number(id));
        setCustomer(res.data?.customer || null);
      } catch (err) {
        setError(normalizeApiError(err).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  useEffect(() => {
    if (activeTab !== "Ledger") return;
    getCustomerLedger(id, { page: ledgerPage, limit: 30 }).then((res) => {
      setLedger({ entries: res.data?.entries || [], pagination: res.data?.pagination || null });
    }).catch(() => {});
  }, [id, activeTab, ledgerPage]);

  useEffect(() => {
    if (activeTab !== "Purchases") return;
    getCustomerPurchases(id, { page: purchasePage, limit: 25 }).then((res) => {
      setPurchases({ purchases: res.data?.purchases || [], pagination: res.data?.pagination || null });
    }).catch(() => {});
  }, [id, activeTab, purchasePage]);

  async function loadStatement() {
    setStatementLoading(true);
    try {
      const res = await getCustomerStatement(id, { date_from: statementFrom, date_to: statementTo });
      setStatement(res.data || null);
    } catch (err) {
      setError(normalizeApiError(err).message);
    } finally {
      setStatementLoading(false);
    }
  }

  async function handleViewSale(saleId) {
    setSelectedSaleId(saleId);
    setIsSaleLoading(true);
    try {
      const saleData = await getSale(saleId);
      setSaleDetails(saleData);
    } catch (err) {
      flash("Failed to load sale details.");
      setSelectedSaleId(null);
    } finally {
      setIsSaleLoading(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading...</div>;
  }
  if (error && !customer) {
    return <div className="p-8 text-center text-xs text-red-500">{error}</div>;
  }
  if (!customer) return null;

  const outstanding = Number(customer.current_balance || 0);
  const advance = Number(customer.advance_balance || 0);

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/customers" className="text-xs text-blue-600 hover:underline">← Customers</Link>
          </div>
          <h1 className="mt-1 text-xl font-extrabold text-slate-900">{customer.name}</h1>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="font-mono">{customer.customer_code}</span>
            {customer.phone && <span>{customer.phone}</span>}
            {customer.email && <span>{customer.email}</span>}
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${customer.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
              {customer.status}
            </span>
          </div>
        </div>
        {outstanding > 0 && Number(customer.khata_enabled) === 1 && customer.status === "active" && (
          <button
            type="button"
            onClick={() => setShowPayment(true)}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
          >
            <Icon name="cash" className="size-3.5" />
            Receive Payment
          </button>
        )}
      </div>

      {success && <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 border border-emerald-100">{success}</div>}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard 
          label="Outstanding" 
          value={formatCurrency(outstanding)} 
          color={outstanding > 0 ? "text-red-600" : "text-slate-400"} 
          sub={Number(customer.khata_enabled) === 1 ? (Number(customer.credit_limit) > 0 ? `Limit: ${formatCurrency(customer.credit_limit)}` : "No limit") : null}
        />
        <SummaryCard label="Total Purchases" value={formatCurrency(customer.total_purchase_value || 0)} />
        <SummaryCard label="Purchase Count" value={customer.purchase_count || 0} sub="completed sales" />
        <SummaryCard label="Total Paid" value={formatCurrency(customer.total_payments || 0)} color="text-emerald-700" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${activeTab === tab ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {activeTab === "Profile" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><p className="text-[10px] font-bold uppercase text-slate-400">Customer Type</p><p className="text-sm text-slate-800 capitalize">{customer.customer_type?.replace(/_/g, " ")}</p></div>
            <div><p className="text-[10px] font-bold uppercase text-slate-400">Khata Enabled</p><p className="text-sm text-slate-800">{Number(customer.khata_enabled) ? "Yes" : "No"}</p></div>
            {Number(customer.khata_enabled) === 1 && <div><p className="text-[10px] font-bold uppercase text-slate-400">Credit Limit</p><p className="text-sm text-slate-800">{Number(customer.credit_limit) > 0 ? formatCurrency(customer.credit_limit) : "No limit"}</p></div>}
            <div><p className="text-[10px] font-bold uppercase text-slate-400">Created</p><p className="text-sm text-slate-800">{customer.created_at ? new Date(customer.created_at).toLocaleDateString("en-PK") : "—"}</p></div>
            {customer.address && <div className="sm:col-span-2"><p className="text-[10px] font-bold uppercase text-slate-400">Address</p><p className="text-sm text-slate-800">{customer.address}</p></div>}
            {customer.notes && <div className="sm:col-span-2"><p className="text-[10px] font-bold uppercase text-slate-400">Notes</p><p className="text-sm text-slate-800">{customer.notes}</p></div>}
          </div>
        </div>
      )}

      {/* Purchases tab */}
      {activeTab === "Purchases" && (
        <CustomerPurchasesTable
          purchases={purchases.purchases}
          onViewSale={handleViewSale}
        />
      )}

      {/* Ledger tab */}
      {activeTab === "Ledger" && (
        <CustomerLedgerTable entries={ledger.entries} />
      )}

      {/* Statement tab */}
      {activeTab === "Statement" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">From</label>
              <input type="date" value={statementFrom} onChange={(e) => setStatementFrom(e.target.value)} className="min-h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">To</label>
              <input type="date" value={statementTo} onChange={(e) => setStatementTo(e.target.value)} className="min-h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50" />
            </div>
            <button type="button" onClick={loadStatement} disabled={statementLoading} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
              {statementLoading ? "Loading..." : "Load Statement"}
            </button>
            {statement && (
              <button type="button" onClick={() => window.print()} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
                Print
              </button>
            )}
          </div>
          {statement && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Account Statement</h2>
                  <p className="text-xs text-slate-400">{customer.name} ({customer.customer_code}){statementFrom ? ` — From: ${statementFrom}` : ""} To: {statementTo}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400">Opening Balance</p>
                  <p className={`text-sm font-bold ${Number(statement.opening_balance || 0) > 0 ? "text-red-600" : "text-slate-600"}`}>{formatCurrency(statement.opening_balance || 0)}</p>
                </div>
              </div>
              <CustomerLedgerTable entries={statement.entries || []} />
            </div>
          )}
        </div>
      )}

      {/* Payment modal */}
      <ReceiveKhataPaymentDialog
        open={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={() => {
          setShowPayment(false);
          flash("Payment received successfully!");
          // Reload summary to get updated balances
          getCustomerSummary(Number(id)).then(res => setCustomer(res.data?.customer || null));
        }}
        customer={customer}
      />

      {selectedSaleId && (
        <SaleDetailsModal
          isOpen={true}
          sale={saleDetails}
          isLoading={isSaleLoading}
          onClose={() => {
            setSelectedSaleId(null);
            setSaleDetails(null);
          }}
          onReceipt={(sale) => window.open(`/sales/${sale.id}/receipt`, "_blank")}
          onAction={() => {}} // Not needed for customer details view
        />
      )}
    </div>
  );
}

export default CustomerDetailsPage;
