import { useEffect, useRef, useState } from "react";
import apiClient from "../../api/apiClient";
import normalizeApiError from "../../utils/normalizeApiError";
import { formatCurrency } from "../../utils/calculateSaleTotals";
import Icon from "../Icon";

function PurchaseProductCombobox({ supplierId, onSelectProduct, onQuickAdd }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [error, setError] = useState("");

  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setError("");

    const timer = setTimeout(() => {
      apiClient
        .get("/purchase-products", {
          params: {
            search: query.trim(),
            supplier_id: supplierId || "",
            limit: 25,
          },
        })
        .then((res) => {
          const list = res.data?.data?.products || [];
          setProducts(list);
          setHighlightedIndex(0);
        })
        .catch((err) => {
          setError(normalizeApiError(err).message);
          setProducts([]);
        })
        .finally(() => setLoading(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [query, supplierId, isOpen]);

  function handleKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) =>
        prev < products.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && products[highlightedIndex]) {
        selectItem(products[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  function selectItem(product) {
    onSelectProduct(product);
    setQuery("");
    setIsOpen(false);
    if (inputRef.current) inputRef.current.focus();
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search by name, code, barcode, or supplier item code..."
          className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <Icon
          name="search"
          className="pointer-events-none absolute left-3 top-4 size-4 text-slate-400"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setProducts([]);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-3.5 text-xs text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          {loading ? (
            <div className="p-4 text-center text-xs font-semibold text-slate-500">
              Searching products...
            </div>
          ) : error ? (
            <div className="p-3 text-center text-xs font-medium text-red-600">
              {error}
            </div>
          ) : products.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-xs text-slate-500">No products found.</p>
              {onQuickAdd && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onQuickAdd(query);
                  }}
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-100"
                >
                  <Icon name="plus" className="size-3.5" />
                  Quick Add "{query || "Product"}"
                </button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {products.map((p, idx) => {
                const isHighlighted = idx === highlightedIndex;
                return (
                  <li
                    key={p.id}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => selectItem(p)}
                    className={`cursor-pointer p-2.5 transition rounded-lg ${
                      isHighlighted
                        ? "bg-blue-50 text-blue-900"
                        : "hover:bg-slate-50 text-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm truncate">
                            {p.name}
                          </span>
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-600">
                            {p.product_code}
                          </span>
                          {p.supplier_item_code && (
                            <span className="rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                              Sup Code: {p.supplier_item_code}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                          <span>Category: <strong>{p.category_name}</strong></span>
                          {p.barcode && (
                            <span>Barcode: <code className="font-mono">{p.barcode}</code></span>
                          )}
                          <span>
                            Stock: <strong>{p.quantity} {p.base_unit_symbol || p.base_unit_name || "pcs"}</strong>
                          </span>
                        </div>
                      </div>
                      {p.last_purchase_cost ? (
                        <div className="ml-3 text-right shrink-0">
                          <div className="text-xs font-extrabold text-emerald-600">
                            Last Cost: {formatCurrency(p.last_purchase_cost)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            / {p.last_purchase_unit_symbol || p.default_purchase_unit_symbol || "unit"}
                          </div>
                        </div>
                      ) : (
                        <div className="ml-3 text-right shrink-0">
                          <div className="text-xs font-bold text-slate-600">
                            Cost: {formatCurrency(p.purchase_cost || 0)}
                          </div>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default PurchaseProductCombobox;
