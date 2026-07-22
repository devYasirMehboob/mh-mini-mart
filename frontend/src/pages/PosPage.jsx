import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPosCategories, getPosProducts } from "../api/posApi";
import { completeSale, getSaleReceipt } from "../api/salesApi";

import Icon from "../components/Icon";
import CartItem from "../components/pos/CartItem";
import HeldSalesDialog from "../components/pos/HeldSalesDialog";
import PaymentPanel from "../components/pos/PaymentPanel";
import ProductCard from "../components/pos/ProductCard";
import SaleSuccessModal from "../components/pos/SaleSuccessModal";

import TotalsPanel from "../components/pos/TotalsPanel";
import ReceiptPreview from "../components/sales/ReceiptPreview";
import AmountWeightModal from "../components/pos/AmountWeightModal";
import useAlert from "../hooks/useAlert";
import useConfirmation from "../hooks/useConfirmation";
import normalizeApiError from "../utils/normalizeApiError";
import useCart from "../hooks/useCart";
import useGlobalBarcodeScanner from "../hooks/useGlobalBarcodeScanner";
import useHeldSales from "../hooks/useHeldSales";
import useScanQueue from "../hooks/useScanQueue";
import useSettings from "../hooks/useSettings";
import usePermissions from "../hooks/usePermissions";
import useOffline from "../hooks/useOffline";
import { getCachedProducts, deductCachedStock, saveOfflineSale, generateOfflineSaleId } from "../utils/idb";
import { calculateSaleTotals } from "../utils/calculateSaleTotals";

const DRAFT_KEY = "mh-mini-mart-pos-draft-v2";
const PAGE_SIZE = 60;
const blankPayment = () => ({ payment_method: "cash", payment_reference: "", amount_received: "", customer_name: "", customer_phone: "", note: "" });
const newToken = () => crypto.randomUUID();
// Global error normalization used instead
function readDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
    return {
      discountType: ["none", "fixed", "percentage"].includes(draft.discountType) ? draft.discountType : "none",
      discountValue: String(draft.discountValue ?? "0"),
      payment: { ...blankPayment(), ...(draft.payment || {}) },
      requestToken: typeof draft.requestToken === "string" ? draft.requestToken : newToken(),
      activeHeldSaleId: draft.activeHeldSaleId != null && Number.isInteger(Number(draft.activeHeldSaleId)) && Number(draft.activeHeldSaleId) > 0 ? Number(draft.activeHeldSaleId) : null,
      activeHeldReference: typeof draft.activeHeldReference === "string" ? draft.activeHeldReference : "",
    };
  } catch {
    return { discountType: "none", discountValue: "0", payment: blankPayment(), requestToken: newToken(), activeHeldSaleId: null, activeHeldReference: "" };
  }
}

