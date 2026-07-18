import { useEffect, useState } from "react";
import {
  createExpense,
  exportExpenses,
  getExpense,
  getExpenses,
  getExpenseSummary,
  updateExpense,
  voidExpense,
} from "../api/expensesApi";
import EmptyState from "../components/feedback/EmptyState";
import Icon from "../components/Icon";
import LoadingState from "../components/feedback/LoadingState";
import PageErrorState from "../components/feedback/PageErrorState";
import ExpenseCategoriesManager from "../components/expenses/ExpenseCategoriesManager";
import ExpenseCategoryBreakdown from "../components/expenses/ExpenseCategoryBreakdown";
import ExpenseDetailsModal from "../components/expenses/ExpenseDetailsModal";
import ExpenseFilters from "../components/expenses/ExpenseFilters";
import ExpenseForm from "../components/expenses/ExpenseForm";
import ExpenseSummaryCards from "../components/expenses/ExpenseSummaryCards";
import ExpensesTable from "../components/expenses/ExpensesTable";
import SalesPagination from "../components/sales/SalesPagination";
import usePermissions from "../hooks/usePermissions";
import useAlert from "../hooks/useAlert";
import useConfirmation from "../hooks/useConfirmation";
import normalizeApiError from "../utils/normalizeApiError";

const defaults = {
  search: "",
  date_from: "",
  date_to: "",
  category_id: "",
  added_by: "",
  status: "active",
  payment_method: "",
  min_amount: "",
  max_amount: "",
  page: 1,
  limit: 20,
  sort_by: "expense_date",
  sort_direction: "desc",
};

const emptySummary = {
  total_amount: 0,
  expense_count: 0,
  today_amount: 0,
  week_amount: 0,
  month_amount: 0,
};

function query(filters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== "" && v !== null)
  );
}

function ExpensesPage() {
  const { can } = usePermissions();
  const canManage = can("expenses.manage");
  const alert = useAlert();
  const confirmDialog = useConfirmation();

  const [filters, setFilters] = useState(defaults);
  const [search, setSearch] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(emptySummary);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [reload, setReload] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [details, setDetails] = useState(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    document.title = "Expenses | MH Mini Mart";
  }, []);

  useEffect(() => {
    const t = setTimeout(
      () => setFilters((f) => (f.search === search ? f : { ...f, search, page: 1 })),
      350
    );
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let active = true;
    async function load() {
      setRefreshing(true);
      setPageError(null);
      try {
        const p = query(filters);
        const [list, total] = await Promise.all([
          getExpenses(p),
          getExpenseSummary(p),
        ]);
        if (!active) return;
        setExpenses(list.expenses);
        setPagination(list.pagination);
        setCategories(list.categories || []);
        setUsers(list.users || []);
        setSummary(total);
      } catch (e) {
        if (active) setPageError(normalizeApiError(e));
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [filters, reload]);

  function change(patch) {
    setFilters((f) => ({ ...f, ...patch }));
  }

  function clear() {
    setSearch("");
    setFilters(defaults);
  }

  async function edit(row) {
    setBusy(true);
    try {
      setEditing(await getExpense(row.id));
      setFormOpen(true);
    } catch (e) {
      alert.error(normalizeApiError(e).message);
    } finally {
      setBusy(false);
    }
  }

  async function view(row) {
    try {
      setDetails(await getExpense(row.id));
    } catch (e) {
      alert.error(normalizeApiError(e).message);
    }
  }

  async function save(values) {
    setBusy(true);
    setErrors({});
    try {
      const result = editing
        ? await updateExpense(editing.id, values)
        : await createExpense(values);
      alert.success(result.message || "Expense saved successfully.");
      setFormOpen(false);
      setEditing(null);
      setReload((v) => v + 1);
    } catch (e) {
      const normalized = normalizeApiError(e);
      setErrors(normalized.fieldErrors);
      alert.error(normalized.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmVoid(row) {
    const confirmed = await confirmDialog({
      title: "Void this expense?",
      description: "The record will remain in history and will be excluded from active expense totals.",
      confirmText: "Void expense",
      tone: "danger",
      destructive: true,
      requiredText: row.expense_number
    });

    if (!confirmed) return;

    setBusy(true);
    try {
      const result = await voidExpense(row.id);
      alert.success(result.message || "Expense voided.");
      setDetails(null);
      setReload((v) => v + 1);
    } catch (e) {
      alert.error(normalizeApiError(e).message);
    } finally {
      setBusy(false);
    }
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const response = await exportExpenses(query(filters));
      const url = URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mh-mini-mart-expenses-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      alert.success("Filtered expenses exported successfully.");
    } catch (e) {
      alert.error(normalizeApiError(e).message);
    } finally {
      setExporting(false);
    }
  }

  if (pageError) return <PageErrorState error={pageError} onRetry={() => setReload(v=>v+1)} />;

  return (
    <div className="space-y-5">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-[28px] font-extrabold tracking-[-0.035em] text-slate-950">
            Expenses
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Record shop spending, keep receipts and review cash outflow.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={refreshing}
            onClick={() => setReload((v) => v + 1)}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 disabled:opacity-50"
          >
            <Icon
              name="refresh"
              className={`size-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          {canManage && (
            <button
              type="button"
              onClick={() => setCategoriesOpen(true)}
              className="min-h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600"
            >
              Categories
            </button>
          )}
          <button
            type="button"
            disabled={exporting}
            onClick={exportCsv}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600"
          >
            <Icon name="export" className="size-4" />
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
          {canManage && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setErrors({});
                setFormOpen(true);
              }}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white"
            >
              <Icon name="plus" className="size-4" />
              Add expense
            </button>
          )}
        </div>
      </header>

      {!loading && <ExpenseSummaryCards summary={summary} />}
      <ExpenseCategoryBreakdown items={summary.category_totals} />
      <ExpenseFilters
        filters={filters}
        search={search}
        categories={categories}
        users={users}
        onSearch={setSearch}
        onChange={change}
        onClear={clear}
      />
      <section className="premium-surface overflow-hidden rounded-xl">
        {loading ? (
          <LoadingState message="Loading expenses..." />
        ) : expenses.length === 0 ? (
          <EmptyState
            title="No expenses match these filters"
            message="Add an expense or adjust the selected filters."
          />
        ) : (
          <>
            <ExpensesTable
              expenses={expenses}
              canManage={canManage}
              onView={view}
              onEdit={edit}
              onVoid={confirmVoid}
            />
            <SalesPagination
              pagination={pagination}
              onPage={(page) => change({ page })}
            />
          </>
        )}
      </section>
      <ExpenseForm
        isOpen={formOpen}
        expense={editing}
        categories={categories}
        isSubmitting={busy}
        serverErrors={errors}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={save}
      />
      <ExpenseDetailsModal
        expense={details}
        canManage={canManage}
        onClose={() => setDetails(null)}
        onEdit={(e) => {
          setDetails(null);
          edit(e);
        }}
      />
      <ExpenseCategoriesManager
        isOpen={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
        onChanged={() => setReload((v) => v + 1)}
      />
    </div>
  );
}
export default ExpensesPage;
