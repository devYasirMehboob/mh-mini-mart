import { useEffect, useState } from "react";
import Modal from "../Modal";
import LoadingState from "../LoadingState";
import {
  formatCurrency,
  formatDateTime,
} from "../../utils/calculateSaleTotals";
import useSettings from "../../hooks/useSettings";
import useAlert from "../../hooks/useAlert";

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
        const html = document.querySelector(".receipt-print-root").outerHTML;
      const fullHtml = `<html><head><style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: monospace; background: white; color: black; font-size: 11px; }
        .w-full { width: 100%; } .mx-auto { margin-left: auto; margin-right: auto; }
        .text-center { text-align: center; } .text-right { text-align: right; } .text-left { text-align: left; }
        .font-bold { font-weight: bold; } .font-extrabold { font-weight: 800; } .font-black { font-weight: 900; }
        .my-3 { margin-top: 0.75rem; margin-bottom: 0.75rem; } .mb-2 { margin-bottom: 0.5rem; } .mt-2 { margin-top: 0.5rem; }
        .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; } .pb-1 { padding-bottom: 0.25rem; } .pr-2 { padding-right: 0.5rem; }
        .border-t { border-top-width: 1px; } .border-dashed { border-style: dashed; } .border-black { border-color: black; }
        .border-2 { border-width: 2px; } .uppercase { text-transform: uppercase; } .text-base { font-size: 1rem; }
        .flex { display: flex; } .justify-between { justify-content: space-between; } .justify-end { justify-content: flex-end; }
        .block { display: block; } .align-top { vertical-align: top; } .capitalize { text-transform: capitalize; }
        .space-y-1 > * + * { margin-top: 0.25rem; } .space-y-2 > * + * { margin-top: 0.5rem; }
        .max-h-14 { max-height: 3.5rem; } .max-w-24 { max-width: 6rem; } .object-contain { object-fit: contain; }
        .bg-white { background-color: white; } .p-4 { padding: 1rem; } .text-lg { font-size: 1.125rem; } .text-sm { font-size: 0.875rem; }
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
        ["Subtotal", receipt.sale.subtotal],
        ...(options.show_discount !== false
          ? [["Discount", receipt.sale.discount_amount]]
          : []),
        ...(options.show_tax !== false && options.tax_show_on_receipt !== false
          ? [[options.tax_name || "Tax", receipt.sale.tax_amount]]
          : []),
        ["Grand total", receipt.sale.grand_total],
        ["Received", receipt.sale.amount_received],
        ...(options.show_change !== false
          ? [["Change", receipt.sale.change_returned]]
          : []),
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
              className="receipt-print-root mx-auto w-full bg-white p-4 font-mono text-[11px] text-black"
              style={{
                maxWidth: options.paper_width === "58mm" ? "58mm" : "80mm",
              }}
            >
              <header className="text-center">
                {options.show_logo !== false && logo && (
                  <img
                    src={logo}
                    alt=""
                    className="mx-auto mb-2 max-h-14 max-w-24 object-contain"
                  />
                )}
                <h2 className="text-lg font-extrabold">{shop.name}</h2>
                {shop.address && <p>{shop.address}</p>}
                {shop.phone && <p>{shop.phone}</p>}
                {shop.registration_number && <p>{shop.registration_number}</p>}
                <div className="my-3 border-t border-dashed border-black" />
                <p className="font-bold">{receipt.sale.invoice_number}</p>
                <p>{formatDateTime(receipt.sale.created_at)}</p>
                {options.show_cashier !== false && (
                  <p>
                    Cashier: {receipt.sale.cashier_name} (
                    {receipt.sale.cashier_role})
                  </p>
                )}
                {options.show_customer !== false &&
                  receipt.sale.customer_name && (
                    <p>Customer: {receipt.sale.customer_name}</p>
                  )}
                {options.show_customer !== false &&
                  receipt.sale.customer_phone && (
                    <p>Phone: {receipt.sale.customer_phone}</p>
                  )}
              </header>

              {receipt.sale.status !== "completed" && (
                <div className="my-3 border-2 border-black py-1 text-center text-base font-black uppercase">
                  {receipt.sale.status}
                </div>
              )}

              <div className="my-3 border-t border-dashed border-black" />
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="pb-1 text-left">Item</th>
                    <th className="pb-1 text-right">Qty</th>
                    <th className="pb-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.sale.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-1 pr-2">
                        {item.product_name}
                        <small className="block">
                          {formatCurrency(item.unit_price)} each
                        </small>
                      </td>
                      <td className="py-1 text-right align-top">
                        {Number(item.quantity)}
                      </td>
                      <td className="py-1 text-right align-top">
                        {formatCurrency(item.line_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="my-3 border-t border-dashed border-black" />
              <dl className="space-y-1">
                {totals.map(([label, value]) => (
                  <div
                    key={label}
                    className={`flex justify-between ${label === "Grand total" ? "text-sm font-black" : ""}`}
                  >
                    <dt>{label}</dt>
                    <dd>{formatCurrency(value)}</dd>
                  </div>
                ))}
              </dl>

              {options.show_payment_method !== false && (
                <p className="mt-2 capitalize">
                  Payment: {receipt.sale.payment_method.replaceAll("_", " ")}
                </p>
              )}

              <div className="my-3 border-t border-dashed border-black" />
              <footer className="space-y-1 text-center">
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
