import { useCallback, useEffect, useState } from "react";
import { getCategories } from "../api/categoriesApi";
import {
  getInventory,
  getInventorySummary,
  getProductStockTransactions,
  getStockTransactions,
  recordStockMovement,
} from "../api/inventoryApi";
import AlertMessage from "../components/AlertMessage";
import EmptyState from "../components/EmptyState";
import InventorySummary from "../components/inventory/InventorySummary";
import InventoryTable from "../components/inventory/InventoryTable";
import StockActionForm from "../components/inventory/StockActionForm";
import TransactionTable from "../components/inventory/TransactionTable";
import LoadingState from "../components/LoadingState";
import Modal from "../components/Modal";

const inventoryDefaults = { search: "", category_id: "", stock_status: "", page: 1, limit: 10 };
const historyDefaults = { transaction_type: "", date_from: "", date_to: "", page: 1, limit: 10 };

function apiErrorMessage(error, fallback) {
  if (!error.response) return "The local API could not be reached. Check that Apache and MySQL are running.";
  return error.response.data?.message || fallback;
}

function validationErrors(error) {
  const errors = error.response?.data?.errors || {};
  return Object.fromEntries(Object.entries(errors).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
}

function InventoryPage() {
  const [tab, setTab] = useState("stock");
  const [summary, setSummary] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [inventoryFilters, setInventoryFilters] = useState(inventoryDefaults);
  const [appliedInventoryFilters, setAppliedInventoryFilters] = useState(inventoryDefaults);
  const [inventoryPagination, setInventoryPagination] = useState({ page: 1, total: 0, total_pages: 1 });
  const [transactions, setTransactions] = useState([]);
  const [historyFilters, setHistoryFilters] = useState(historyDefaults);
  const [appliedHistoryFilters, setAppliedHistoryFilters] = useState(historyDefaults);
  const [historyPagination, setHistoryPagination] = useState({ page: 1, total: 0, total_pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [stockProduct, setStockProduct] = useState(null);
  const [stockAction, setStockAction] = useState("add");
  const [stockValues, setStockValues] = useState({ quantity: "", reason: "" });
  const [stockErrors, setStockErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productHistory, setProductHistory] = useState(null);
  const [productHistoryLoading, setProductHistoryLoading] = useState(false);

  const loadInventory = useCallback(async (filters) => {
    setIsLoading(true);

    try {
      const [inventoryData, summaryData] = await Promise.all([
        getInventory(filters),
        getInventorySummary(),
      ]);
      setProducts(inventoryData.products);
      setInventoryPagination(inventoryData.pagination);
      setSummary(summaryData);
      setAppliedInventoryFilters(filters);
    } catch (error) {
      setAlert({ type: "error", message: apiErrorMessage(error, "Unable to load inventory.") });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async (filters) => {
    setHistoryLoading(true);

    try {
      const data = await getStockTransactions(filters);
      setTransactions(data.transactions);
      setHistoryPagination(data.pagination);
      setAppliedHistoryFilters(filters);
    } catch (error) {
      setAlert({ type: "error", message: apiErrorMessage(error, "Unable to load stock history.") });
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Inventory | MH Mini Mart";

    async function initialize() {
      try {
        setCategories((await getCategories()).filter((category) => category.status === "active"));
      } catch (error) {
        setAlert({ type: "error", message: apiErrorMessage(error, "Unable to load categories.") });
      }

      await loadInventory(inventoryDefaults);
    }

    initialize();
  }, [loadInventory]);

  function changeTab(nextTab) {
    setTab(nextTab);
    if (nextTab === "history" && transactions.length === 0) loadHistory(historyDefaults);
  }

  function applyInventoryFilters(event) {
    event.preventDefault();
    const next = { ...inventoryFilters, page: 1 };
    setInventoryFilters(next);
    loadInventory(next);
  }

  function applyHistoryFilters(event) {
    event.preventDefault();
    const next = { ...historyFilters, page: 1 };
    setHistoryFilters(next);
    loadHistory(next);
  }

  function openStockAction(product, action) {
    setStockProduct(product);
    setStockAction(action);
    setStockValues({ quantity: action === "adjust" ? String(Number(product.quantity)) : "", reason: "" });
    setStockErrors({});
  }

  function closeStockAction() {
    if (isSubmitting) return;
    setStockProduct(null);
    setStockErrors({});
  }

  async function submitStockAction(event) {
    event.preventDefault();
    setStockErrors({});

    if (stockValues.quantity === "" || Number(stockValues.quantity) < 0) {
      setStockErrors({ quantity: "Enter a valid quantity." });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await recordStockMovement(stockAction, {
        product_id: stockProduct.id,
        quantity: stockValues.quantity,
        reason: stockValues.reason,
      });
      setStockProduct(null);
      setAlert({ type: "success", message: response.message });
      await loadInventory(appliedInventoryFilters);
      if (tab === "history") await loadHistory(appliedHistoryFilters);
    } catch (error) {
      setStockErrors(validationErrors(error));
      setAlert({ type: "error", message: apiErrorMessage(error, "Unable to save the stock movement.") });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function openProductHistory(product) {
    setProductHistory({ product, transactions: [] });
    setProductHistoryLoading(true);

    try {
      const data = await getProductStockTransactions(product.id, { page: 1, limit: 50 });
      setProductHistory({ product, transactions: data.transactions });
    } catch (error) {
      setProductHistory(null);
      setAlert({ type: "error", message: apiErrorMessage(error, "Unable to load product stock history.") });
    } finally {
      setProductHistoryLoading(false);
    }
  }

  function changeInventoryPage(page) {
    const next = { ...appliedInventoryFilters, page };
    setInventoryFilters(next);
    loadInventory(next);
  }

  function changeHistoryPage(page) {
    const next = { ...appliedHistoryFilters, page };
    setHistoryFilters(next);
    loadHistory(next);
  }

  const inventoryHasFilters = appliedInventoryFilters.search || appliedInventoryFilters.category_id || appliedInventoryFilters.stock_status;

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-blue-600">Stock management</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">Inventory</h2>
        <p className="mt-2 text-sm text-slate-500">Monitor stock levels and record every manual stock movement.</p>
      </section>

      <AlertMessage type={alert?.type} message={alert?.message} onDismiss={() => setAlert(null)} />
      <InventorySummary summary={summary} />

      <div className="flex w-fit rounded-xl border border-slate-200 bg-white p-1">
        <button className={"rounded-lg px-4 py-2 text-sm font-semibold " + (tab === "stock" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50")} type="button" onClick={() => changeTab("stock")}>Current stock</button>
        <button className={"rounded-lg px-4 py-2 text-sm font-semibold " + (tab === "history" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50")} type="button" onClick={() => changeTab("history")}>Transaction history</button>
      </div>

      {tab === "stock" ? (
        <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <form className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-[minmax(240px,1fr)_220px_200px_auto] md:items-end md:px-6" onSubmit={applyInventoryFilters}>
            <label><span className="mb-2 block text-xs font-semibold text-slate-500">Search products</span><input className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100" placeholder="Name, code, or barcode" value={inventoryFilters.search} onChange={(event) => setInventoryFilters((current) => ({ ...current, search: event.target.value }))} /></label>
            <label><span className="mb-2 block text-xs font-semibold text-slate-500">Category</span><select className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400" value={inventoryFilters.category_id} onChange={(event) => setInventoryFilters((current) => ({ ...current, category_id: event.target.value }))}><option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label><span className="mb-2 block text-xs font-semibold text-slate-500">Stock status</span><select className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400" value={inventoryFilters.stock_status} onChange={(event) => setInventoryFilters((current) => ({ ...current, stock_status: event.target.value }))}><option value="">All stock statuses</option><option value="in_stock">In stock</option><option value="low_stock">Low stock</option><option value="out_of_stock">Out of stock</option><option value="tracking_disabled">Tracking disabled</option></select></label>
            <button className="min-h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700" type="submit">Apply filters</button>
          </form>
          <div className="border-b border-slate-100 px-6 py-4"><h3 className="text-base font-bold text-slate-900">Current stock</h3><p className="mt-1 text-xs text-slate-500">{isLoading ? "Loading..." : inventoryPagination.total + " products"}</p></div>
          {isLoading ? <LoadingState label="Loading inventory..." /> : products.length === 0 ? <EmptyState icon={inventoryHasFilters ? "search" : "inventory"} title={inventoryHasFilters ? "No matching stock" : "No products available"} description={inventoryHasFilters ? "Try adjusting the inventory filters." : "Add products before managing inventory."} /> : <InventoryTable products={products} onAction={openStockAction} onHistory={openProductHistory} />}
          {!isLoading && inventoryPagination.total_pages > 1 && <Pagination pagination={inventoryPagination} onChange={changeInventoryPage} />}
        </section>
      ) : (
        <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <form className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-[220px_180px_180px_auto] md:items-end md:px-6" onSubmit={applyHistoryFilters}>
            <label><span className="mb-2 block text-xs font-semibold text-slate-500">Transaction type</span><select className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" value={historyFilters.transaction_type} onChange={(event) => setHistoryFilters((current) => ({ ...current, transaction_type: event.target.value }))}><option value="">All types</option>{["opening","addition","reduction","adjustment","damaged","expired","wastage","sale","refund"].map((type) => <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>)}</select></label>
            <label><span className="mb-2 block text-xs font-semibold text-slate-500">From</span><input className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" type="date" value={historyFilters.date_from} onChange={(event) => setHistoryFilters((current) => ({ ...current, date_from: event.target.value }))} /></label>
            <label><span className="mb-2 block text-xs font-semibold text-slate-500">To</span><input className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" type="date" value={historyFilters.date_to} onChange={(event) => setHistoryFilters((current) => ({ ...current, date_to: event.target.value }))} /></label>
            <button className="min-h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white" type="submit">Apply filters</button>
          </form>
          <div className="border-b border-slate-100 px-6 py-4"><h3 className="text-base font-bold text-slate-900">Stock transaction history</h3><p className="mt-1 text-xs text-slate-500">{historyLoading ? "Loading..." : historyPagination.total + " movements"}</p></div>
          {historyLoading ? <LoadingState label="Loading stock history..." /> : transactions.length === 0 ? <EmptyState icon="clock" title="No stock movements yet" description="Manual stock entries will appear here." /> : <TransactionTable transactions={transactions} />}
          {!historyLoading && historyPagination.total_pages > 1 && <Pagination pagination={historyPagination} onChange={changeHistoryPage} />}
        </section>
      )}

      <Modal isOpen={stockProduct !== null} title="Record stock movement" description="The system will calculate and save previous and new stock automatically." onClose={closeStockAction}>
        {stockProduct && <StockActionForm product={stockProduct} action={stockAction} values={stockValues} errors={stockErrors} isSubmitting={isSubmitting} onActionChange={(event) => { setStockAction(event.target.value); setStockErrors({}); }} onChange={(event) => { const { name, value } = event.target; setStockValues((current) => ({ ...current, [name]: value })); setStockErrors((current) => ({ ...current, [name]: "" })); }} onSubmit={submitStockAction} onCancel={closeStockAction} />}
      </Modal>

      <Modal isOpen={productHistory !== null} title={productHistory ? productHistory.product.name + " stock history" : "Stock history"} description="All recorded stock movements for this product." onClose={() => setProductHistory(null)} size="lg">
        {productHistoryLoading ? <LoadingState label="Loading product history..." /> : productHistory && (productHistory.transactions.length > 0 ? <TransactionTable transactions={productHistory.transactions} /> : <EmptyState icon="clock" title="No stock history" description="This product has no recorded stock movements." />)}
      </Modal>
    </div>
  );
}

function Pagination({ pagination, onChange }) {
  return <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4"><p className="text-xs text-slate-500">Page {pagination.page} of {pagination.total_pages}</p><div className="flex gap-2"><button className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 disabled:opacity-40" type="button" disabled={pagination.page <= 1} onClick={() => onChange(pagination.page - 1)}>Previous</button><button className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 disabled:opacity-40" type="button" disabled={pagination.page >= pagination.total_pages} onClick={() => onChange(pagination.page + 1)}>Next</button></div></div>;
}

export default InventoryPage;


