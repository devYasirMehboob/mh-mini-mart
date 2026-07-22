import { useCallback, useEffect, useState } from "react";
import {
  createUnit,
  deleteUnit,
  getUnits,
  updateUnit,
} from "../api/unitsApi";
import Icon from "../components/Icon";
import Modal from "../components/Modal";
import useAlert from "../hooks/useAlert";
import useConfirmation from "../hooks/useConfirmation";
import normalizeApiError from "../utils/normalizeApiError";

const emptyForm = { name: "", symbol: "", unit_type: "count", precision: 0 };

function UnitsPage() {
  const [units, setUnits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const alert = useAlert();
  const confirmDialog = useConfirmation();
  const [formMode, setFormMode] = useState(null);
  const [editingUnit, setEditingUnit] = useState(null);
  const [formValues, setFormValues] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadUnits = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getUnits();
      // data might be { units: [...] } or just [...]
      setUnits(data.units || data || []);
    } catch (error) {
      alert.error(normalizeApiError(error).message);
    } finally {
      setIsLoading(false);
    }
  }, [alert]);

  useEffect(() => {
    document.title = "Units | MH Mini Mart";
    loadUnits();
  }, [loadUnits]);

  function openCreateForm() {
    setEditingUnit(null);
    setFormValues(emptyForm);
    setFormErrors({});
    setFormMode("create");
  }

  function openEditForm(unit) {
    setEditingUnit(unit);
    setFormValues({ name: unit.name, symbol: unit.symbol, unit_type: unit.unit_type || "count", precision: unit.precision || 0 });
    setFormErrors({});
    setFormMode("edit");
  }

  function closeForm() {
    setFormMode(null);
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setFormErrors({});
    try {
      if (formMode === "create") {
        await createUnit(formValues);
        alert.success("Unit created successfully.");
      } else if (formMode === "edit") {
        await updateUnit(editingUnit.id, formValues);
        alert.success("Unit updated successfully.");
      }
      closeForm();
      loadUnits();
    } catch (error) {
      const normalized = normalizeApiError(error);
      if (normalized.errors) {
        setFormErrors(normalized.errors);
      } else {
        alert.error(normalized.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmDelete(unit) {
    setDeleteTarget(unit);
    const confirmed = await confirmDialog({
      title: "Delete Unit",
      description: `Are you sure you want to delete ${unit.name}? This action cannot be undone.`,
      confirmText: "Delete",
      tone: "danger",
    });

    setDeleteTarget(null);

    if (confirmed) {
      setActionId(unit.id);
      try {
        await deleteUnit(unit.id);
        alert.success("Unit deleted successfully.");
        loadUnits();
      } catch (error) {
        alert.error(normalizeApiError(error).message);
      } finally {
        setActionId(null);
      }
    }
  }

  function renderTableRow(unit) {
    const isDeleting = actionId === unit.id;
    const isTarget = deleteTarget?.id === unit.id;

    return (
      <tr
        key={unit.id}
        className={`group border-b border-slate-100 transition-colors hover:bg-slate-50 ${isTarget ? "bg-red-50/50" : ""}`}
      >
        <td className="px-5 py-4">
          <span className="block font-bold text-slate-900">{unit.name}</span>
        </td>
        <td className="px-5 py-4">
          <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
            {unit.symbol}
          </span>
        </td>
        <td className="px-5 py-4">
          <span className="block text-sm text-slate-600 capitalize">{unit.unit_type}</span>
        </td>
        <td className="px-5 py-4">
          <span className="block text-sm text-slate-600">{unit.precision}</span>
        </td>
        <td className="px-5 py-4 text-right">
          <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => openEditForm(unit)}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-blue-600 disabled:opacity-50"
              title="Edit unit"
            >
              <Icon name="edit" className="size-4" />
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => confirmDelete(unit)}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              title="Delete unit"
            >
              <Icon name={isDeleting ? "loader" : "trash"} className={`size-4 ${isDeleting ? "animate-spin" : ""}`} />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Units</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage product units and conversion rates.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            <Icon name="plus" className="size-4" />
            Add Unit
          </button>
        </div>
      </div>

      <div className="premium-surface overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-4">Name</th>
                <th className="px-5 py-4">Symbol</th>
                <th className="px-5 py-4">Unit Type</th>
                <th className="px-5 py-4">Precision</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                    <Icon name="loader" className="mx-auto size-6 animate-spin" />
                    <p className="mt-2 font-medium">Loading units...</p>
                  </td>
                </tr>
              ) : units.length > 0 ? (
                units.map(renderTableRow)
              ) : (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <Icon name="ruler" className="mx-auto size-12 text-slate-300" />
                    <p className="mt-3 text-sm font-bold text-slate-900">No units found</p>
                    <p className="mt-1 text-sm text-slate-500">Get started by creating a new unit.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={!!formMode}
        onClose={closeForm}
        title={formMode === "create" ? "Add Unit" : "Edit Unit"}
      >
        <form onSubmit={handleFormSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-bold text-slate-700">Name</label>
              <input
                id="name"
                type="text"
                required
                disabled={isSubmitting}
                value={formValues.name}
                onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                className={`w-full rounded-xl border ${formErrors.name ? "border-red-300 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/10"} px-4 py-2.5 text-sm font-medium text-slate-900 transition`}
                placeholder="e.g. Kilogram"
              />
              {formErrors.name && (
                <p className="mt-1.5 text-xs font-semibold text-red-600">{formErrors.name.join(" ")}</p>
              )}
            </div>

            <div>
              <label htmlFor="symbol" className="mb-2 block text-sm font-bold text-slate-700">Symbol</label>
              <input
                id="symbol"
                type="text"
                required
                disabled={isSubmitting}
                value={formValues.symbol}
                onChange={(e) => setFormValues({ ...formValues, symbol: e.target.value })}
                className={`w-full rounded-xl border ${formErrors.symbol ? "border-red-300 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/10"} px-4 py-2.5 text-sm font-medium text-slate-900 transition`}
                placeholder="e.g. kg"
              />
              {formErrors.symbol && (
                <p className="mt-1.5 text-xs font-semibold text-red-600">{formErrors.symbol.join(" ")}</p>
              )}
            </div>

            <div>
              <label htmlFor="unit_type" className="mb-2 block text-sm font-bold text-slate-700">Unit Type</label>
              <select
                id="unit_type"
                required
                disabled={isSubmitting}
                value={formValues.unit_type}
                onChange={(e) => setFormValues({ ...formValues, unit_type: e.target.value })}
                className={`w-full rounded-xl border ${formErrors.unit_type ? "border-red-300 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/10"} px-4 py-2.5 text-sm font-medium text-slate-900 transition`}
              >
                <option value="weight">Weight</option>
                <option value="volume">Volume</option>
                <option value="count">Count (Pieces/Packs)</option>
                <option value="length">Length</option>
                <option value="custom">Custom</option>
              </select>
              {formErrors.unit_type && (
                <p className="mt-1.5 text-xs font-semibold text-red-600">{formErrors.unit_type.join(" ")}</p>
              )}
            </div>
            <div>
              <label htmlFor="precision" className="mb-2 block text-sm font-bold text-slate-700">Precision (Decimal Places)</label>
              <input
                id="precision"
                type="number"
                min="0"
                max="4"
                step="1"
                required
                disabled={isSubmitting}
                value={formValues.precision}
                onChange={(e) => setFormValues({ ...formValues, precision: Number(e.target.value) })}
                className={`w-full rounded-xl border ${formErrors.precision ? "border-red-300 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/10"} px-4 py-2.5 text-sm font-medium text-slate-900 transition`}
              />
              {formErrors.precision && (
                <p className="mt-1.5 text-xs font-semibold text-red-600">{formErrors.precision.join(" ")}</p>
              )}
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={closeForm}
              className="w-full rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting && <Icon name="loader" className="size-4 animate-spin" />}
              {formMode === "create" ? "Create Unit" : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default UnitsPage;
