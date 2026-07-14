import { useCallback, useEffect, useState } from "react";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategory,
  updateCategory,
  updateCategoryStatus,
} from "../api/categoriesApi";
import CategoryForm from "../components/categories/CategoryForm";
import ConfirmDialog from "../components/ConfirmDialog";
import Icon from "../components/Icon";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";

const emptyForm = { name: "", description: "" };

function apiErrorMessage(error, fallback) {
  if (!error.response) {
    return "The local API could not be reached. Check that Apache and MySQL are running.";
  }

  return error.response.data?.message || fallback;
}

function validationErrors(error) {
  const errors = error.response?.data?.errors || {};

  return Object.fromEntries(
    Object.entries(errors).map(([field, messages]) => [
      field,
      Array.isArray(messages) ? messages[0] : messages,
    ]),
  );
}

function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [formMode, setFormMode] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formValues, setFormValues] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadCategories = useCallback(async (search = "") => {
    setIsLoading(true);
    setPageError("");

    try {
      setCategories(await getCategories(search));
      setActiveSearch(search);
    } catch (error) {
      setPageError(apiErrorMessage(error, "Unable to load categories."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Categories | MH Mini Mart";
    loadCategories();
  }, [loadCategories]);

  function showSuccess(message) {
    setSuccessMessage(message);
    setPageError("");
  }

  function openCreateForm() {
    setEditingCategory(null);
    setFormValues(emptyForm);
    setFormErrors({});
    setFormMode("create");
  }

  async function openEditForm(category) {
    setActionId(category.id);
    setPageError("");

    try {
      const latestCategory = await getCategory(category.id);
      setEditingCategory(latestCategory);
      setFormValues({
        name: latestCategory.name,
        description: latestCategory.description || "",
      });
      setFormErrors({});
      setFormMode("edit");
    } catch (error) {
      setPageError(apiErrorMessage(error, "Unable to load this category."));
    } finally {
      setActionId(null);
    }
  }

  function closeForm() {
    if (isSubmitting) return;
    setFormMode(null);
    setEditingCategory(null);
    setFormErrors({});
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setFormValues((current) => ({ ...current, [name]: value }));
    setFormErrors((current) => ({ ...current, [name]: "" }));
  }

  async function handleFormSubmit(event) {
    event.preventDefault();
    setFormErrors({});

    if (!formValues.name.trim()) {
      setFormErrors({ name: "Category name is required." });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = formMode === "edit"
        ? await updateCategory(editingCategory.id, formValues)
        : await createCategory(formValues);

      setFormMode(null);
      setEditingCategory(null);
      showSuccess(response.message);
      await loadCategories(activeSearch);
    } catch (error) {
      setFormErrors(validationErrors(error));

      if (!error.response?.data?.errors) {
        setPageError(apiErrorMessage(error, "Unable to save the category."));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(category) {
    const nextStatus = category.status === "active" ? "inactive" : "active";
    setActionId(category.id);
    setPageError("");

    try {
      const response = await updateCategoryStatus(category.id, nextStatus);
      setCategories((current) =>
        current.map((item) =>
          item.id === category.id ? response.data.category : item
        ),
      );
      showSuccess(response.message);
    } catch (error) {
      setPageError(apiErrorMessage(error, "Unable to update category status."));
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setIsSubmitting(true);
    setPageError("");

    try {
      const response = await deleteCategory(deleteTarget.id);
      setDeleteTarget(null);
      showSuccess(response.message);
      await loadCategories(activeSearch);
    } catch (error) {
      setDeleteTarget(null);
      setPageError(apiErrorMessage(error, "Unable to delete the category."));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSearch(event) {
    event.preventDefault();
    loadCategories(searchInput.trim());
  }

  function clearSearch() {
    setSearchInput("");
    loadCategories("");
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-blue-600">Product organization</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
            Categories
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Create and manage the groups used to organize products.
          </p>
        </div>
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
          type="button"
          onClick={openCreateForm}
        >
          <Icon name="plus" className="size-[18px]" />
          Add category
        </button>
      </section>

      {successMessage && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
          <span>{successMessage}</span>
          <button type="button" className="font-bold text-emerald-700" onClick={() => setSuccessMessage("")}>×</button>
        </div>
      )}

      {pageError && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          <span>{pageError}</span>
          <button type="button" className="font-bold text-red-600" onClick={() => setPageError("")}>×</button>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Category list</h3>
            <p className="mt-1 text-xs text-slate-500">
              {isLoading ? "Loading categories..." : categories.length + " categor" + (categories.length === 1 ? "y" : "ies")}
            </p>
          </div>

          <form className="flex w-full gap-2 sm:max-w-md" onSubmit={handleSearch}>
            <label className="relative flex-1">
              <span className="sr-only">Search categories</span>
              <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                type="search"
                placeholder="Search categories..."
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </label>
            <button
              className="min-h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              type="submit"
              disabled={isLoading}
            >
              Search
            </button>
            {activeSearch && (
              <button
                className="min-h-10 rounded-xl px-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-100"
                type="button"
                onClick={clearSearch}
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-slate-500" role="status">
            <span className="size-5 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
            Loading categories...
          </div>
        ) : categories.length === 0 ? (
          <div className="grid min-h-64 place-items-center p-8 text-center">
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-xl bg-slate-100 text-slate-500">
                <Icon name={activeSearch ? "search" : "categories"} className="size-5" />
              </span>
              <h3 className="mt-4 text-sm font-bold text-slate-800">
                {activeSearch ? "No matching categories" : "No categories yet"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {activeSearch ? "Try another search term." : "Add your first category to organize products."}
              </p>
              {!activeSearch && (
                <button
                  className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700"
                  type="button"
                  onClick={openCreateForm}
                >
                  Add first category
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Description</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Created</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((category) => (
                  <tr key={category.id} className="transition hover:bg-slate-50/60">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                          <Icon name="categories" className="size-4" />
                        </span>
                        <strong className="text-sm font-semibold text-slate-800">{category.name}</strong>
                      </div>
                    </td>
                    <td className="max-w-sm px-6 py-4 text-sm text-slate-500">
                      <span className="line-clamp-2">{category.description || "—"}</span>
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={category.status} /></td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short", year: "numeric" }).format(new Date(category.created_at.replace(" ", "T")))}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                          type="button"
                          disabled={actionId === category.id}
                          onClick={() => handleStatusChange(category)}
                        >
                          {category.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"
                          type="button"
                          aria-label={"Edit " + category.name}
                          disabled={actionId === category.id}
                          onClick={() => openEditForm(category)}
                        >
                          <Icon name="edit" className="size-4" />
                        </button>
                        <button
                          className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          type="button"
                          aria-label={"Delete " + category.name}
                          disabled={actionId === category.id}
                          onClick={() => setDeleteTarget(category)}
                        >
                          <Icon name="trash" className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        isOpen={formMode !== null}
        title={formMode === "edit" ? "Edit category" : "Add category"}
        description={formMode === "edit" ? "Update the category details." : "Create a new product category."}
        onClose={closeForm}
      >
        <CategoryForm
          values={formValues}
          errors={formErrors}
          isSubmitting={isSubmitting}
          submitLabel={formMode === "edit" ? "Save changes" : "Add category"}
          onChange={handleFormChange}
          onSubmit={handleFormSubmit}
          onCancel={closeForm}
        />
      </Modal>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete category?"
        message={deleteTarget ? 'Delete "' + deleteTarget.name + '"? This action cannot be undone.' : ""}
        isConfirming={isSubmitting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default CategoriesPage;


