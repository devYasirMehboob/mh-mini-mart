import Modal from "../Modal";
import LoadingState from "../LoadingState";
import SaleStatusBadge from "./SaleStatusBadge";
import { formatCurrency, formatDateTime } from "../../utils/calculateSaleTotals";
function SaleDetailsModal({ isOpen, sale, isLoading, onClose, onReceipt, onAction }) {
  const isCancelled = sale?.status === "cancelled";
  
  return (
    <Modal 
      isOpen={isOpen} 
      title={sale ? `Sale ${sale.invoice_number}` : "Sale details"} 
      description={isCancelled ? "This sale has been cancelled." : "Saved transaction, payment and audit information."} 
      onClose={onClose} 
      size="lg"
    >
      {isLoading ? (
        <LoadingState label="Loading sale details..." />
      ) : sale && (
        <div className={`max-h-[75vh] overflow-y-auto ${isCancelled ? 'bg-red-50/30' : ''}`}>
          {isCancelled && (
            <div className="bg-red-100 text-red-800 px-5 py-3 text-sm font-bold flex items-center justify-center tracking-widest uppercase mb-4">
              Cancelled Sale
            </div>
          )}
          <div className="px-5 sm:px-6 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                <SaleStatusBadge status={sale.status} />
                <SaleStatusBadge status={isCancelled ? "cancelled" : sale.payment_status} />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => onReceipt(sale)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 bg-white">
                  Receipt
                </button>
                {sale.permissions.can_cancel && sale.status === "completed" && (
                  <button type="button" onClick={() => onAction("cancel", sale)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                    Cancel sale
                  </button>
                )}
                {sale.permissions.can_refund && sale.status === "completed" && (
                  <button type="button" onClick={() => onAction("refund", sale)} className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                    Refund sale
                  </button>
                )}
              </div>
            </div>

            <dl className={`mt-5 grid gap-3 rounded-xl border p-4 text-xs sm:grid-cols-3 ${isCancelled ? 'border-red-200 bg-red-50/50' : 'border-slate-100 bg-slate-50'}`}>
              {[
                ["Date & time", formatDateTime(sale.created_at)],
                ["Cashier", `${sale.cashier_name} · ${sale.cashier_role}`],
                ["Customer", sale.customer_name || "Walk-in customer"],
                ["Customer phone", sale.customer_phone || "—"],
                ["Payment method", sale.payment_method.replaceAll("_", " ")],
                ["Notes", sale.notes || "—"]
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className={`font-bold ${isCancelled ? 'text-red-400' : 'text-slate-400'}`}>{label}</dt>
                  <dd className={`mt-1 capitalize ${isCancelled ? 'text-red-900' : 'text-slate-700'}`}>{value}</dd>
                </div>
              ))}
            </dl>

            <div className={`mt-5 overflow-x-auto rounded-xl border ${isCancelled ? 'border-red-200' : 'border-slate-200'}`}>
              <table className="w-full min-w-[650px] text-xs">
                <thead className={`text-left text-[10px] uppercase tracking-wider ${isCancelled ? 'bg-red-50/80 text-red-500' : 'bg-slate-50 text-slate-400'}`}>
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3 text-right">Quantity</th>
                    <th className="px-4 py-3 text-right">Unit price</th>
                    {sale.permissions.can_view_costs && <th className="px-4 py-3 text-right">Purchase cost</th>}
                    <th className="px-4 py-3 text-right">Discount</th>
                    <th className="px-4 py-3 text-right">Line total</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isCancelled ? 'divide-red-100' : 'divide-slate-100'}`}>
                  {sale.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <strong className={`${isCancelled ? 'text-red-900' : 'text-slate-800'}`}>{item.product_name}</strong>
                        <small className={`block ${isCancelled ? 'text-red-400' : 'text-slate-400'}`}>{item.product_code}</small>
                      </td>
                      <td className={`px-4 py-3 text-right ${isCancelled ? 'text-red-700' : ''}`}>{Number(item.quantity)}</td>
                      <td className={`px-4 py-3 text-right ${isCancelled ? 'text-red-700' : ''}`}>{formatCurrency(item.unit_price)}</td>
                      {sale.permissions.can_view_costs && <td className={`px-4 py-3 text-right ${isCancelled ? 'text-red-700' : ''}`}>{formatCurrency(item.purchase_cost)}</td>}
                      <td className={`px-4 py-3 text-right ${isCancelled ? 'text-red-700' : ''}`}>{formatCurrency(item.discount_amount)}</td>
                      <td className={`px-4 py-3 text-right font-bold ${isCancelled ? 'text-red-900 line-through opacity-70' : ''}`}>{formatCurrency(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <section className={`rounded-xl border p-4 ${isCancelled ? 'border-red-200 bg-white/50' : 'border-slate-200'}`}>
                <h3 className={`text-sm font-extrabold ${isCancelled ? 'text-red-900' : 'text-slate-800'}`}>Payment records</h3>
                {sale.payments.length === 0 ? (
                  <p className={`mt-4 text-xs ${isCancelled ? 'text-red-400' : 'text-slate-400'}`}>No payment record.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {sale.payments.map((payment) => (
                      <div key={payment.id} className="flex justify-between text-xs">
                        <span className={`capitalize ${isCancelled ? 'text-red-500' : 'text-slate-500'}`}>
                          {payment.payment_method.replaceAll("_", " ")} · {isCancelled ? 'cancelled' : payment.status}
                        </span>
                        <strong className={isCancelled ? 'text-red-900 line-through opacity-70' : ''}>{formatCurrency(payment.amount)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className={`rounded-xl border p-4 ${isCancelled ? 'border-red-200 bg-white/50' : 'border-slate-200'}`}>
                <h3 className={`text-sm font-extrabold ${isCancelled ? 'text-red-900' : 'text-slate-800'}`}>Totals</h3>
                <dl className="mt-3 space-y-2 text-xs">
                  {(() => {
                    const received = Number(sale.amount_received || 0);
                    const change = Number(sale.change_returned || 0);
                    const grand = Number(sale.grand_total || 0);
                    const khataDeposit = received - change - grand;
                    
                    const rows = [
                      ["Subtotal", sale.subtotal],
                      ["Discount", sale.discount_amount],
                      ["Tax", sale.tax_amount],
                      ["Grand total", sale.grand_total],
                      ["Received", sale.amount_received],
                      ["Change", sale.change_returned]
                    ];
                    
                    if (khataDeposit > 0) {
                      rows.push(["Khata deposit", khataDeposit]);
                    } else if (khataDeposit < 0) {
                      rows.push(["Added to khata", Math.abs(khataDeposit)]);
                    }
                    
                    return rows.map(([label, value]) => (
                      <div key={label} className={`flex justify-between ${label === "Grand total" ? `border-t pt-2 font-extrabold ${isCancelled ? 'border-red-200 text-red-900 line-through opacity-70' : 'border-slate-100 text-slate-900'}` : (isCancelled ? 'text-red-600' : (label === 'Khata deposit' ? 'font-bold text-blue-600' : (label === 'Added to khata' ? 'font-bold text-red-600' : 'text-slate-500')))}`}>
                        <dt>{label}</dt>
                        <dd>{formatCurrency(value)}</dd>
                      </div>
                    ));
                  })()}
                </dl>
              </section>
            </div>

            {(sale.cancellation_reason || sale.refunds.length > 0) && (
              <section className={`mt-5 rounded-xl border p-4 text-xs ${isCancelled ? 'border-red-300 bg-red-100 text-red-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                <h3 className="font-extrabold">Status audit</h3>
                {sale.cancellation_reason && (
                  <p className="mt-2 font-medium">Cancelled: {sale.cancellation_reason} · {sale.cancelled_at}</p>
                )}
                {sale.refunds.map((refund) => (
                  <p key={refund.id} className="mt-2">
                    Refunded {formatCurrency(refund.refund_amount)} via {refund.refund_method.replaceAll("_", " ")}: {refund.reason} · {refund.created_at}
                  </p>
                ))}
              </section>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
export default SaleDetailsModal;
