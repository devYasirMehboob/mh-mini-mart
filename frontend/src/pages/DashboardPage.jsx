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
import { formatCurrency } from "../utils/calculateSaleTotals";

function safeErrorMessage(error) {
  if (!error.response) return "The local API could not be reached. Check that XAMPP is running.";
  return error.response.data?.message || "Dashboard data could not be loaded. Please try again.";
}

function ProfitBreakdown({ breakdown }) {
  if (!breakdown) return null;
  const rows = [
    ["Gross sales", breakdown.gross_sales], ["Discounts", breakdown.discounts],
    ["Net sales", breakdown.net_sales], ["Cost of goods sold", breakdown.cost_of_goods_sold], ["Gross profit", breakdown.gross_profit],
    ["Expenses", breakdown.expenses],
  ];
  return (
    <section className="premium-surface rounded-xl p-5 sm:p-6">
      <h3 className="text-base font-extrabold text-slate-900">Profit breakdown</h3><p className="mt-1 text-xs text-slate-500">Backend-calculated estimate for today.</p>
      <dl className="mt-5 space-y-3">{rows.map(([label, value]) => <div key={label} className="flex justify-between gap-4 text-xs"><dt className="text-slate-500">{label}</dt><dd className="font-bold text-slate-800">{formatCurrency(value)}</dd></div>)}</dl>
      <div className="mt-5 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3"><span className="text-xs font-bold text-emerald-700">Estimated profit</span><strong className="text-base font-extrabold text-emerald-900">{formatCurrency(breakdown.estimated_profit)}</strong></div>
    </section>
  );
}

function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { document.title = "Dashboard | MH Mini Mart"; }, []);

  const loadDashboard = useCallback(async (refresh = false) => {
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
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const formattedDate = new Intl.DateTimeFormat("en-PK", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  if (isLoading) return <div className="premium-surface rounded-xl"><LoadingState label="Loading shop dashboard..." /></div>;

  if (!dashboard) return <div className="space-y-4"><AlertMessage message={error} /><button type="button" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700" onClick={() => loadDashboard()}>Try again</button></div>;

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><h2 className="text-[28px] font-extrabold tracking-[-0.035em] text-slate-950">Overview</h2><p className="mt-1.5 text-sm text-slate-500">A clear view of your shop activity for {formattedDate}.</p></div>
        <div className="flex gap-2">
          <button type="button" disabled={isRefreshing} onClick={() => loadDashboard(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"><Icon name="refresh" className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} /> Refresh</button>
          <Link to="/pos" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"><Icon name="pos" className="size-[18px]" /> Open POS</Link>
        </div>
      </section>

      <AlertMessage message={error} onDismiss={() => setError("")} />
      <SummaryCards summary={dashboard.summary} canViewFinancials={dashboard.permissions.view_financials} />

      <section className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
        <SalesBarChart title="Sales by hour" subtitle="Today's completed sales throughout the day." data={dashboard.hourly_sales} compact />
        {dashboard.permissions.view_financials ? <ProfitBreakdown breakdown={dashboard.profit_breakdown} /> : <PaymentMethodSummary methods={dashboard.payment_methods} />}
      </section>

      <SalesBarChart title="Daily sales" subtitle="Completed sales for each day of the current month." data={dashboard.monthly_sales} />

      <section className="grid gap-5 xl:grid-cols-[1.45fr_0.55fr]">
        <RecentSalesTable sales={dashboard.recent_sales} />
        <BestSellingProducts products={dashboard.best_selling_products} />
      </section>

      {dashboard.permissions.view_financials && <PaymentMethodSummary methods={dashboard.payment_methods} />}
    </div>
  );
}

export default DashboardPage;
