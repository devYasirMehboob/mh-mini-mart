import { useEffect, useState } from "react";
import Modal from "../Modal";
import LoadingState from "../LoadingState";
import ReadableStock from "../products/ReadableStock";
import {
  formatCurrency,
  formatDateTime,
} from "../../utils/calculateSaleTotals";
import useSettings from "../../hooks/useSettings";
import useAlert from "../../hooks/useAlert";
import apiClient from "../../api/apiClient";

const shopImageUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return new URL(url, apiClient.defaults.baseURL).href;
};

function ReceiptPreview({
  isOpen,
  receipt,
  isLoading,
  onClose,
  autoPrint = false,
}) {
  const { settings } = useSettings();
  const alert = useAlert();
  const options = receipt?.options || settings?.receipt || {};
  const shop = receipt?.shop || {};
  const logo = settings?.shop?.logo_url;
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    const printingMethod = settings?.printer?.printing_method || "browser";

    if (printingMethod === "qz") {
      const printerName = settings?.printer?.printer_name;
      if (!printerName) {
        alert.error("Receipt printer name is not configured in settings. Please configure it in Settings > Printer.");
        return;
      }
      
      try {
        setIsPrinting(true);
        const html = document.getElementById("printable-receipt").outerHTML;
      const fullHtml = `<html><head><style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: "Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", "Nafees", "Urdu Typesetting", Tahoma, Arial, sans-serif; background: white; color: black; font-size: 13px; }
        .w-full { width: 100%; } .mx-auto { margin-left: auto; margin-right: auto; }
        .text-center { text-align: center; } .text-right { text-align: right; } .text-left { text-align: left; }
        .font-bold { font-weight: bold; } .font-extrabold { font-weight: 800; } .font-black { font-weight: 900; }
        .my-3 { margin-top: 0.75rem; margin-bottom: 0.75rem; } .mb-2 { margin-bottom: 0.5rem; } .mt-2 { margin-top: 0.5rem; }
        .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; } .pb-1 { padding-bottom: 0.25rem; } .pr-2 { padding-right: 0.5rem; }
        .border-t { border-top-width: 1px; } .border-dashed { border-style: dashed; } .border-solid { border-style: solid; } .border-black { border-color: black; }
        .border-2 { border-width: 2px; } .uppercase { text-transform: uppercase; } .text-base { font-size: 1rem; }
        .flex { display: flex; } .justify-between { justify-content: space-between; } .justify-end { justify-content: flex-end; }
        .block { display: block; } .align-top { vertical-align: top; } .capitalize { text-transform: capitalize; }
        .space-y-1 > * + * { margin-top: 0.25rem; } .space-y-2 > * + * { margin-top: 0.5rem; }
        .max-h-14 { max-height: 3.5rem; } .max-w-24 { max-width: 6rem; } .object-contain { object-fit: contain; }
        .bg-white { background-color: white; } .p-4 { padding: 1rem; } .text-lg { font-size: 1.125rem; } .text-sm { font-size: 0.875rem; }
        .text-xs { font-size: 0.75rem; } .tracking-widest { letter-spacing: 0.1em; } .mt-1 { margin-top: 0.25rem; } .mt-4 { margin-top: 1rem; } .mt-3 { margin-top: 0.75rem; } .flex-col { flex-direction: column; } .items-center { align-items: center; } .justify-center { justify-content: center; } .h-10 { height: 2.5rem; } .max-w-\\[200px\\] { max-width: 200px; }
        .barcode-text { font-family: monospace; }
      </style></head><body>${html}</body></html>`;
      
        const { printHtmlViaQZ } = await import("../../utils/qzService");
        await printHtmlViaQZ(printerName, fullHtml);
      } catch (err) {
        alert.error("Failed to print via QZ Tray: " + (err.message || "Unknown error"));
      } finally {
        setIsPrinting(false);
      }
    } else {
      window.print();
    }
  };

  useEffect(() => {
    if (isOpen && receipt && autoPrint) {
      const timer = setTimeout(() => handlePrint(), 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen, receipt, autoPrint]);

  const totals = receipt
    ? [
        ["کل رقم", receipt.sale.subtotal],
        ...(options.show_discount !== false
          ? [["چھوٹ", receipt.sale.discount_amount]]
          : []),
        ...(options.show_tax !== false && options.tax_show_on_receipt !== false
          ? [[options.tax_name || "ٹیکس", receipt.sale.tax_amount]]
          : []),
        ["وصول شدہ", receipt.sale.amount_received],
        ...(options.show_change !== false
          ? [["بقایا جات", receipt.sale.change_returned]]
          : []),
        ["مجموعی رقم", receipt.sale.grand_total],
      ]
    : [];

  return (
    <Modal
      isOpen={isOpen}
      title="Receipt preview"
      description={`Saved ${options.paper_width || "80mm"} receipt data.`}
      onClose={onClose}
      size="sm"
    >
      {isLoading ? (
        <LoadingState label="Loading receipt..." />
      ) : (
        receipt && (
          <div className="p-5">
            <article
              id="printable-receipt"
              dir="rtl"
              style={{ fontFamily: '"Alvi Nastaleeq", "Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", "Nafees", Tahoma, Arial, sans-serif' }}
              className="receipt-content mx-auto max-w-[300px] bg-white p-4 text-base leading-tight text-black print:p-0"
            >
              <style>{`
                @media print {
                  @page { margin: 0; size: ${options.paper_width === "58mm" ? "58mm auto" : "80mm auto"}; }
                  body { margin: 0; padding: 0; }
                  .no-print { display: none !important; }
                  .receipt-content { width: 100% !important; max-width: none !important; }
                }
              `}</style>

              <header className="text-center">
                <p className="mb-2 text-xs font-bold">
                  رسید نمبر: <span className="barcode-text text-sm">{receipt.sale.invoice_number}</span>
                </p>

                {options.show_logo !== false && shop.logo && (
                  <img
                    src={shopImageUrl(shop.logo)}
                    alt="Logo"
                    className="mx-auto mb-2 h-12 w-auto object-contain grayscale"
                  />
                )}
                <h2 className="text-lg font-black">{shop.shop_name}</h2>
                {shop.address && <p>{shop.address}</p>}
                {options.show_phone !== false && shop.phone && <p className="barcode-text">{shop.phone}</p>}
                {shop.registration_number && <p>{shop.registration_number}</p>}
                
                <div className="my-3 border-t border-solid border-black" />
                
                <p className="barcode-text mb-2 text-sm font-bold tracking-wider">{formatDateTime(receipt.sale.created_at)}</p>
                
                {options.show_customer !== false && (receipt.sale.customer_name || receipt.sale.customer_phone) && (
                  <p className="mb-0.5">
                    کسٹمر: {receipt.sale.customer_name || "نامعلوم"} 
                    {receipt.sale.customer_phone && <span className="barcode-text mr-2">({receipt.sale.customer_phone})</span>}
                  </p>
                )}

                {options.show_cashier !== false && (
                  <p className="mb-0.5">
                    کیشیئر: {receipt.sale.cashier_name}
                  </p>
                )}
              </header>

              {receipt.sale.status !== "completed" && (
                <div className="my-3 border-2 border-solid border-black py-1 text-center text-base font-black uppercase">
                  {receipt.sale.status}
                </div>
              )}

              <div className="my-3 border-t border-solid border-black" />
              <table className="w-full text-right">
                <thead>
                  <tr>
                    <th className="pb-1 text-right">آئٹم</th>
                    <th className="pb-1 text-left">تعداد</th>
                    <th className="pb-1 text-left">قیمت</th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.sale.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-1 pl-2">
                        {item.product_name}
                        <small className="block">
                          فی کس <span className="barcode-text">{formatCurrency(item.unit_price)}</span>
                        </small>
                      </td>
                      <td className="py-1 text-left align-top barcode-text">
                        <ReadableStock quantity={item.quantity_entered || item.quantity} unitType={item.unit_name_snapshot || ""} />
                      </td>
                      <td className="py-1 text-left align-top barcode-text">
                        {formatCurrency(item.line_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="my-3 border-t border-solid border-black" />
              <dl className="space-y-1">
                {totals.map(([label, value]) => (
                  <div
                    key={label}
                    className={`flex justify-between ${label === "مجموعی رقم" ? "text-lg font-black" : ""}`}
                  >
                    <dt>{label}</dt>
                    <dd className="barcode-text">{formatCurrency(value)}</dd>
                  </div>
                ))}
              </dl>

              {options.show_payment_method !== false && (
                <p className="mt-2 capitalize">
                  ادائیگی کا طریقہ: {receipt.sale.payment_method === "cash" ? "نقد" : receipt.sale.payment_method.replaceAll("_", " ")}
                </p>
              )}

              <div className="my-3 border-t border-solid border-black" />
              
              <footer className="mt-3 space-y-1 text-center">
                <p>{shop.footer}</p>
                <p>{shop.return_policy}</p>
              </footer>
            </article>

            <div className="no-print mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isPrinting}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 disabled:opacity-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handlePrint}
                disabled={isPrinting}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
              >
                {isPrinting ? "Printing..." : "Print / Reprint"}
              </button>
            </div>
          </div>
        )
      )}
    </Modal>
  );
}

export default ReceiptPreview;
