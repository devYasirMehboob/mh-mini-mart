import { useCallback, useEffect, useState } from "react";
import { getCategories } from "../api/categoriesApi";
import {
  createProduct,
  deleteProduct,
  getProduct,
  getProducts,
  productImageUrl,
  updateProduct,
  updateProductStatus,
} from "../api/productsApi";
import AlertMessage from "../components/AlertMessage";
import ConfirmDialog from "../components/ConfirmDialog";
import EmptyState from "../components/EmptyState";
import Icon from "../components/Icon";
import LoadingState from "../components/LoadingState";
import Modal from "../components/Modal";
import ProductDetails from "../components/products/ProductDetails";
import ProductForm from "../components/products/ProductForm";
import ProductTable from "../components/products/ProductTable";

const emptyForm = {
  category_id: "",
  name: "",
  product_code: "",
  barcode: "",
  purchase_cost: "0.00",
  selling_price: "",
  quantity: "0",
  minimum_stock: "0",
  unit_type: "piece",
  track_stock: true,
  status: "active",
  image_data: null,
  remove_image: false,
};

const defaultFilters = {
  search: "",
  category_id: "",
  status: "",
  page: 1,
  limit: 10,
};

function apiErrorMessage(error, fallback) {
  if (!error.response) {
    return "The local API could not be reached. Check that Apache and MySQL are running.";
  }

  return error.response.data?.message || fallback;
}

