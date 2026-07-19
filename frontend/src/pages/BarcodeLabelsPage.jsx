import { useEffect, useState } from "react";
import apiClient from "../api/apiClient";
import Icon from "../components/Icon";
import PrintableLabelSheet from "../components/barcode/PrintableLabelSheet";
import useSettings from "../hooks/useSettings";
import useAlert from "../hooks/useAlert";
import PageErrorState from "../components/feedback/PageErrorState";
import normalizeApiError from "../utils/normalizeApiError";
import { printHtmlViaQZ } from "../utils/qzService";

function generatePrintHtml(labels) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Print Barcode Labels</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #fff; color: #000; margin: 0; padding: 0; font-family: monospace; }
          @media print {
            @page { margin: 0; size: auto; }
          }
          .barcode-strip {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
            padding: 10px 0;
          }
          .barcode-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 100%;
            margin-bottom: 20px; /* Spacing between barcodes on continuous rolls */
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .barcode-svg {
            width: 60% !important;
            max-width: 140px;
            height: auto;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .barcode-svg svg {
            width: 100% !important;
            height: auto !important;
            max-height: 32px;
            display: block;
            shape-rendering: crispEdges;
          }
          .barcode-digits {
            margin-top: 3px;
            font-size: 10px;
            font-weight: bold;
            text-align: center;
            letter-spacing: 1px;
            white-space: nowrap;
            color: #000;
          }
        </style>
      </head>
      <body>
        <div class="barcode-strip">
          ${labels.map(label => `
            <div class="barcode-card">
              <div class="barcode-svg">${label.svg}</div>
              <div class="barcode-digits">${label.barcode}</div>
            </div>
          `).join("")}
        </div>
      </body>
    </html>
  `;
}

function printLabelsInBrowser(labels) {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "0";

    document.body.appendChild(iframe);

    const frameWindow = iframe.contentWindow;
    const frameDocument = iframe.contentDocument || iframe.contentWindow?.document;

    if (!frameWindow || !frameDocument) {
      iframe.remove();
      resolve();
      return;
    }

    frameDocument.open();
    frameDocument.write(generatePrintHtml(labels));
    frameDocument.close();

    setTimeout(() => {
      frameWindow.focus();
      frameWindow.print();
      setTimeout(() => {
        iframe.remove();
        resolve();
      }, 1000);
    }, 300);
  });
}

export default function BarcodeLabelsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });
  const [selectedItems, setSelectedItems] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const alert = useAlert();
  const [pageError, setPageError] = useState(null);
  const { settings } = useSettings();

  useEffect(() => {
    document.title = "Print Barcode Labels | MH Mini Mart";
  }, []);


  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    apiClient.get("/barcode-labels/products", {
      params: { search, page, limit: 20 },
      signal: controller.signal
    })
    .then(response => {
      setProducts(response.data.data.products);
      setPagination(response.data.data.pagination);
    })
    .catch(error => {
      if (error.code !== "ERR_CANCELED") {
        setPageError(normalizeApiError(error));
      }
    })
    .finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });

    return () => controller.abort();
  }, [search, page]);

  const handleSelect = (product, quantity) => {
    setSelectedItems(prev => {
      const next = { ...prev };
      if (quantity > 0) {
        next[product.id] = { product_id: product.id, name: product.name, barcode: product.barcode, quantity };
      } else {
        delete next[product.id];
      }
      return next;
    });
  };

  const handlePrint = async () => {
    const items = Object.values(selectedItems).filter(item => item.quantity > 0);
    if (items.length === 0) {
      return alert.error("Select at least one product to print.");
    }

    const unbarcoded = items.filter(i => !i.barcode);
    if (unbarcoded.length > 0) {
      return alert.error(`Product "${unbarcoded[0].name}" does not have a barcode. Assign one first.`);
    }

    setIsGenerating(true);
    try {
      const response = await apiClient.post("/barcode-labels/print-data", { items });
      const generatedLabels = response.data.data.labels || [];
      if (generatedLabels.length === 0) {
        throw new Error("No barcode labels were generated for the selected products.");
      }
      
      const printingMethod = settings?.printer?.printing_method || "browser";

      if (printingMethod === "qz") {
        const printerName = settings?.printer?.label_printer_name || settings?.printer?.printer_name;
        if (!printerName) {
          throw new Error("Label printer name is not configured in settings. Please go to Settings > Printer to configure it.");
        }
        
        await printHtmlViaQZ(printerName, generatePrintHtml(generatedLabels));
        alert.success("Labels sent to printer successfully.");
      } else {
        await printLabelsInBrowser(generatedLabels);
        alert.success("Print dialog opened for barcode labels.");
      }
    } catch (error) {
      alert.error(normalizeApiError(error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <div className="space-y-6 print:hidden">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Print Labels</h1>
            <p className="mt-1 text-sm text-slate-500">Select products and quantities to print barcode labels.</p>
          </div>
          <button
            onClick={handlePrint}
            disabled={isGenerating || Object.keys(selectedItems).length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
          >
            <Icon name="printer" className="size-4" />
            {isGenerating ? "Generating..." : "Print Labels"}
          </button>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
          <section className="premium-surface overflow-hidden rounded-xl">
            <div className="border-b border-slate-100 p-4">
              <label className="relative">
                <Icon name="search" className="absolute left-3.5 top-2.5 size-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search products..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Product</th>
                    <th className="px-4 py-3 font-semibold">Barcode</th>
                    <th className="px-4 py-3 font-semibold w-32">Print Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loading ? (
                    <tr><td colSpan="3" className="px-4 py-8 text-center text-slate-500">Loading products...</td></tr>
                  ) : products.length === 0 ? (
                    <tr><td colSpan="3" className="px-4 py-8 text-center text-slate-500">No products found.</td></tr>
                  ) : (
                    products.map(product => (
                      <tr key={product.id} className="transition hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{product.name}</div>
                          <div className="text-xs text-slate-500">{product.product_code}</div>
                        </td>
                        <td className="px-4 py-3">
                          {product.barcode ? (
                            <span className="inline-block rounded bg-slate-100 px-2 py-1 text-xs font-mono text-slate-700">{product.barcode}</span>
                          ) : (
                            <span className="text-xs text-amber-600">No barcode</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            max="500"
                            value={selectedItems[product.id]?.quantity || ""}
                            onChange={(e) => handleSelect(product, parseInt(e.target.value) || 0)}
                            disabled={!product.barcode}
                            className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100 disabled:opacity-50"
                            placeholder="0"
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {pagination.total_pages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 p-4">
                <span className="text-xs text-slate-500">Showing page {pagination.page} of {pagination.total_pages}</span>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => p - 1)} disabled={page <= 1} className="rounded border px-3 py-1 text-xs font-medium disabled:opacity-50">Prev</button>
                  <button onClick={() => setPage(p => p + 1)} disabled={page >= pagination.total_pages} className="rounded border px-3 py-1 text-xs font-medium disabled:opacity-50">Next</button>
                </div>
              </div>
            )}
          </section>

          <aside className="premium-surface h-fit rounded-xl p-5">
            <h3 className="mb-4 text-sm font-bold text-slate-900">Selected for Printing</h3>
            {Object.values(selectedItems).length === 0 ? (
              <p className="text-xs text-slate-500">No items selected.</p>
            ) : (
              <ul className="space-y-3">
                {Object.values(selectedItems).map(item => (
                  <li key={item.product_id} className="flex items-start justify-between text-sm">
                    <div>
                      <div className="font-semibold text-slate-800">{item.name}</div>
                      <div className="text-xs text-slate-500">{item.barcode}</div>
                    </div>
                    <div className="rounded bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                      x {item.quantity}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <h3 className="mb-4 mt-8 text-sm font-bold text-slate-900">Label Preview</h3>
            <div className="flex flex-col items-center justify-center border border-dashed border-slate-300 bg-white p-2 text-black w-full h-[1.5in] mt-2 relative">
              {Object.values(selectedItems).length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 backdrop-blur-[1px]">
                  <p className="text-xs text-slate-500 font-medium">Select a product to preview</p>
                </div>
              ) : null}
              
              <div className="flex w-full justify-between px-1 text-xs font-bold mb-1">
                <span className="truncate w-3/4 text-left">
                  {Object.values(selectedItems).length > 0 ? Object.values(selectedItems)[0].name : "Product Name"}
                </span>
                <span className="w-1/4 text-right">Price</span>
              </div>
              <div className="w-full flex-1 flex items-center justify-center overflow-hidden py-1">
                {Object.values(selectedItems).length > 0 ? (
                  <img 
                    src={`${apiClient.defaults.baseURL}/barcode/image/${Object.values(selectedItems)[0].barcode}`} 
                    alt="Barcode preview" 
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="h-full w-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-300">
                    ||||||||||||||||
                  </div>
                )}
              </div>
              <div className="text-[10px] font-mono tracking-widest mt-0.5 min-h-[15px]">
                {Object.values(selectedItems).length > 0 ? Object.values(selectedItems)[0].barcode : "00000000000"}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

