import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import apiClient from "../api/apiClient";
import { getCategories } from "../api/categoriesApi";
import { getProducts } from "../api/productsApi";
import {
  completeDraftPurchase,
  createPurchase,
  getPurchase,
  updateDraftPurchase,
} from "../api/purchasesApi";
import { getSupplierOptions } from "../api/suppliersApi";
import { getUnits } from "../api/unitsApi";
import Icon from "../components/Icon";
import LoadingState from "../components/feedback/LoadingState";
import PurchaseItemsEditor from "../components/purchases/PurchaseItemsEditor";
import PurchaseTotalsPanel from "../components/purchases/PurchaseTotalsPanel";
import SupplierProductSuggestions from "../components/purchases/SupplierProductSuggestions";
import QuickAddProductDialog from "../components/purchases/QuickAddProductDialog";
import QuickAddPackagingUnitDialog from "../components/purchases/QuickAddPackagingUnitDialog";
import useAlert from "../hooks/useAlert";
import normalizeApiError from "../utils/normalizeApiError";

const today = () => new Date().toISOString().slice(0, 10);
const empty = () => ({
  supplier_id: "",
  supplier_invoice_number: "",
  purchase_date: today(),
  overall_discount: "0",
  tax: "0",
  shipping_amount: "0",
  other_charges: "0",
  amount_paid: "0",
  payment_method: "cash",
  payment_reference: "",
  notes: "",
  request_token: crypto.randomUUID(),
});

function PurchaseFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const alert = useAlert();

  const [form, setForm] = useState(empty);
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [units, setUnits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});

  // Dialog states
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddInitialName, setQuickAddInitialName] = useState("");
  const [configUnitOpen, setConfigUnitOpen] = useState(false);
  const [selectedProductForConfig, setSelectedProductForConfig] = useState(null);
  const [selectedItemForConfig, setSelectedItemForConfig] = useState(null);

  useEffect(() => {
    document.title = `${id ? "Edit" : "New"} Purchase | MH Mini Mart`;
    Promise.all([
      getSupplierOptions(),
      getProducts({ status: "active", limit: 300 }),
      getUnits(),
      getCategories(),
      id ? getPurchase(id) : null,
    ])
      .then(([s, p, u, c, purchase]) => {
        setSuppliers(s);
        setProducts(p.products || []);
        setUnits(u.units || u || []);
        setCategories(c.categories || c || []);

        if (purchase) {
          if (purchase.purchase_status !== "draft") {
            throw new Error("Only draft purchases can be edited.");
          }
          setForm({
            supplier_id: String(purchase.supplier_id),
            supplier_invoice_number: purchase.supplier_invoice_number || "",
            purchase_date: purchase.purchase_date,
            overall_discount: purchase.discount_amount,
            tax: purchase.tax_amount,
            shipping_amount: purchase.shipping_amount,
            other_charges: purchase.other_charges,
            amount_paid: "0",
            payment_method: "cash",
            payment_reference: "",
            notes: purchase.notes || "",
            request_token: purchase.request_token,
          });
          setItems(
            purchase.items.map((i) => ({
              product_id: Number(i.product_id),
              name: i.product_name,
              product_code: i.product_code,
              unit_id: i.unit_id || i.default_purchase_unit_id || "",
              quantity: String(Number(i.quantity_entered || i.quantity || 1)),
              unit_cost: i.unit_cost,
              line_discount: i.line_discount,
              last_purchase_cost: i.last_purchase_cost || null,
              purchase_units: i.purchase_units || [],
            }))
          );
        }
      })
      .catch((e) => {
        alert.error(normalizeApiError(e).message);
      })
      .finally(() => setLoading(false));
  }, [id, alert]);

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (s, i) =>
        s +
        Math.max(
          0,
          Number(i.quantity || 0) * Number(i.unit_cost || 0) -
            Number(i.line_discount || 0)
        ),
      0
    );
    const discount = Number(form.overall_discount || 0),
      tax = Number(form.tax || 0),
      charges =
        Number(form.shipping_amount || 0) + Number(form.other_charges || 0);
    return {
      subtotal,
      discount,
      tax,
      charges,
      grand: Math.max(0, subtotal - discount + tax + charges),
    };
  }, [items, form]);

  const change = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function addProductToItems(product) {
    const pid = Number(product.id);
    const existing = items.find((i) => Number(i.product_id) === pid);

    if (existing) {
      alert.info(`${product.name} is already in the purchase. Incremented pack quantity.`);
      setItems((list) =>
        list.map((i) =>
          Number(i.product_id) === pid
            ? { ...i, quantity: String(Number(i.quantity || 1) + 1) }
            : i
        )
      );
      return;
    }

    const defaultUnitId =
      product.default_purchase_unit_id ||
      product.purchase_units?.[0]?.unit_id ||
      product.base_unit_id ||
      "";

    const defaultCost =
      product.last_purchase_cost != null
        ? String(product.last_purchase_cost)
        : String(product.purchase_cost || "0");

    setItems((list) => [
      ...list,
      {
        product_id: pid,
        name: product.name,
        product_code: product.product_code,
        unit_id: defaultUnitId,
        quantity: "1",
        unit_cost: defaultCost,
        line_discount: "0",
        last_purchase_cost: product.last_purchase_cost || null,
        purchase_units: product.purchase_units || [],
        product,
      },
    ]);

    alert.success(`${product.name} added to purchase.`);
  }

  function handleLineChange(pid, key, value) {
    setItems((list) =>
      list.map((i) => (Number(i.product_id) === Number(pid) ? { ...i, [key]: value } : i))
    );
  }

  function handleOpenQuickAdd(query = "") {
    setQuickAddInitialName(query);
    setQuickAddOpen(true);
  }

  function handleQuickAddCreated(createdProduct) {
    setProducts((prev) => [createdProduct, ...prev]);
    addProductToItems(createdProduct);
  }

  function handleOpenConfigureUnit(product, item) {
    setSelectedProductForConfig(product);
    setSelectedItemForConfig(item || null);
    setConfigUnitOpen(true);
  }

  async function handleUnitConfigured(productId) {
    try {
      // Refresh product units for this specific product
      const [unitsRes, productsRes] = await Promise.all([
        apiClient.get(`/products/${productId}/units`),
        getProducts({ status: "active", limit: 300 }),
      ]);

      const freshUnits = unitsRes.data?.data || unitsRes.data || [];
      const freshProducts = productsRes.products || [];

      setProducts(freshProducts);

      // Update the cart item's purchase_units so the dropdown shows the new unit
      setItems((list) =>
        list.map((i) =>
          Number(i.product_id) === Number(productId)
            ? { ...i, purchase_units: freshUnits }
            : i
        )
      );

      alert.success("Packaging unit saved! Select it from the unit dropdown.");
    } catch {
      alert.error("Unit was saved but failed to refresh. Please reload.");
    }
  }

  function payload() {
    return {
      ...form,
      supplier_id: Number(form.supplier_id),
      items: items.map(
        ({
          product_id,
          unit_id,
          quantity,
          unit_cost,
          line_discount,
          batch_number,
          manufacturing_date,
          expiry_date,
        }) => ({
          product_id: Number(product_id),
          unit_id: unit_id ? Number(unit_id) : null,
          quantity: quantity,
          unit_cost: unit_cost,
          line_discount: line_discount,
          batch_number,
          manufacturing_date,
          expiry_date,
        })
      ),
    };
  }

  async function save(draft) {
    if (!form.supplier_id) {
      alert.error("Please select a supplier.");
      return;
    }
    if (!items.length) {
      alert.error("Add at least one product to the purchase.");
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      const r = id
        ? draft
          ? await updateDraftPurchase(id, payload())
          : await completeDraftPurchase(id, payload())
        : await createPurchase(payload(), draft);

      alert.success(r.message || "Purchase saved successfully.");
      navigate(draft ? "/purchases" : `/purchases/${r.data.purchase.id}`, {
        replace: true,
      });
    } catch (e) {
      const normalized = normalizeApiError(e);
      setErrors(normalized.fieldErrors || {});
      alert.error(normalized.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState message="Preparing purchase form..." />;

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate("/purchases")}
            className="mb-3 text-xs font-bold text-blue-600 hover:underline"
          >
            ← Purchases
          </button>
          <h2 className="text-[28px] font-extrabold text-slate-900">
            {id ? "Edit draft purchase" : "New Purchase Entry"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Fast, supplier-aware stock receipt with packaging units and barcode scanning.
          </p>
        </div>
      </header>

      {Object.keys(errors).length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
          Review the highlighted purchase values and try again.
        </div>
      )}

      <section className="premium-surface grid gap-4 rounded-xl p-5 sm:grid-cols-3">
        <label className="text-xs font-bold text-slate-700">
          Supplier *
          <select
            value={form.supplier_id}
            onChange={(e) => change("supplier_id", e.target.value)}
            className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-blue-500"
          >
            <option value="">Select supplier...</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {errors.supplier_id?.[0] && (
            <span className="text-red-600 text-[11px] font-medium">{errors.supplier_id[0]}</span>
          )}
        </label>

        <label className="text-xs font-bold text-slate-700">
          Supplier Invoice #
          <input
            value={form.supplier_invoice_number}
            onChange={(e) => change("supplier_invoice_number", e.target.value)}
            placeholder="e.g. INV-2026-99"
            className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
          />
          {errors.supplier_invoice_number?.[0] && (
            <span className="text-red-600 text-[11px] font-medium">
              {errors.supplier_invoice_number[0]}
            </span>
          )}
        </label>

        <label className="text-xs font-bold text-slate-700">
          Purchase Date
          <input
            type="date"
            max={today()}
            value={form.purchase_date}
            onChange={(e) => change("purchase_date", e.target.value)}
            className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
          />
        </label>
      </section>

      {form.supplier_id && (
        <SupplierProductSuggestions
          supplierId={Number(form.supplier_id)}
          onSelectProduct={addProductToItems}
        />
      )}

      <PurchaseItemsEditor
        products={products}
        units={units}
        items={items}
        supplierId={form.supplier_id}
        onAddProduct={addProductToItems}
        onChange={handleLineChange}
        onRemove={(pid) =>
          setItems((list) => list.filter((i) => Number(i.product_id) !== Number(pid)))
        }
        onQuickAdd={handleOpenQuickAdd}
        onConfigureUnit={handleOpenConfigureUnit}
      />

      <PurchaseTotalsPanel values={form} totals={totals} onChange={change} />

      <footer className="sticky bottom-4 z-40 flex items-center justify-between rounded-xl border bg-white/95 p-4 shadow-lg backdrop-blur-md">
        <div className="text-xs font-bold text-slate-500">
          Total Items: <span className="text-slate-900 font-extrabold">{items.length}</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => save(true)}
            className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            {busy ? "Saving..." : "Save Draft"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => save(false)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs font-bold text-white hover:bg-blue-700 shadow-md"
          >
            <Icon name="check" className="size-4" />
            {busy ? "Posting Purchase..." : "Complete Purchase"}
          </button>
        </div>
      </footer>

      {/* Quick Add Dialogs */}
      <QuickAddProductDialog
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onCreated={handleQuickAddCreated}
        supplierId={form.supplier_id}
        initialName={quickAddInitialName}
        categories={categories}
        units={units}
      />

      <QuickAddPackagingUnitDialog
        isOpen={configUnitOpen}
        onClose={() => setConfigUnitOpen(false)}
        product={selectedProductForConfig}
        currentItem={selectedItemForConfig}
        units={units}
        onConfigured={handleUnitConfigured}
      />
    </div>
  );
}

export default PurchaseFormPage;
