import { useEffect, useState, useRef } from "react";
import apiClient from "../api/apiClient";
import Icon from "../components/Icon";
import Toast from "../components/pos/Toast";
import PrintableLabelSheet from "../components/barcode/PrintableLabelSheet";
import useSettings from "../hooks/useSettings";
import { printHtmlViaQZ } from "../utils/qzService";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";

export default function BarcodeLabelsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });
  const [selectedItems, setSelectedItems] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [printData, setPrintData] = useState(null);
  const [toast, setToast] = useState(null);
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
        setToast({ message: "Failed to load products.", type: "error" });
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
      return setToast({ message: "Select at least one product to print.", type: "error" });
    }

    const unbarcoded = items.filter(i => !i.barcode);
    if (unbarcoded.length > 0) {
      return setToast({ message: `Product "${unbarcoded[0].name}" does not have a barcode. Assign one first.`, type: "error" });
    }

    setIsGenerating(true);
    try {
      const response = await apiClient.post("/barcode-labels/print-data", { items });
      const generatedLabels = response.data.data.labels;
      
      const printerName = settings?.printer?.label_printer_name || settings?.printer?.printer_name;
      if (!printerName) {
        throw new Error("Label printer name is not configured in settings. Please go to Settings > Printer to configure it.");
      }
      
      // Render the PrintableLabelSheet to an HTML string for QZ
      const container = document.createElement('div');
      const root = createRoot(container);
      flushSync(() => {
        root.render(<PrintableLabelSheet labels={generatedLabels} isQz={true} />);
      });
      
      // Include minimal tailwind styles so QZ renders it correctly
      const html = `
        <html>
          <head>
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body { font-family: sans-serif; background: white; color: black; }
              .grid { display: grid; }
              .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
              .gap-x-2 { column-gap: 0.5rem; }
              .gap-y-4 { row-gap: 1rem; }
              .p-4 { padding: 1rem; }
              .text-center { text-align: center; }
              .flex { display: flex; }
              .flex-col { flex-direction: column; }
              .items-center { align-items: center; }
              .justify-center { justify-content: center; }
              .border { border-width: 1px; border-style: dashed; border-color: #d1d5db; }
              .p-2 { padding: 0.5rem; }
              .break-inside-avoid { break-inside: avoid; }
              .h-\\[1\\.5in\\] { height: 1.5in; }
              .w-full { width: 100%; }
              .justify-between { justify-content: space-between; }
              .px-1 { padding-left: 0.25rem; padding-right: 0.25rem; }
              .text-xs { font-size: 0.75rem; line-height: 1rem; }
              .font-bold { font-weight: 700; }
              .mb-1 { margin-bottom: 0.25rem; }
              .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
              .w-3\\/4 { width: 75%; }
              .w-1\\/4 { width: 25%; }
              .text-right { text-align: right; }
              .text-left { text-align: left; }
              .flex-1 { flex: 1 1 0%; }
              .overflow-hidden { overflow: hidden; }
              .text-\\[10px\\] { font-size: 10px; }
              .font-mono { font-family: monospace; }
              .tracking-widest { letter-spacing: 0.1em; }
              .mt-0\\.5 { margin-top: 0.125rem; }
              svg { width: 100%; height: 100%; }
            </style>
          </head>
          <body>
            ${container.innerHTML}
          </body>
        </html>
      `;
      
      await printHtmlViaQZ(printerName, html);
      setToast({ message: "Labels sent to printer successfully.", type: "success" });
    } catch (error) {
      setToast({ message: error.response?.data?.message || error.message || "Failed to generate labels.", type: "error" });
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
        
        {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
      </div>

      {printData && <PrintableLabelSheet labels={printData} />}
    </>
  );
}
