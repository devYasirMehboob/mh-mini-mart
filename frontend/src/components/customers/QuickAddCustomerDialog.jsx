import { useState } from "react";
import { quickAddCustomer } from "../../api/customersApi";
import normalizeApiError from "../../utils/normalizeApiError";
import Modal from "../Modal";

function QuickAddCustomerDialog({ open, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  function reset() {
    setName(""); setPhone(""); setNotes("");
    setError(""); setFieldErrors({});
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) { setFieldErrors({ name: ["Customer name is required."] }); return; }
    setSubmitting(true);
    setError(""); setFieldErrors({});
    try {
      const data = await quickAddCustomer({ name: name.trim(), phone: phone.trim() || undefined, notes: notes.trim() || undefined });
      reset();
      onCreated(data.data?.customer);
    } catch (err) {
      const normalized = normalizeApiError(err);
      setError(normalized.message);
      setFieldErrors(normalized.errors || {});
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    reset();
    onClose();
  }

  if (!open) return null;

  return (
    <Modal isOpen={open} title="Add New Customer" onClose={handleClose}>
      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 border border-red-100">{error}</div>}

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Customer Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            maxLength={150}
            autoFocus
            className="min-h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
          />
          {fieldErrors.name && <p className="mt-1 text-xs text-red-500">{fieldErrors.name[0]}</p>}
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Phone <span className="text-slate-400">(optional)</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="03xx-xxxxxxx"
            maxLength={30}
            className="min-h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
          />
          {fieldErrors.phone && <p className="mt-1 text-xs text-red-500">{fieldErrors.phone[0]}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Add Customer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default QuickAddCustomerDialog;
