import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../Modal";
import Icon from "../Icon";
import { searchCustomers } from "../../api/customersApi";
import { getProducts } from "../../api/productsApi";

const QUICK_ACTIONS = [
  { label: "Dashboard", path: "/dashboard", icon: "dashboard", type: "Navigation" },
  { label: "Point of Sale", path: "/pos", icon: "pos", type: "Navigation" },
  { label: "Create Customer / Khata", path: "/customers", icon: "plus", type: "Quick Action" },
  { label: "New Product", path: "/products", icon: "plus", type: "Quick Action" },
  { label: "Record Expense", path: "/expenses", icon: "plus", type: "Quick Action" },
  { label: "All Customers", path: "/customers", icon: "users", type: "Customers" },
  { label: "All Products", path: "/products", icon: "products", type: "Products" },
];

function GlobalSearchModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ customers: [], products: [] });
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults({ customers: [], products: [] });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle search
  useEffect(() => {
    if (!query.trim()) {
      setResults({ customers: [], products: [] });
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const [customersRes, productsRes] = await Promise.all([
          searchCustomers(query, 5),
          getProducts({ search: query, limit: 5 })
        ]);
        setResults({
          customers: customersRes.data?.customers || [],
          products: productsRes.products || []
        });
      } catch (e) {
        // silently ignore search errors for now
      } finally {
        setIsSearching(false);
      }
    }, 300); // debounce

    return () => clearTimeout(timer);
  }, [query]);

  function handleNavigate(path) {
    onClose();
    navigate(path);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title="" hideHeader={true}>
      <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center gap-3 border-b border-slate-100 p-4">
          <Icon name="search" className="size-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-lg text-slate-900 outline-none placeholder:text-slate-400"
            placeholder="Search customers, products, or shortcuts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query.trim() && (
            <button onClick={() => setQuery("")} className="text-slate-400 hover:text-slate-600 transition">
              <Icon name="x" className="size-4" />
            </button>
          )}
          <button onClick={onClose} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-100">
            ESC
          </button>
        </div>

        <div className="no-scrollbar max-h-[60vh] overflow-y-auto p-4">
          {!query.trim() && (
            <div>
              <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Quick Navigation & Actions</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {QUICK_ACTIONS.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => handleNavigate(action.path)}
                    className="flex w-full items-center gap-3 rounded-full border border-slate-100 p-2 pl-3 text-left transition hover:border-slate-200 hover:bg-slate-50"
                  >
                    <div className="grid size-6 shrink-0 place-items-center rounded-full border border-blue-100 bg-blue-50 text-blue-600">
                      <Icon name={action.icon} className="size-3.5" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{action.label}</span>
                    <span className="ml-auto mr-1 rounded px-2 py-0.5 text-[10px] font-medium text-slate-400">
                      {action.type}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {query.trim() && (
            <div className="space-y-6">
              {isSearching ? (
                <div className="py-12 text-center text-sm font-medium text-slate-400">Searching...</div>
              ) : (
                <>
                  {results.customers.length === 0 && results.products.length === 0 && (
                    <div className="py-12 text-center text-sm font-medium text-slate-400">No results found for "{query}".</div>
                  )}

                  {results.customers.length > 0 && (
                    <div>
                      <p className="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Customers</p>
                      <div className="grid gap-1">
                        {results.customers.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => handleNavigate(`/customers/${c.id}`)}
                            className="group flex w-full items-center gap-4 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-50"
                          >
                            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                              <Icon name="users" className="size-5" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-slate-900">{c.name}</p>
                              <p className="text-[11px] font-medium text-slate-400">{c.phone || c.customer_code}</p>
                            </div>
                            <Icon name="arrow-right" className="size-4 text-slate-300 opacity-0 transition group-hover:opacity-100" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {results.products.length > 0 && (
                    <div>
                      <p className="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Products</p>
                      <div className="grid gap-1">
                        {results.products.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => handleNavigate(`/products?search=${p.product_code}`)}
                            className="group flex w-full items-center gap-4 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-50"
                          >
                            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                              <Icon name="products" className="size-5" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-slate-900">{p.name}</p>
                              <p className="text-[11px] font-medium text-slate-400">{p.barcode || p.product_code}</p>
                            </div>
                            <div className="text-right text-sm font-bold text-slate-700">
                              Rs. {Number(p.selling_price).toFixed(2)}
                            </div>
                            <Icon name="arrow-right" className="size-4 text-slate-300 opacity-0 transition group-hover:opacity-100" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-5 py-3">
          <span className="text-[11px] font-medium text-slate-400">Navigate with mouse or keyboard</span>
          <span className="text-[11px] font-medium text-slate-400">Press <strong className="font-bold text-slate-600">Ctrl + K</strong> anytime</span>
        </div>
      </div>
    </Modal>
  );
}

export default GlobalSearchModal;
