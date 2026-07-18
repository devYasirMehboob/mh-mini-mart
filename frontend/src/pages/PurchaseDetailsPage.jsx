import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  addPurchasePayment,
  cancelPurchase,
  createPurchaseReturn,
  getPurchase,
  getReturnableItems,
} from "../api/purchasesApi";
import Icon from "../components/Icon";
import LoadingState from "../components/feedback/LoadingState";
import PageErrorState from "../components/feedback/PageErrorState";
import PurchasePaymentDialog from "../components/purchases/PurchasePaymentDialog";
import PurchaseReturnDialog from "../components/purchases/PurchaseReturnDialog";
import PurchaseStatusBadge from "../components/purchases/PurchaseStatusBadge";
import { formatCurrency, formatDate } from "../utils/calculateSaleTotals";
import usePermissions from "../hooks/usePermissions";
import useAlert from "../hooks/useAlert";
import useConfirmation from "../hooks/useConfirmation";
import normalizeApiError from "../utils/normalizeApiError";

function PurchaseDetailsPage() {
  const { id } = useParams();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const alert = useAlert();
  const confirmDialog = useConfirmation();

  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState(null);
  const [payment, setPayment] = useState(false);
  const [returnData, setReturnData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      setPurchase(await getPurchase(id));
    } catch (e) {
      setPageError(normalizeApiError(e));
    } finally {
      setLoading(false);
    }
  }, [id, reload]);

  useEffect(() => {
    document.title = "Purchase Details | MH Mini Mart";
    load();
  }, [load]);

  async function pay(values) {
    setBusy(true);
    try {
      const r = await addPurchasePayment(id, values);
      alert.success(r.message || "Payment recorded.");
      setPayment(false);
      setPurchase(r.data.purchase);
    } catch (e) {
      alert.error(normalizeApiError(e).message);
    } finally {
      setBusy(false);
    }
  }

  async function prepareReturn() {
    try {
      setReturnData(await getReturnableItems(id));
    } catch (e) {
      alert.error(normalizeApiError(e).message);
    }
  }

  async function submitReturn(values) {
    setBusy(true);
    try {
      const r = await createPurchaseReturn(values);
      alert.success(r.message || "Purchase return recorded.");
      setReturnData(null);
      await load();
    } catch (e) {
      alert.error(normalizeApiError(e).message);
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    const confirmed = await confirmDialog({
      title: "Cancel this purchase?",
      description: "Posted stock will be reversed. Payment history remains in the audit trail.",
      confirmText: "Cancel purchase",
      tone: "danger",
      destructive: true,
      requiredText: purchase?.purchase_number
    });

    if (!confirmed) return;

    // We can use native prompt for simple inputs, or build a complex dialog
    const reason = window.prompt("Enter the cancellation reason:");
    if (!reason) return;

    setBusy(true);
    try {
      const r = await cancelPurchase(id, reason);
      alert.success(r.message || "Purchase cancelled.");
      setPurchase(r.data.purchase);
    } catch (e) {
      alert.error(normalizeApiError(e).message);
    } finally {
      setBusy(false);
    }
  }

  if (pageError) return <PageErrorState error={pageError} onRetry={() => setReload(v=>v+1)} />;
  if (loading) return <LoadingState message="Loading purchase details..." />;
  if (!purchase) return <PageErrorState error={{ message: "Purchase not found" }} />;

  return (
    <div className="space-y-5">
      <header className="no-print flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <button
            type="button"
            onClick={() => navigate("/purchases")}
            className="mb-3 text-xs font-bold text-blue-600"
          >
            ← Purchases
          </button>
          <h2 className="text-[28px] font-extrabold">
            {purchase.purchase_number}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {purchase.supplier_name} · {formatDate(purchase.purchase_date)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {purchase.purchase_status === "draft" && can("purchases.update") && (
            <button
              type="button"
              onClick={() => navigate(`/purchases/${id}/edit`)}
              className="rounded-xl border bg-white px-4 py-2.5 text-xs font-bold"
            >
              Edit draft
            </button>
          )}
          {Number(purchase.balance_due) > 0 &&
            !["draft", "cancelled"].includes(purchase.purchase_status) &&
            can("purchases.pay") && (
              <button
                type="button"
                onClick={() => setPayment(true)}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white"
              >
                Add payment
              </button>
            )}
          {["completed", "partially_returned"].includes(
            purchase.purchase_status
          ) &&
            can("purchases.return") && (
              <button
                type="button"
                onClick={prepareReturn}
                className="rounded-xl border bg-white px-4 py-2.5 text-xs font-bold"
              >
                Return items
              </button>
            )}
          {purchase.purchase_status === "completed" &&
            can("purchases.cancel") && (
              <button
                type="button"
                onClick={cancel}
                className="rounded-xl border border-red-200 px-4 py-2.5 text-xs font-bold text-red-600"
              >
                Cancel purchase
              </button>
            )}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white"
          >
            <Icon name="print" className="size-4" />
            Print
          </button>
        </div>
      </header>

      <section className="purchase-print-root premium-surface rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
          <div>
            <h3 className="text-lg font-extrabold">{purchase.supplier_name}</h3>
            <p className="mt-1 text-xs text-slate-500">
              Supplier invoice:{" "}
              {purchase.supplier_invoice_number || "Not provided"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Created by {purchase.created_by_name}
            </p>
          </div>
          <div className="flex gap-2">
            <PurchaseStatusBadge status={purchase.purchase_status} />
            <PurchaseStatusBadge status={purchase.payment_status} />
          </div>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-left">Product</th>
                <th className="p-3 text-right">Quantity</th>
                <th className="p-3 text-right">Unit cost</th>
                <th className="p-3 text-right">Discount</th>
                <th className="p-3 text-right">Returned</th>
                <th className="p-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {purchase.items.map((i) => (
                <tr key={i.id}>
                  <td className="p-3">
                    <strong>{i.product_name}</strong>
                    <small className="block text-slate-400">
                      {i.product_code}
                    </small>
                  </td>
                  <td className="p-3 text-right">{Number(i.quantity)}</td>
                  <td className="p-3 text-right">
                    {formatCurrency(i.unit_cost)}
                  </td>
                  <td className="p-3 text-right">
                    {formatCurrency(i.line_discount)}
                  </td>
                  <td className="p-3 text-right">
                    {Number(i.returned_quantity)}
                  </td>
                  <td className="p-3 text-right font-bold">
                    {formatCurrency(i.line_total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5 ml-auto max-w-sm">
          <dl className="space-y-2 text-xs">
            {[
              ["Subtotal", purchase.subtotal],
              ["Discount", purchase.discount_amount],
              ["Tax", purchase.tax_amount],
              ["Shipping", purchase.shipping_amount],
              ["Other charges", purchase.other_charges],
              ["Grand total", purchase.grand_total],
              ["Paid", purchase.amount_paid],
              ["Balance due", purchase.balance_due],
            ].map(([l, v]) => (
              <div
                key={l}
                className={`flex justify-between ${
                  l === "Grand total" ? "border-t pt-2 text-sm font-extrabold" : ""
                }`}
              >
                <dt>{l}</dt>
                <dd>{formatCurrency(v)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="premium-surface rounded-xl p-5">
          <h3 className="text-sm font-extrabold">Payments</h3>
          {purchase.payments.length ? (
            <div className="mt-3 space-y-2">
              {purchase.payments.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between rounded-xl bg-slate-50 p-3 text-xs"
                >
                  <span>
                    {formatDate(p.payment_date)} ·{" "}
                    {p.payment_method.replaceAll("_", " ")}
                  </span>
                  <strong>{formatCurrency(p.amount)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-400">No payment recorded.</p>
          )}
        </section>
        <section className="premium-surface rounded-xl p-5">
          <h3 className="text-sm font-extrabold">Returns</h3>
          {purchase.returns.length ? (
            <div className="mt-3 space-y-2">
              {purchase.returns.map((r) => (
                <div
                  key={r.id}
                  className="flex justify-between rounded-xl bg-slate-50 p-3 text-xs"
                >
                  <span>
                    {r.return_number} · {formatDate(r.return_date)}
                  </span>
                  <strong>{formatCurrency(r.subtotal)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-400">No purchase returns.</p>
          )}
        </section>
      </div>

      <PurchasePaymentDialog
        purchase={payment ? purchase : null}
        busy={busy}
        onClose={() => setPayment(false)}
        onSubmit={pay}
      />
      <PurchaseReturnDialog
        data={returnData}
        busy={busy}
        onClose={() => setReturnData(null)}
        onSubmit={submitReturn}
      />
    </div>
  );
}

export default PurchaseDetailsPage;
