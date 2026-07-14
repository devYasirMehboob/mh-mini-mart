import Modal from "../Modal";
import LoadingState from "../LoadingState";
import { formatCurrency } from "../../utils/calculateSaleTotals";

function HeldSalesDialog({ isOpen, sales, isLoading, error, onClose, onRetry, onResume, onRemove }) {
  return (
    <Modal isOpen={isOpen} title="Held sales" description="Saved in the local database without reducing stock." onClose={onClose}>
      <div className="max-h-[60vh] overflow-y-auto p-5">
        {isLoading ? (
          <LoadingState label="Loading held sales..." />
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p>{error}</p>
            <button type="button" className="mt-3 font-bold underline" onClick={onRetry}>Try again</button>
          </div>
        ) : sales.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">No held sales.</p>
        ) : (
          <div className="space-y-3">
            {sales.map((sale) => (
              <article key={sale.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex justify-between gap-3">
                  <div>
                    <strong className="text-sm text-slate-900">{sale.reference_number}</strong>
                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(sale.updated_at.replace(" ", "T")).toLocaleString()} · {sale.item_count} item(s)
                    </p>
                    {sale.customer_name && <p className="mt-1 text-xs text-slate-500">{sale.customer_name}</p>}
                  </div>
                  <strong className="text-sm text-blue-700">{formatCurrency(sale.estimated_subtotal)}</strong>
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white" onClick={() => onResume(sale)}>Resume</button>
                  <button type="button" className="rounded-lg px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50" onClick={() => onRemove(sale)}>Remove</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default HeldSalesDialog;
