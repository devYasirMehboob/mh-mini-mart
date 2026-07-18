import { useEffect, useState } from "react";
import Modal from "../Modal";
import StatusBadge from "../StatusBadge";
import {
  createExpenseCategory,
  deleteExpenseCategory,
  getExpenseCategories,
  updateExpenseCategory,
  updateExpenseCategoryStatus,
} from "../../api/expensesApi";
import useAlert from "../../hooks/useAlert";
import useConfirmation from "../../hooks/useConfirmation";
import normalizeApiError from "../../utils/normalizeApiError";
import InlineError from "../feedback/InlineError";

const blank = { name: "", description: "" };
const input =
  "min-h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-400";

function ExpenseCategoriesManager({ isOpen, onClose, onChanged }) {
  const alert = useAlert();
  const confirmDialog = useConfirmation();

  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      setCategories(await getExpenseCategories());
    } catch (e) {
      setError(normalizeApiError(e).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen]);

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setBusy(true);
    setError("");
    try {
      if (editing) await updateExpenseCategory(editing.id, form);
      else await createExpenseCategory(form);
      setForm(blank);
      setEditing(null);
      await load();
      onChanged();
      alert.success("Category saved.");
    } catch (e) {
      setError(normalizeApiError(e).message);
    } finally {
      setBusy(false);
    }
  }

  async function status(c) {
    setBusy(true);
    try {
      await updateExpenseCategoryStatus(
        c.id,
        c.status === "active" ? "inactive" : "active"
      );
      await load();
      onChanged();
      alert.success("Status updated.");
    } catch (e) {
      alert.error(normalizeApiError(e).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(c) {
    const confirmed = await confirmDialog({
      title: "Delete expense category?",
      description: "Only unused categories can be permanently deleted.",
      confirmText: "Delete category",
      tone: "danger",
      destructive: true,
      requiredText: c.name
    });

    if (!confirmed) return;

    setBusy(true);
    try {
      await deleteExpenseCategory(c.id);
      await load();
      onChanged();
      alert.success("Category deleted.");
    } catch (e) {
      alert.error(normalizeApiError(e).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      title="Expense categories"
      description="Keep expense entry options clear and consistent."
      onClose={onClose}
      size="lg"
    >
      <div className="grid gap-5 px-6 py-5 md:grid-cols-[0.8fr_1.2fr]">
        <form onSubmit={submit} className="space-y-3 rounded-xl bg-slate-50 p-4">
          <h3 className="text-sm font-extrabold text-slate-900">
            {editing ? "Edit category" : "New category"}
          </h3>
          {error && <InlineError error={error} />}
          <input
            className={`${input} w-full`}
            value={form.name}
            onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
            maxLength={100}
            placeholder="Category name"
          />
          <textarea
            className={`${input} min-h-20 w-full py-2`}
            value={form.description}
            onChange={(e) =>
              setForm((v) => ({ ...v, description: e.target.value }))
            }
            maxLength={500}
            placeholder="Optional description"
          />
          <div className="flex gap-2">
            <button
              disabled={busy}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white"
            >
              {busy ? "Saving..." : editing ? "Update" : "Add category"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setForm(blank);
                  setError("");
                }}
                className="px-3 text-xs font-bold text-slate-500"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <p className="p-5 text-sm text-slate-400">Loading categories...</p>
          ) : (
            categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 border-b border-slate-100 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-800">
                    {c.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {c.expense_count} expense records
                  </p>
                </div>
                <StatusBadge status={c.status} />
                <button
                  type="button"
                  onClick={() => {
                    setEditing(c);
                    setForm({
                      name: c.name,
                      description: c.description || "",
                    });
                    setError("");
                  }}
                  className="text-xs font-bold text-blue-600"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => status(c)}
                  className="text-xs font-bold text-slate-500"
                >
                  {c.status === "active" ? "Disable" : "Enable"}
                </button>
                <button
                  type="button"
                  disabled={Number(c.expense_count) > 0 || busy}
                  onClick={() => remove(c)}
                  className="text-xs font-bold text-red-600 disabled:text-slate-300"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}

export default ExpenseCategoriesManager;