function PosPage() {
  const navigate = useNavigate();
  const cart = useCart();
  const held = useHeldSales();
  const { settings } = useSettings();
  const taxSettings = settings?.tax || {};
  const discountSettings = settings?.discounts || {};
  const barcodeSettings = settings?.barcode || {};
  const receiptSettings = settings?.receipt || {};
  const initialDraft = useRef(readDraft()).current;
  const initialCartIds = useRef(cart.items.map((item) => item.id));
  const cartValidated = useRef(false);
  const barcodeRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [barcode, setBarcode] = useState("");
  const alert = useAlert();
  const confirmDialog = useConfirmation();
  const { can } = usePermissions();
  const { isOnline, isEmergencyMode, offlineUser, deviceConfig, refreshConfig, refreshProductCache } = useOffline();
  const notify = useCallback((message, type = "info") => alert[type === "error" ? "error" : "success"](message), [alert]);

  const onBarcodeNotFound = useCallback(async (scannedBarcode) => {
    if (!can("products.create")) {
      notify(`No product found for barcode "${scannedBarcode}".`, "error");
      return;
    }
    const confirmed = await confirmDialog({
      title: "Product not found",
      description: `Barcode "${scannedBarcode}" is not registered. Would you like to add it as a new product?`,
      confirmText: "Add product",
      tone: "info"
    });
    if (confirmed) {
      navigate("/products", { state: { newBarcode: scannedBarcode } });
    }
  }, [can, confirmDialog, navigate, notify]);

  const scanQueue = useScanQueue(cart, notify, onBarcodeNotFound);
  
  useGlobalBarcodeScanner((scannedBarcode) => {
    scanQueue.enqueue(scannedBarcode);
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [discountType, setDiscountType] = useState(initialDraft.discountType);
  const [discountValue, setDiscountValue] = useState(initialDraft.discountValue);
  const [payment, setPayment] = useState(initialDraft.payment);
  const [activeHeldSaleId, setActiveHeldSaleId] = useState(initialDraft.activeHeldSaleId);
  const [activeHeldReference, setActiveHeldReference] = useState(initialDraft.activeHeldReference);
  const [heldOpen, setHeldOpen] = useState(false);
  const [removeHeld, setRemoveHeld] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestToken, setRequestToken] = useState(initialDraft.requestToken);
  const [savedSale, setSavedSale] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [stockRefresh, setStockRefresh] = useState(0);
  const [amountWeightProduct, setAmountWeightProduct] = useState(null);
  const totals = useMemo(() => calculateSaleTotals(cart.items, discountType, discountValue, taxSettings.enabled ? taxSettings.percentage : 0, taxSettings.calculation_mode), [cart.items, discountType, discountValue, taxSettings.enabled, taxSettings.percentage, taxSettings.calculation_mode]);

  useEffect(() => {
    document.title = "POS | MH Mini Mart";
    if (isOnline) {
      getPosCategories().then(setCategories).catch((failure) => notify(normalizeApiError(failure).message, "error"));
      refreshProductCache().catch(() => undefined);
    }
  }, [notify, isOnline, refreshProductCache]);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ discountType, discountValue, payment, requestToken, activeHeldSaleId, activeHeldReference }));
  }, [discountType, discountValue, payment, requestToken, activeHeldSaleId, activeHeldReference]);

  useEffect(() => {
    const timer = window.setTimeout(() => { setQuery(search.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    if (!isOnline || isEmergencyMode) {
      getCachedProducts()
        .then((cachedList) => {
          let filtered = cachedList.filter(p => p.status === 'active' || !p.status);
          if (category) {
            filtered = filtered.filter(p =>
              (p.category_id && String(p.category_id) === String(category)) ||
              (p.category_name && p.category_name.toLowerCase() === String(category).toLowerCase())
            );
          }
          if (query) {
            const q = query.toLowerCase();
            filtered = filtered.filter(p =>
              p.name.toLowerCase().includes(q) ||
              (p.code && p.code.toLowerCase().includes(q)) ||
              (p.barcode && p.barcode.toLowerCase().includes(q))
            );
          }
          const total = filtered.length;
          const start = (page - 1) * PAGE_SIZE;
          setProducts(filtered.slice(start, start + PAGE_SIZE));
          setPagination({ page, total_pages: Math.ceil(total / PAGE_SIZE) || 1, total });
        })
        .catch(() => setError("Failed to load cached offline products."))
        .finally(() => setLoading(false));
      return () => controller.abort();
    }

    getPosProducts({ search: query, category_id: category, page, limit: PAGE_SIZE }, controller.signal)
      .then((data) => {
        setProducts(data.products);
        setPagination(data.pagination);
        if (Array.isArray(data.products) && data.products.length > 0) {
          cacheProducts(data.products, false).catch(() => undefined);
        }
      })
      .catch((failure) => {
        if (failure.code === "ERR_CANCELED") return;
        if (!failure.response) {
          // Automatic seamless fallback to IndexedDB cache on network error
          getCachedProducts().then((cachedList) => {
            let filtered = cachedList.filter(p => p.status === 'active' || !p.status);
            if (category) {
              filtered = filtered.filter(p =>
                (p.category_id && String(p.category_id) === String(category)) ||
                (p.category_name && p.category_name.toLowerCase() === String(category).toLowerCase())
              );
            }
            if (query) {
              const q = query.toLowerCase();
              filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(q) ||
                (p.code && p.code.toLowerCase().includes(q)) ||
                (p.barcode && p.barcode.toLowerCase().includes(q))
              );
            }
            const total = filtered.length;
            const start = (page - 1) * PAGE_SIZE;
            setProducts(filtered.slice(start, start + PAGE_SIZE));
            setPagination({ page, total_pages: Math.ceil(total / PAGE_SIZE) || 1, total });
          }).catch(() => {
            setError("Unable to connect to local server or load offline products.");
          });
        } else {
          setError(normalizeApiError(failure).message);
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, category, page, retryKey, stockRefresh, isOnline, isEmergencyMode]);

  useEffect(() => {
    if (cartValidated.current) return;
    cartValidated.current = true;
    if (initialCartIds.current.length === 0) return;
    if (!isOnline || isEmergencyMode) return;
    getPosProducts({ ids: initialCartIds.current.join(","), limit: 100 })
      .then((data) => { const warnings = cart.revalidate(data.products); if (warnings.length) notify(warnings.join(" "), "error"); })
      .catch((failure) => notify(normalizeApiError(failure).message, "error"));
  }, [cart, notify, isOnline, isEmergencyMode]);

  function add(product, byAmount = false) {
    if (byAmount) {
      setAmountWeightProduct(product);
      return;
    }
    const result = cart.addProduct(product);
    notify(result.message, result.ok ? "success" : "error");
  }

  function addWithQuantity(product, quantityToAdd) {
    const result = cart.addProduct(product, quantityToAdd);
    notify(result.message, result.ok ? "success" : "error");
  }

  function quantity(item, next) {
    const result = cart.changeQuantity(item, next);
    if (!result.ok) notify(result.message, "error");
  }

  function remove(item) {
    cart.removeProduct(item.id);
    notify(`${item.name} removed from cart.`);
  }

  function resetDraft() {
    cart.clearCart();
    setDiscountType("none");
    setDiscountValue("0");
    setPayment(blankPayment());
    setRequestToken(newToken());
    setActiveHeldSaleId(null);
    setActiveHeldReference("");
  }

  async function scan(event) {
    event.preventDefault();
    scanQueue.enqueue(barcode);
    setBarcode("");
    window.setTimeout(() => barcodeRef.current?.focus(), 0);
  }

  function changeDiscount(value) {
    if (Number(value) < 0) return notify("Discount cannot be negative.", "error");
    if (discountType === "percentage" && Number(value) > 100) {
      setDiscountValue("100");
      return notify("Percentage discount cannot exceed 100%.", "error");
    }
    setDiscountValue(value);
  }

  function salePayload() {
    const discount = Number(discountValue) || 0;
    return {
      request_token: requestToken,
      held_sale_id: activeHeldSaleId,
      items: cart.items.map((item) => ({ product_id: item.id, unit_id: item.unit_id || null, quantity: item.cartQuantity })),
      discount_type: discount > 0 ? discountType : "none",
      discount_value: discount,
      payment_method: payment.payment_method,
      payment_reference: payment.payment_reference.trim(),
      amount_received: payment.payment_method === "cash" ? Number(payment.amount_received || 0) : totals.grandTotal,
      customer_name: payment.customer_name.trim(),
      customer_phone: payment.customer_phone.trim(),
      notes: payment.note.trim(),
    };
  }

  async function holdSale() {
    if (!cart.items.length) return notify("Add products before holding a sale.", "error");
    try {
      const response = await held.holdSale(salePayload(), activeHeldSaleId);
      resetDraft();
      notify(response.message, "success");
    } catch (failure) {
      notify(normalizeApiError(failure).message, "error");
    }
  }

  async function resume(sale) {
    if (cart.items.length) return notify("Clear or hold the current cart first.", "error");
    try {
      const data = await held.resumeHeldSale(sale.id);
      const validItems = data.items.flatMap((item) => {
        if (item.status !== "active") return [];
        if (Number(item.track_stock) !== 0 && Number(item.quantity) <= 0) return [];
        const cartQuantity = Number(item.track_stock) !== 0 ? Math.min(Number(item.cartQuantity), Number(item.quantity)) : Number(item.cartQuantity);
        return [{ ...item, cartQuantity }];
      });
      if (!validItems.length) return notify("This held sale has no products that can currently be sold.", "error");
      cart.replaceCart(validItems);
      setDiscountType(data.discount_type);
      setDiscountValue(String(data.discount_value));
      setPayment({ ...blankPayment(), payment_method: data.payment_method, payment_reference: data.payment_reference || "", amount_received: data.amount_received || "", customer_name: data.customer_name || "", customer_phone: data.customer_phone || "", note: data.notes || "" });
      setRequestToken(data.request_token || newToken());
      setActiveHeldSaleId(Number(data.id));
      setActiveHeldReference(data.reference_number);
      setHeldOpen(false);
      notify(data.warnings.length ? `${data.reference_number} resumed. ${data.warnings.join(" ")}` : `${data.reference_number} resumed.`, data.warnings.length ? "info" : "success");
    } catch (failure) {
      notify(normalizeApiError(failure).message, "error");
    }
  }

  async function confirmRemoveHeld(sale) {
    const confirmed = await confirmDialog({
      title: "Remove held sale?",
      description: "This removes the saved cart. Product stock will not change.",
      confirmText: "Remove held sale",
      tone: "danger"
    });
    if (!confirmed) return;

    try {
      const response = await held.removeHeldSale(sale.id);
      if (activeHeldSaleId === Number(sale.id)) {
        setActiveHeldSaleId(null);
        setActiveHeldReference("");
      }
      notify(response.message || "Sale removed.", "success");
    } catch (failure) {
      notify(normalizeApiError(failure).message, "error");
    }
  }

  async function confirmClearCart() {
    const confirmed = await confirmDialog({
      title: "Clear current cart?",
      description: "All selected products and payment details will be removed. The saved held record, if any, will remain available.",
      confirmText: "Clear cart",
      tone: "danger"
    });
    if (!confirmed) return;
    
    resetDraft();
    notify("Cart cleared.");
  }

  async function complete() {
    if (!cart.items.length) return notify("Add at least one product.", "error");
    const discount = Number(discountValue) || 0;
    if (discount < 0 || (discountType === "percentage" && discount > 100) || (discountType === "fixed" && discount > totals.subtotal)) return notify("Enter a valid discount.", "error");

    // OFFLINE EMERGENCY SALE PROCESSING
    if (!isOnline || isEmergencyMode) {
      if (payment.payment_method !== "cash") {
        return notify("Only Cash payments are allowed in Offline Emergency Mode.", "error");
      }
      const amountRec = Number(payment.amount_received || totals.grandTotal);
      if (amountRec < totals.grandTotal) {
        return notify("Cash received must cover the grand total.", "error");
      }

      setIsSubmitting(true);
      try {
        const offlineSaleId = generateOfflineSaleId();
        const now = new Date().toISOString();
        const changeRet = Math.max(0, amountRec - totals.grandTotal);

        const offlineRecord = {
          offline_sale_id: offlineSaleId,
          request_token: requestToken,
          device_id: deviceConfig?.device_id || 'local_terminal',
          cashier_id: offlineUser?.id || 1,
          cashier_name: offlineUser?.name || 'Offline Admin',
          customer_name: payment.customer_name.trim() || null,
          customer_phone: payment.customer_phone.trim() || null,
          created_at: now,
          items: cart.items.map((item) => ({
            product_id: item.id,
            product_name: item.name,
            product_code: item.code || '',
            unit_id: item.unit_id || null,
            unit_name_snapshot: item.unit_name || item.unit_type || 'pcs',
            unit_price: (item.selling_price || item.price || 0).toString(),
            quantity: item.cartQuantity,
            quantity_base: item.cartQuantity,
            discount_amount: "0.00",
            line_total: ((item.selling_price || item.price || 0) * item.cartQuantity).toFixed(2),
          })),
          subtotal: totals.subtotal.toFixed(2),
          discount_type: discountType,
          discount_value: discount.toFixed(2),
          discount_amount: totals.discountAmount.toFixed(2),
          tax_amount: totals.taxAmount.toFixed(2),
          grand_total: totals.grandTotal.toFixed(2),
          amount_received: amountRec.toFixed(2),
          change_returned: changeRet.toFixed(2),
          payment_method: 'cash',
          payment_status: 'paid',
          status: 'completed',
          notes: payment.note.trim() ? `[Offline Sale] ${payment.note.trim()}` : '[Offline Sale]',
          invoice_number: 'OFFLINE-' + Date.now().toString().slice(-6),
          sync_status: 'pending',
          sync_attempts: 0,
          is_offline: true,
        };

        // Save offline sale into IndexedDB
        await saveOfflineSale(offlineRecord);

        // Deduct cached stock in IndexedDB
        await deductCachedStock(cart.items);

        // Prepare receipt data
        const offlineReceipt = {
          id: offlineSaleId,
          invoice_number: offlineRecord.invoice_number,
          created_at: now,
          cashier_name: offlineRecord.cashier_name,
          customer_name: offlineRecord.customer_name || 'Walk-in Customer',
          customer_phone: offlineRecord.customer_phone || '',
          subtotal: totals.subtotal.toFixed(2),
          discount_type: discountType,
          discount_amount: totals.discountAmount.toFixed(2),
          tax_amount: totals.taxAmount.toFixed(2),
          grand_total: totals.grandTotal.toFixed(2),
          amount_received: amountRec.toFixed(2),
          change_returned: changeRet.toFixed(2),
          payment_method: 'cash',
          payment_status: 'paid',
          status: 'completed',
          notes: offlineRecord.notes,
          is_offline: true,
          offline_watermark: 'Offline Sale — Pending Sync',
          items: offlineRecord.items,
        };

        setSavedSale(offlineRecord);
        setReceipt(offlineReceipt);
        setReceiptOpen(true);
        resetDraft();
        refreshConfig();
        setStockRefresh((value) => value + 1);
        notify("Offline sale completed and saved locally! Will sync when online.", "success");
      } catch (err) {
        notify("Failed to process offline sale: " + err.message, "error");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (payment.payment_method === "cash" && Number(payment.amount_received || 0) < totals.grandTotal) return notify("Cash received must cover the grand total.", "error");
    setIsSubmitting(true);
    try {
      const response = await completeSale(salePayload());
      setSavedSale(response.data.sale);
      if (receiptSettings.auto_print) {
        const savedReceipt = await getSaleReceipt(response.data.sale.id);
        setReceipt(savedReceipt);
        setReceiptOpen(true);
      }
      resetDraft();
      await held.load().catch(() => undefined);
      setStockRefresh((value) => value + 1);
      notify(response.message || "Sale completed.", "success");
    } catch (failure) {
      notify(normalizeApiError(failure).message, "error");
      if (failure.response?.status === 409) setStockRefresh((value) => value + 1);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function openReceipt() {
    if (!savedSale) return;
    setReceiptLoading(true);
    try {
      const data = await getSaleReceipt(savedSale.id);
      setReceipt(data);
      setSavedSale(null);
      setReceiptOpen(true);
    } catch (failure) {
      notify(normalizeApiError(failure).message, "error");
    } finally {
      setReceiptLoading(false);
    }
  }

  function newSale() {
    setSavedSale(null);
    window.setTimeout(() => barcodeRef.current?.focus(), 0);
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><h2 className="text-[28px] font-extrabold tracking-[-0.035em] text-slate-950">Point of Sale</h2><p className="mt-1.5 text-sm text-slate-500">A focused billing workspace for quick search, scanning, and checkout.</p></div>
        <button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100" onClick={() => setHeldOpen(true)}><Icon name="clock" className="size-4 text-blue-600" /> Held sales <span className="grid min-w-6 place-items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-extrabold text-blue-700">{held.heldSales.length}</span></button>
      </section>
      {activeHeldSaleId && <div className="premium-surface flex flex-col justify-between gap-2 rounded-xl border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 sm:flex-row sm:items-center"><span><strong>Resumed sale:</strong> {activeHeldReference}</span><span>Holding again will update this record.</span></div>}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(400px,0.75fr)]">
        <section className="min-w-0 space-y-4">
          <div className="premium-surface rounded-xl p-4 sm:p-5"><div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="text-base font-extrabold text-slate-900">Products</h3><p className="mt-1 text-xs text-slate-500">Choose an item or scan its barcode.</p></div><span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-extrabold text-slate-500">{pagination.total} available</span></div>
            <div className="grid gap-3 2xl:grid-cols-[1fr_280px]">
              <label className="relative"><Icon name="search" className="absolute left-3.5 top-3.5 size-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50" placeholder="Search name, product code, or barcode" /></label>
              {barcodeSettings.enabled !== false && <form className="flex gap-2" onSubmit={scan}><input ref={barcodeRef} value={barcode} onChange={(event) => setBarcode(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50" placeholder="Scan barcode + Enter" aria-label="Barcode" autoComplete="off" /><button className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60" disabled={scanQueue.isProcessing} type="submit"><Icon name="barcode" className="mr-1.5 size-4" />{scanQueue.isProcessing ? "Checking" : "Add"}</button></form>}
            </div>
            <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto"><Filter active={!category} label="All products" onClick={() => { setCategory(""); setPage(1); }} />{categories.map((item) => <Filter key={item.id} active={category === String(item.id)} label={item.name} onClick={() => { setCategory(String(item.id)); setPage(1); }} />)}</div>
          </div>
          {error && <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><span>{error}</span><button type="button" className="font-bold underline" onClick={() => setRetryKey((value) => value + 1)}>Retry</button></div>}
          {loading ? <Skeleton /> : products.length ? <><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} onAdd={add} />)}</div><Pagination pagination={pagination} onPage={setPage} /></> : <EmptyProducts isOffline={!isOnline || isEmergencyMode} />}
        </section>
        <aside className="premium-surface overflow-hidden rounded-xl xl:sticky xl:top-[98px]">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><Icon name="pos" className="size-[18px]" /></span><div><h3 className="text-base font-extrabold text-slate-900">Current cart</h3><p className="mt-0.5 text-[10px] font-medium text-slate-400">{cart.items.length} product(s) selected</p></div></div>{cart.items.length > 0 && <button className="rounded-lg px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50" type="button" onClick={confirmClearCart}>Clear</button>}</div>
          <div className="max-h-[34vh] space-y-2.5 overflow-y-auto p-4">{cart.items.length ? cart.items.map((item) => <CartItem key={item.id} item={item} onQuantity={quantity} onRemove={remove} />) : <EmptyCart />}</div>
          <TotalsPanel totals={totals} discountType={discountType} discountValue={discountValue} discountsEnabled={discountSettings.enabled !== false} taxLabel={taxSettings.enabled ? `${taxSettings.name || "Tax"} (${taxSettings.percentage || 0}%)` : "Tax disabled"} onDiscountType={(value) => { setDiscountType(value); setDiscountValue("0"); }} onDiscountValue={changeDiscount} />
          <PaymentPanel values={payment} total={totals.grandTotal} onChange={(event) => setPayment((old) => ({ ...old, [event.target.name]: event.target.value }))} />
          <div className="grid grid-cols-[0.8fr_1.2fr] gap-2 border-t border-slate-100 bg-slate-50/60 p-4"><button type="button" disabled={!cart.items.length || isSubmitting} onClick={holdSale} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"><Icon name="hold" className="size-4" />{activeHeldSaleId ? "Update hold" : "Hold sale"}</button><button type="button" disabled={!cart.items.length || isSubmitting} onClick={complete} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:shadow-none disabled:opacity-50"><Icon name={isSubmitting ? "clock" : "card"} className={`size-4 ${isSubmitting ? "animate-pulse" : ""}`} />{isSubmitting ? "Processing..." : "Complete sale"}</button></div>
        </aside>
      </div>
      <HeldSalesDialog isOpen={heldOpen} sales={held.heldSales} isLoading={held.loading} error={held.error} onRetry={() => held.load().catch(() => undefined)} onClose={() => setHeldOpen(false)} onResume={resume} onRemove={async (sale) => { setHeldOpen(false); await confirmRemoveHeld(sale); }} />
      <SaleSuccessModal sale={savedSale} isLoadingReceipt={receiptLoading} onPrint={openReceipt} onViewSale={() => navigate("/sales")} onNewSale={newSale} />
      <ReceiptPreview isOpen={receiptOpen} receipt={receipt} isLoading={false} autoPrint={receiptSettings.auto_print} onClose={() => setReceiptOpen(false)} />
      <AmountWeightModal product={amountWeightProduct} open={!!amountWeightProduct} onClose={() => setAmountWeightProduct(null)} onAdd={addWithQuantity} />
    </div>
  );
}

function Filter({ active, label, onClick }) { return <button type="button" onClick={onClick} className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-bold transition ${active ? "border-blue-600 bg-blue-600 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"}`}>{label}</button>; }
function Pagination({ pagination, onPage }) { if (pagination.total_pages <= 1) return null; return <div className="premium-surface flex items-center justify-between rounded-xl px-4 py-3 text-xs text-slate-500"><span>{pagination.total} products · Page {pagination.page} of {pagination.total_pages}</span><div className="flex gap-2"><button type="button" disabled={pagination.page <= 1} onClick={() => onPage(pagination.page - 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-bold transition hover:bg-slate-50 disabled:opacity-40">Previous</button><button type="button" disabled={pagination.page >= pagination.total_pages} onClick={() => onPage(pagination.page + 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-bold transition hover:bg-slate-50 disabled:opacity-40">Next</button></div></div>; }
function Skeleton() { return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="premium-surface h-48 animate-pulse overflow-hidden rounded-xl"><div className="h-28 bg-slate-100" /></div>)}</div>; }
function EmptyProducts({ isOffline }) {
  return (
    <div className="premium-surface grid min-h-64 place-items-center rounded-xl p-6 text-center">
      <div>
        <Icon name="search" className="mx-auto size-8 text-slate-300" />
        <p className="mt-3 text-base font-extrabold text-slate-800">
          {isOffline ? "No cached products found" : "No products found"}
        </p>
        <p className="mt-1 max-w-sm text-xs text-slate-400">
          {isOffline
            ? "Your offline product database is empty. Please connect online once or sync catalog in Settings > Offline Emergency."
            : "Try another search or category filter."}
        </p>
      </div>
    </div>
  );
}
function EmptyCart() { return <div className="grid min-h-48 place-items-center px-6 text-center"><div><Icon name="pos" className="mx-auto size-7 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-600">Cart is empty</p><p className="mt-1 text-xs text-slate-400">Select a product to begin.</p></div></div>; }
export default PosPage;
