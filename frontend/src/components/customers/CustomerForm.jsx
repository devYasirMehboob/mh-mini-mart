import { useState } from "react";
import { createCustomer, updateCustomer } from "../../api/customersApi";
import normalizeApiError from "../../utils/normalizeApiError";
import Modal from "../Modal";

function CustomerForm({ open, onClose, onSuccess, initial = null }) {
  const editing = Boolean(initial?.id);

  const blank = {
    name: "", phone: "", email: "", address: "", notes: "",
    customer_type: "regular", khata_enabled: false, credit_limit: "0",
  };

  const [form, setForm] = useState(initial ? {
    name: initial.name || "",
    phone: initial.phone || "",
    email: initial.email || "",
    address: initial.address || "",
    notes: initial.notes || "",
    customer_type: initial.customer_type || "regular",
    khata_enabled: Boolean(Number(initial.khata_enabled)),
    credit_limit: initial.credit_limit || "0",
  } : blank);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true); setError(""); setFieldErrors({});
    try {
      const payload = { ...form, khata_enabled: form.khata_enabled ? 1 : 0 };
      let res;
      if (editing) {
        res = await updateCustomer(initial.id, payload);
      } else {
        res = await createCustomer(payload);
      }
      onSuccess(res.data?.customer, res.message);
      onClose();
    } catch (err) {
      const norm = normalizeApiError(err);
      setError(norm.message);
      setFieldErrors(norm.errors || {});
    } finally {
      setSubmitting(false);
    }
  }

  const field = "min-h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50";
  const label = "mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500";

  return (
    <Modal isOpen={open} title={editing ? "Edit Customer" : "New Customer"} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 border border-red-100">{error}</div>}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Name <span className="text-red-500">*</span></label>
            <input name="name" value={form.name} onChange={handleChange} maxLength={150} autoFocus className={field} placeholder="Customer name" />
            {fieldErrors.name && <p className="mt-1 text-xs text-red-500">{fieldErrors.name[0]}</p>}
          </div>
          <div>
            <label className={label}>Phone</label>
            <input name="phone" value={form.phone} onChange={handleChange} maxLength={30} type="tel" className={field} placeholder="03xx-xxxxxxx" />
            {fieldErrors.phone && <p className="mt-1 text-xs text-red-500">{fieldErrors.phone[0]}</p>}
          </div>
          <div>
            <label className={label}>Email</label>
            <input name="email" value={form.email} onChange={handleChange} maxLength={150} type="email" className={field} placeholder="customer@example.com" />
            {fieldErrors.email && <p className="mt-1 text-xs text-red-500">{fieldErrors.email[0]}</p>}
          </div>
          <div>
            <label className={label}>Customer Type</label>
            <select name="customer_type" value={form.customer_type} onChange={handleChange} className={field}>
              <option value="regular">Regular</option>
              <option value="walk_in_khata">Walk-in Khata</option>
            </select>
          </div>
        </div>

        <div>
          <label className={label}>Address</label>
          <input name="address" value={form.address} onChange={handleChange} maxLength={500} className={field} placeholder="Optional address" />
        </div>

        <div>
          <label className={label}>Notes</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} maxLength={1000} rows={2} className={`${field} py-2`} placeholder="Any notes about this customer" />
        </div>

        {/* Khata Settings */}
        <div className="rounded-xl border border-slate-200 p-4 space-y-3">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-600">Khata / Credit Settings</p>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" name="khata_enabled" checked={form.khata_enabled} onChange={handleChange} className="rounded border-slate-300 text-blue-600 focus:ring-blue-400" />
            <span className="text-sm text-slate-700">Enable Khata / Credit Sales</span>
          </label>

          {form.khata_enabled && (
            <div>
              <label className={label}>Credit Limit (Rs.) — 0 = No limit</label>
              <input
                name="credit_limit" type="number" min="0" step="1"
                value={form.credit_limit} onChange={handleChange}
                className={field} placeholder="0"
              />
              {fieldErrors.credit_limit && <p className="mt-1 text-xs text-red-500">{fieldErrors.credit_limit[0]}</p>}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} disabled={submitting} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
            {submitting ? "Saving..." : editing ? "Update Customer" : "Create Customer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default CustomerForm;
