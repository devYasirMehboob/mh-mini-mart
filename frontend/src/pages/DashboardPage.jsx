import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboard } from "../api/dashboardApi";
import AlertMessage from "../components/AlertMessage";
import Icon from "../components/Icon";
import LoadingState from "../components/LoadingState";
import BestSellingProducts from "../components/dashboard/BestSellingProducts";
import PaymentMethodSummary from "../components/dashboard/PaymentMethodSummary";
import RecentSalesTable from "../components/dashboard/RecentSalesTable";
import SalesBarChart from "../components/dashboard/SalesBarChart";
import SummaryCards from "../components/dashboard/SummaryCards";
import ResetDatabaseCard from "../components/dashboard/ResetDatabaseCard";
import { formatCurrency } from "../utils/calculateSaleTotals";
import useOffline from "../hooks/useOffline";
import { getCachedProducts, getOfflineSales } from "../utils/idb";
import { RefreshCw, ShoppingCart, ShoppingBag, HardDrive, WifiOff, AlertOctagon, LogOut } from "lucide-react";

function safeErrorMessage(error) {
  if (!error.response)
    return "The local API could not be reached. Check that XAMPP is running.";
  return (
    error.response.data?.message ||
    "Dashboard data could not be loaded. Please try again."
  );
}

function ProfitBreakdown({ breakdown }) {
  if (!breakdown) return null;
  const rows = [
    ["Gross sales", breakdown.gross_sales],
    ["Discounts", breakdown.discounts],
    ["Net sales", breakdown.net_sales],
    ["Cost of goods sold", breakdown.cost_of_goods_sold],
    ["Gross profit", breakdown.gross_profit],
    ["Expenses", breakdown.expenses],
  ];
  return (
    <section className="premium-surface rounded-xl p-5 sm:p-6">
      <h3 className="text-base font-extrabold text-slate-900">
        Profit breakdown
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        Backend-calculated estimate for today.
      </p>
      <dl className="mt-5 space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 text-xs">
            <dt className="text-slate-500">{label}</dt>
            <dd className="font-bold text-slate-800">
              {formatCurrency(value)}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
        <span className="text-xs font-bold text-emerald-700">
          Estimated profit
        </span>
        <strong className="text-base font-extrabold text-emerald-900">
          {formatCurrency(breakdown.estimated_profit)}
        </strong>
      </div>
    </section>
  );
}

