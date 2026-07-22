import { useEffect, useState } from "react";
import apiClient from "../../api/apiClient";
import { formatCurrency } from "../../utils/calculateSaleTotals";
import Icon from "../Icon";

function SupplierProductSuggestions({ supplierId, onSelectProduct }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supplierId) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    apiClient
      .get(`/suppliers/${supplierId}/purchase-suggestions`)
      .then((res) => {
        setSuggestions(res.data?.data?.suggestions || []);
      })
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));
  }, [supplierId]);

  if (!supplierId || (suggestions.length === 0 && !loading)) {
    return null;
  }

  return (
    <section className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Icon name="sparkles" className="size-4 text-blue-600" />
        <span className="text-xs font-extrabold text-blue-950 uppercase tracking-wide">
          Recent & Frequent Supplier Products
        </span>
      </div>

      {loading ? (
        <div className="py-2 text-xs font-semibold text-blue-500">
          Loading supplier product suggestions...
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectProduct(item)}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-sm transition hover:border-blue-500 hover:bg-blue-600 hover:text-white"
            >
              <span>+ {item.name}</span>
              {item.last_purchase_cost && (
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-extrabold text-blue-700 transition group-hover:bg-blue-500 group-hover:text-white">
                  {formatCurrency(item.last_purchase_cost)}
                  {item.last_purchase_unit_symbol ? ` / ${item.last_purchase_unit_symbol}` : ""}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export default SupplierProductSuggestions;
