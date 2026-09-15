import { useState, useEffect, useRef, useCallback } from "react";
import { searchCustomers } from "../../api/customersApi";
import normalizeApiError from "../../utils/normalizeApiError";
import Icon from "../Icon";

function CustomerSelector({ value, onChange, disabled = false, placeholder = "Search customer..." }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  const formatBalance = (balance) => {
    const n = Number(balance || 0);
    if (n === 0) return null;
    return `Rs. ${n.toLocaleString("en-PK", { minimumFractionDigits: 2 })}`;
  };

  const search = useCallback(async (q) => {
    if (!q || q.trim().length < 1) { setResults([]); return; }
    setLoading(true);
    try {
      const data = await searchCustomers(q.trim(), 10);
      setResults(data.data?.customers || []);
    } catch (e) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!focused) { setOpen(false); return; }
    if (query.trim() === "") { setResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(() => { search(query); setOpen(true); }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query, focused, search]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (customer) => {
    onChange(customer);
    setQuery("");
    setOpen(false);
    setFocused(false);
  };

  const clear = () => {
    onChange(null);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div ref={containerRef} className="relative">
      {value ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Icon name="user" className="size-3.5 shrink-0 text-blue-600" />
              <span className="truncate text-sm font-bold text-blue-900">{value.name}</span>
              <span className="text-[10px] text-blue-500">{value.customer_code}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              {value.phone && <span className="text-[10px] text-blue-500">{value.phone}</span>}
              {Number(value.current_balance || 0) > 0 && (
                <span className="text-[10px] font-bold text-red-600">
                  Outstanding: {formatBalance(value.current_balance)}
                </span>
              )}
              {Number(value.advance_balance || 0) > 0 && (
                <span className="text-[10px] font-bold text-emerald-600">
                  Advance: {formatBalance(value.advance_balance)}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={clear}
            disabled={disabled}
            className="ml-1 shrink-0 rounded-md p-0.5 text-blue-500 hover:bg-blue-100 hover:text-blue-700"
            title="Remove customer"
          >
            <Icon name="close" className="size-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            disabled={disabled}
            placeholder={placeholder}
            className="min-h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          />
          <Icon name="search" className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
          {loading && (
            <div className="absolute right-2.5 top-2.5 size-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
          )}
        </div>
      )}

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => select(c)}
              className="flex w-full items-start gap-2 border-b border-slate-100 px-3 py-2 text-left last:border-0 hover:bg-slate-50"
            >
              <Icon name="user" className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-900">{c.name}</span>
                  <span className="text-[10px] text-slate-400">{c.customer_code}</span>
                  {c.khata_enabled == 1 && (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">Khata</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {c.phone && <span className="text-[10px] text-slate-400">{c.phone}</span>}
                  {Number(c.current_balance || 0) > 0 && (
                    <span className="text-[10px] font-bold text-red-500">
                      Owes {formatBalance(c.current_balance)}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && !loading && query.trim().length > 0 && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <p className="text-center text-xs text-slate-400">No customer found for "{query}".</p>
        </div>
      )}
    </div>
  );
}

export default CustomerSelector;
