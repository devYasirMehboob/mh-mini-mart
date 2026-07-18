import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getProducts } from "../api/productsApi";
import {
  completeDraftPurchase,
  createPurchase,
  getPurchase,
  updateDraftPurchase,
} from "../api/purchasesApi";
import { getSupplierOptions } from "../api/suppliersApi";
import Icon from "../components/Icon";
import LoadingState from "../components/feedback/LoadingState";
import PurchaseItemsEditor from "../components/purchases/PurchaseItemsEditor";
import PurchaseTotalsPanel from "../components/purchases/PurchaseTotalsPanel";
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
  const [productSearch, setProductSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    document.title = `${id ? "Edit" : "New"} Purchase | MH Mini Mart`;
    Promise.all([
      getSupplierOptions(),
      getProducts({ status: "active", limit: 100 }),
      id ? getPurchase(id) : null,
    ])
      .then(([s, p, purchase]) => {
        setSuppliers(s);
        setProducts(p.products);
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
              unit_type: i.unit_type,
              quantity: String(Number(i.quantity)),
              unit_cost: i.unit_cost,
              line_discount: i.line_discount,
            }))
          );
        }
      })
      .catch((e) => {
        alert.error(normalizeApiError(e).message);
      })
      .finally(() => setLoading(false));
  }, [id, alert]); // `alert` won't change but React exhaustive-deps likes it

  useEffect(() => {
    const timer = setTimeout(() => {
      getProducts({ status: "active", search: productSearch, limit: 100 })
        .then((result) => setProducts(result.products))
        .catch((e) => {
           alert.error(normalizeApiError(e).message);
        });
    }, productSearch ? 300 : 0);
    return () => clearTimeout(timer);
  }, [productSearch, alert]);

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

  function add(pid) {
    const p = products.find((x) => Number(x.id) === pid);
    if (p)
      setItems((list) => [
        ...list,
        {
          product_id: pid,
          name: p.name,
          product_code: p.product_code,
          unit_type: p.unit_type,
          quantity: "1",
          unit_cost: p.purchase_cost || "0",
          line_discount: "0",
        },
      ]);
  }

  function line(id, key, value) {
    setItems((list) =>
      list.map((i) => (i.product_id === id ? { ...i, [key]: value } : i))
    );
  }

  function payload() {
    return {
      ...form,
      supplier_id: Number(form.supplier_id),
      items: items.map(({ product_id, quantity, unit_cost, line_discount }) => ({
        product_id,
        quantity,
        unit_cost,
        line_discount,
      })),
    };
  }

  async function save(draft) {
    if (!form.supplier_id || !items.length) {
      alert.error("Select a supplier and add at least one product.");
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
      setErrors(normalized.fieldErrors);
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
            className="mb-3 text-xs font-bold text-blue-600"
          >
            ← Purchases
          </button>
          <h2 className="text-[28px] font-extrabold">
            {id ? "Edit draft purchase" : "New purchase"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Supplier bill, trusted costs, payment and stock receipt.
          </p>
        </div>
      </header>

      {Object.keys(errors).length > 0 && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          Review the highlighted purchase values and try again.
        </p>
      )}

      <section className="premium-surface grid gap-4 rounded-xl p-5 sm:grid-cols-3">
        <label className="text-xs font-bold">
          Supplier
          <select
            value={form.supplier_id}
            onChange={(e) => change("supplier_id", e.target.value)}
            className="mt-1.5 min-h-11 w-full rounded-xl border px-3"
          >
            <option value="">Select supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {errors.supplier_id?.[0] && (
            <span className="text-red-600">{errors.supplier_id[0]}</span>
          )}
        </label>
        <label className="text-xs font-bold">
          Supplier invoice
          <input
            value={form.supplier_invoice_number}
            onChange={(e) => change("supplier_invoice_number", e.target.value)}
            className="mt-1.5 min-h-11 w-full rounded-xl border px-3"
          />
          {errors.supplier_invoice_number?.[0] && (
            <span className="text-red-600">
              {errors.supplier_invoice_number[0]}
            </span>
          )}
        </label>
        <label className="text-xs font-bold">
          Purchase date
          <input
            type="date"
            max={today()}
            value={form.purchase_date}
            onChange={(e) => change("purchase_date", e.target.value)}
            className="mt-1.5 min-h-11 w-full rounded-xl border px-3"
          />
        </label>
      </section>

      <PurchaseItemsEditor
        products={products}
        items={items}
        onSearch={setProductSearch}
        onAdd={add}
        onChange={line}
        onRemove={(pid) =>
          setItems((list) => list.filter((i) => i.product_id !== pid))
        }
      />

      <PurchaseTotalsPanel values={form} totals={totals} onChange={change} />

      <footer className="sticky bottom-4 flex justify-end gap-2 rounded-xl border bg-white/95 p-4 shadow-lg">
        <button
          type="button"
          disabled={busy}
          onClick={() => save(true)}
          className="rounded-xl border px-4 py-3 text-xs font-bold"
        >
          {busy ? "Saving..." : "Save draft"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => save(false)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs font-bold text-white"
        >
          <Icon name="check" className="size-4" />
          {busy ? "Posting..." : "Complete purchase"}
        </button>
      </footer>
    </div>
  );
}

export default PurchaseFormPage;