function validationErrors(error) {
  const errors = error.response?.data?.errors || {};
  return Object.fromEntries(Object.entries(errors).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
}

function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, total_pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [formMode, setFormMode] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [detailsProduct, setDetailsProduct] = useState(null);
  const [formValues, setFormValues] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadProducts = useCallback(async (nextFilters) => {
    setIsLoading(true);
    setAlert(null);

    try {
      const data = await getProducts(nextFilters);
      setProducts(data.products);
      setPagination(data.pagination);
      setAppliedFilters(nextFilters);
    } catch (error) {
      setAlert({ type: "error", message: apiErrorMessage(error, "Unable to load products.") });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Products | MH Mini Mart";

    async function initialize() {
      try {
        const categoryData = await getCategories();
        setCategories(categoryData.filter((category) => category.status === "active"));
      } catch (error) {
        setAlert({ type: "error", message: apiErrorMessage(error, "Unable to load categories.") });
      }

      await loadProducts(defaultFilters);
    }

    initialize();
  }, [loadProducts]);

  function openCreateForm() {
    setEditingProduct(null);
    setFormValues(emptyForm);
    setFormErrors({});
    setImagePreview(null);
    setFormMode("create");
  }

  async function openEditForm(product) {
    setActionId(product.id);

    try {
      const latest = await getProduct(product.id);
      setEditingProduct(latest);
      setFormValues({
        category_id: String(latest.category_id),
        name: latest.name,
        product_code: latest.product_code,
        barcode: latest.barcode || "",
        purchase_cost: latest.purchase_cost,
        selling_price: latest.selling_price,
        quantity: latest.quantity,
        minimum_stock: latest.minimum_stock,
        unit_type: latest.unit_type,
        track_stock: Boolean(Number(latest.track_stock)),
        status: latest.status,
        image_data: null,
        remove_image: false,
      });
      setImagePreview(productImageUrl(latest.image));
      setFormErrors({});
      setFormMode("edit");
    } catch (error) {
      setAlert({ type: "error", message: apiErrorMessage(error, "Unable to load this product.") });
    } finally {
      setActionId(null);
    }
  }

  async function openDetails(product) {
    setActionId(product.id);

    try {
      setDetailsProduct(await getProduct(product.id));
    } catch (error) {
      setAlert({ type: "error", message: apiErrorMessage(error, "Unable to load product details.") });
    } finally {
      setActionId(null);
    }
  }

  function closeForm() {
    if (isSubmitting) return;
    setFormMode(null);
    setEditingProduct(null);
    setFormErrors({});
    setImagePreview(null);
  }

  function handleFormChange(event) {
    const { name, value, type, checked } = event.target;
    setFormValues((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
    setFormErrors((current) => ({ ...current, [name]: "" }));
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFormErrors((current) => ({ ...current, image: "Only JPG, PNG, and WebP images are allowed." }));
      return;
    }

    if (file.size > 2097152) {
      setFormErrors((current) => ({ ...current, image: "The image must not exceed 2 MB." }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormValues((current) => ({ ...current, image_data: reader.result, remove_image: false }));
      setImagePreview(reader.result);
      setFormErrors((current) => ({ ...current, image: "" }));
    };
    reader.onerror = () => setFormErrors((current) => ({ ...current, image: "The selected image could not be read." }));
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setFormValues((current) => ({ ...current, image_data: null, remove_image: true }));
    setImagePreview(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormErrors({});

    const requiredErrors = {};
    if (!formValues.name.trim()) requiredErrors.name = "Product name is required.";
    if (!formValues.product_code.trim()) requiredErrors.product_code = "Product code is required.";
    if (!formValues.category_id) requiredErrors.category_id = "Select a category.";
    if (!formValues.selling_price || Number(formValues.selling_price) <= 0) requiredErrors.selling_price = "Selling price must be greater than zero.";

    if (Object.keys(requiredErrors).length > 0) {
      setFormErrors(requiredErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = formMode === "edit"
        ? await updateProduct(editingProduct.id, formValues)
        : await createProduct(formValues);

      setFormMode(null);
      setEditingProduct(null);
      setImagePreview(null);
      setAlert({ type: "success", message: response.message });
      await loadProducts(appliedFilters);
    } catch (error) {
      setFormErrors(validationErrors(error));
      setAlert({ type: "error", message: apiErrorMessage(error, "Unable to save the product.") });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatus(product) {
    setActionId(product.id);

    try {
      const response = await updateProductStatus(product.id, product.status === "active" ? "inactive" : "active");
      setProducts((current) => current.map((item) => item.id === product.id ? response.data.product : item));
      setAlert({ type: "success", message: response.message });
    } catch (error) {
      setAlert({ type: "error", message: apiErrorMessage(error, "Unable to change product status.") });
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setIsSubmitting(true);

    try {
      const response = await deleteProduct(deleteTarget.id);
      setDeleteTarget(null);
      setAlert({ type: "success", message: response.message });
      await loadProducts(appliedFilters);
    } catch (error) {
      setDeleteTarget(null);
      setAlert({ type: "error", message: apiErrorMessage(error, "Unable to delete the product.") });
    } finally {
      setIsSubmitting(false);
    }
  }

  function applyFilters(event) {
    event.preventDefault();
    const nextFilters = { ...filters, page: 1 };
    setFilters(nextFilters);
    loadProducts(nextFilters);
  }

  function clearFilters() {
    setFilters(defaultFilters);
    loadProducts(defaultFilters);
  }

  function changePage(page) {
    const nextFilters = { ...appliedFilters, page };
    setFilters((current) => ({ ...current, page }));
    loadProducts(nextFilters);
  }

  const hasFilters = appliedFilters.search || appliedFilters.category_id || appliedFilters.status;

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-blue-600">Catalogue management</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">Products</h2>
          <p className="mt-2 text-sm text-slate-500">Manage product details, pricing, stock, and availability.</p>
        </div>
        <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700" type="button" onClick={openCreateForm}>
          <Icon name="plus" className="size-[18px]" /> Add product
        </button>
      </section>

      <AlertMessage type={alert?.type} message={alert?.message} onDismiss={() => setAlert(null)} />

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <form className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-[minmax(220px,1fr)_220px_180px_auto] md:items-end md:px-6" onSubmit={applyFilters}>
          <label>
            <span className="mb-2 block text-xs font-semibold text-slate-500">Search</span>
            <span className="relative block"><Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100" placeholder="Name, code, or barcode" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} /></span>
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold text-slate-500">Category</span>
            <select className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100" value={filters.category_id} onChange={(event) => setFilters((current) => ({ ...current, category_id: event.target.value }))}><option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold text-slate-500">Status</span>
            <select className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
          </label>
          <div className="flex gap-2"><button className="min-h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700" type="submit">Apply</button>{hasFilters && <button className="min-h-10 rounded-xl px-3 text-sm font-semibold text-slate-500 hover:bg-slate-100" type="button" onClick={clearFilters}>Clear</button>}</div>
        </form>

        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div><h3 className="text-base font-bold text-slate-900">Product list</h3><p className="mt-1 text-xs text-slate-500">{isLoading ? "Loading products..." : pagination.total + " product" + (pagination.total === 1 ? "" : "s")}</p></div>
        </div>

        {isLoading ? <LoadingState label="Loading products..." /> : products.length === 0 ? <EmptyState icon={hasFilters ? "search" : "products"} title={hasFilters ? "No matching products" : "No products yet"} description={hasFilters ? "Try adjusting the filters." : "Add your first product to begin building the catalogue."} actionLabel={hasFilters ? null : "Add first product"} onAction={openCreateForm} /> : <ProductTable products={products} actionId={actionId} onView={openDetails} onEdit={openEditForm} onStatus={handleStatus} onDelete={setDeleteTarget} />}

        {!isLoading && pagination.total_pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
            <p className="text-xs text-slate-500">Page {pagination.page} of {pagination.total_pages}</p>
            <div className="flex gap-2"><button className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 disabled:opacity-40" type="button" disabled={pagination.page <= 1} onClick={() => changePage(pagination.page - 1)}>Previous</button><button className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 disabled:opacity-40" type="button" disabled={pagination.page >= pagination.total_pages} onClick={() => changePage(pagination.page + 1)}>Next</button></div>
          </div>
        )}
      </section>

      <Modal isOpen={formMode !== null} title={formMode === "edit" ? "Edit product" : "Add product"} description={formMode === "edit" ? "Update product details, pricing, and stock." : "Add a new product to the shop catalogue."} onClose={closeForm} size="lg">
        <ProductForm values={formValues} errors={formErrors} categories={categories} imagePreview={imagePreview} isSubmitting={isSubmitting} submitLabel={formMode === "edit" ? "Save changes" : "Add product"} onChange={handleFormChange} onImageChange={handleImageChange} onRemoveImage={removeImage} onSubmit={handleSubmit} onCancel={closeForm} />
      </Modal>

      <Modal isOpen={detailsProduct !== null} title="Product details" description="Complete product information." onClose={() => setDetailsProduct(null)} size="lg">
        {detailsProduct && <ProductDetails product={detailsProduct} onClose={() => setDetailsProduct(null)} />}
      </Modal>

      <ConfirmDialog isOpen={deleteTarget !== null} title="Delete product?" message={deleteTarget ? 'Delete "' + deleteTarget.name + '"? Products with sale history cannot be deleted.' : ""} isConfirming={isSubmitting} onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete} />
    </div>
  );
}

export default ProductsPage;


