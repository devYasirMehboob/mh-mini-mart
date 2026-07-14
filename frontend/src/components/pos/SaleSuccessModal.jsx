import Modal from "../Modal";
import Icon from "../Icon";
import { formatCurrency } from "../../utils/calculateSaleTotals";

function SaleSuccessModal({ sale, onNewSale, onPrint, onViewSale, isLoadingReceipt }) {
  return (
    <Modal isOpen={Boolean(sale)} title="Payment successful" description="The sale and stock movement were saved." onClose={onNewSale}>
      {sale && (
        <div className="p-6">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-700">
            <Icon name="check" className="size-7" strokeWidth={2.5} />
          </div>
          <div className="mt-4 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{sale.invoice_number}</p>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{formatCurrency(sale.grand_total)}</p>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-xs">
            <div><dt className="text-slate-400">Received</dt><dd className="mt-1 font-bold text-slate-800">{formatCurrency(sale.amount_received)}</dd></div>
            <div><dt className="text-slate-400">Change</dt><dd className="mt-1 font-bold text-emerald-700">{formatCurrency(sale.change_returned)}</dd></div>
            <div><dt className="text-slate-400">Payment</dt><dd className="mt-1 font-bold capitalize text-slate-800">{sale.payment_method.replaceAll("_", " ")}</dd></div>
            <div><dt className="text-slate-400">Items</dt><dd className="mt-1 font-bold text-slate-800">{sale.items?.length || 0}</dd></div>
          </dl>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <button type="button" disabled={isLoadingReceipt} onClick={onPrint} className="min-h-11 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white disabled:opacity-60">{isLoadingReceipt ? "Loading..." : "Print receipt"}</button>
            <button type="button" onClick={onViewSale} className="min-h-11 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700">View sales</button>
            <button type="button" onClick={onNewSale} className="min-h-11 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700">New sale</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default SaleSuccessModal;