// ----------------------------------------------------
// Offline Emergency Dashboard View Component
// ----------------------------------------------------
function OfflineDashboardView({ deviceConfig, offlineUser, logoutOffline }) {
  const { isOnline, pendingSyncCount, isSyncing, syncPendingSales } = useOffline();
  const [cachedProductCount, setCachedProductCount] = useState(0);
  const [todayOfflineSales, setTodayOfflineSales] = useState(0);
  const [todayOfflineAmount, setTodayOfflineAmount] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);

  useEffect(() => {
    async function loadOfflineMetrics() {
      try {
        const products = await getCachedProducts();
        setCachedProductCount(products.length);

        const sales = await getOfflineSales();
        const todayStr = new Date().toISOString().slice(0, 10);
        const todaySales = sales.filter(s => s.created_at?.slice(0, 10) === todayStr);

        setTodayOfflineSales(todaySales.length);
        const totalAmt = todaySales.reduce((acc, s) => acc + (parseFloat(s.grand_total) || 0), 0);
        setTodayOfflineAmount(totalAmt);

        const conflicts = sales.filter(s => s.sync_status === 'conflict').length;
        setConflictCount(conflicts);
      } catch (e) {
        console.error("Failed to load IndexedDB offline dashboard metrics", e);
      }
    }
    loadOfflineMetrics();
  }, []);

  const expiryFormatted = deviceConfig?.expiry_date
    ? new Date(deviceConfig.expiry_date).toLocaleDateString("en-PK", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "N/A";

  return (
    <div className="space-y-6">
      {/* Offline Status Header Banner */}
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <WifiOff className="h-6 w-6 text-amber-600 shrink-0" />
              <h2 className="text-xl font-bold text-amber-900">
                Offline Emergency Dashboard
              </h2>
            </div>
            <p className="mt-1 text-sm text-amber-700">
              Emergency fallback mode active for authorized terminal:{" "}
              <strong className="font-semibold">{deviceConfig?.device_name || "POS Computer"}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/pos"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-amber-700 transition"
            >
              <ShoppingCart className="h-4 w-4" /> Open Offline POS
            </Link>

            <Link
              to="/sales"
              className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-bold text-amber-900 shadow-sm hover:bg-amber-50 transition"
            >
              <ShoppingBag className="h-4 w-4" /> Offline Sales List
            </Link>

            {isOnline && pendingSyncCount > 0 && (
              <button
                onClick={syncPendingSales}
                disabled={isSyncing}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-blue-700 transition disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Syncing..." : "Sync Pending Sales"}
              </button>
            )}

            <button
              onClick={logoutOffline}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition"
            >
              <LogOut className="h-4 w-4" /> Exit Session
            </button>
          </div>
        </div>

        {/* Disclaimer Notice */}
        <div className="mt-4 border-t border-amber-200/80 pt-3 text-xs text-amber-800 flex items-center gap-2">
          <AlertOctagon className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            <strong>Disclaimer:</strong> Figures shown below are calculated strictly from local IndexedDB data and pending offline sales. They do not represent live server database totals.
          </span>
        </div>
      </section>

      {/* Local Offline Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <HardDrive className="h-5 w-5 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Cached Products</h3>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">{cachedProductCount}</p>
          <p className="mt-1 text-xs text-slate-500">Available for offline scan</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <ShoppingCart className="h-5 w-5 text-green-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Today's Offline Sales</h3>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">{todayOfflineSales}</p>
          <p className="mt-1 text-xs text-slate-500">Totaling {formatCurrency(todayOfflineAmount)}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <RefreshCw className="h-5 w-5 text-amber-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Pending Sync</h3>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-amber-600">{pendingSyncCount}</p>
          <p className="mt-1 text-xs text-slate-500">Sales waiting to upload</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <AlertOctagon className="h-5 w-5 text-red-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Sync Conflicts</h3>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-red-600">{conflictCount}</p>
          <p className="mt-1 text-xs text-slate-500">Requires online review</p>
        </div>
      </div>

      {/* Terminal Info Summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <h3 className="text-base font-bold text-slate-900">Emergency Terminal Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
          <div>
            <span className="block text-slate-400">Authenticated Admin:</span>
            <strong className="text-sm font-semibold text-slate-800">{offlineUser?.name || "Admin"}</strong>
          </div>
          <div>
            <span className="block text-slate-400">Device ID:</span>
            <span className="font-mono text-slate-800">{deviceConfig?.device_id || "N/A"}</span>
          </div>
          <div>
            <span className="block text-slate-400">Offline Access Expiry:</span>
            <span className="font-semibold text-amber-700">{expiryFormatted}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardPage() {
  const { isOnline, isEmergencyMode, deviceConfig, offlineUser, logoutOffline } = useOffline();
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Dashboard | MH Mini Mart";
  }, []);

  const loadDashboard = useCallback(async (refresh = false) => {
    if (!isOnline && isEmergencyMode) {
      setIsLoading(false);
      return;
    }

    refresh ? setIsRefreshing(true) : setIsLoading(true);
    setError("");
    try {
      setDashboard(await getDashboard());
    } catch (requestError) {
      setError(safeErrorMessage(requestError));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isOnline, isEmergencyMode]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // If offline or in emergency mode without server response, render Offline Dashboard
  if (!isOnline || (isEmergencyMode && !dashboard)) {
    return (
      <OfflineDashboardView
        deviceConfig={deviceConfig}
        offlineUser={offlineUser}
        logoutOffline={logoutOffline}
      />
    );
  }

  const formattedDate = new Intl.DateTimeFormat("en-PK", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  if (isLoading)
    return (
      <div className="premium-surface rounded-xl">
        <LoadingState label="Loading shop dashboard..." />
      </div>
    );

  if (!dashboard)
    return (
      <div className="space-y-4">
        <AlertMessage message={error} />
        <button
          type="button"
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
          onClick={() => loadDashboard()}
        >
          Try again
        </button>
      </div>
    );

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-[28px] font-extrabold tracking-[-0.035em] text-slate-950">
            Overview
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            A clear view of your shop activity for {formattedDate}.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isRefreshing}
            onClick={() => loadDashboard(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
          >
            <Icon
              name="refresh"
              className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
            />{" "}
            Refresh
          </button>
          <Link
            to="/pos"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
          >
            <Icon name="pos" className="size-[18px]" /> Open POS
          </Link>
        </div>
      </section>

      <AlertMessage message={error} onDismiss={() => setError("")} />
      <SummaryCards
        summary={dashboard.summary}
        canViewFinancials={dashboard.permissions.view_financials}
      />

      <section className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
        <SalesBarChart
          title="Sales by hour"
          subtitle="Today's completed sales throughout the day."
          data={dashboard.hourly_sales}
          compact
        />
        {dashboard.permissions.view_financials ? (
          <ProfitBreakdown breakdown={dashboard.profit_breakdown} />
        ) : (
          <PaymentMethodSummary methods={dashboard.payment_methods} />
        )}
      </section>

      <SalesBarChart
        title="Daily sales"
        subtitle="Completed sales for each day of the current month."
        data={dashboard.monthly_sales}
      />

      <section className="grid gap-5 xl:grid-cols-[1.45fr_0.55fr]">
        <RecentSalesTable sales={dashboard.recent_sales} />
        <BestSellingProducts products={dashboard.best_selling_products} />
      </section>

      {dashboard.permissions.view_financials && (
        <PaymentMethodSummary methods={dashboard.payment_methods} />
      )}

      {dashboard.permissions.view_financials && (
        <div className="mt-8 hidden">
          <ResetDatabaseCard />
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
