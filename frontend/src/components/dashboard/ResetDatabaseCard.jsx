import { useState } from "react";
import Icon from "../Icon";
import { resetDatabase } from "../../api/systemApi";
import useAlert from "../../hooks/useAlert";

export default function ResetDatabaseCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const alert = useAlert();

  const handleReset = async (e) => {
    e.preventDefault();
    if (!password) {
      setError("Please enter your admin password.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await resetDatabase(password);
      alert.success("Database has been completely reset.");
      setIsOpen(false);
      setPassword("");
      // Reload page to clear all states
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset database.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <section className="premium-surface rounded-xl border-l-4 border-l-red-500 p-5 sm:p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
              <Icon name="trash" className="size-5 text-red-500" />
              Reset Database
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Permanently delete all sales, products, expenses, and inventory data. This action cannot be undone.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="shrink-0 rounded-lg bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100 focus:outline-none focus:ring-4 focus:ring-red-100"
          >
            Clear Data
          </button>
        </div>
      </section>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="bg-red-50 p-6 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-100">
                <Icon name="warning" className="size-6 text-red-600" />
              </div>
              <h3 className="mt-4 text-lg font-extrabold text-red-900">Clear All Data</h3>
              <p className="mt-2 text-sm text-red-700">
                Are you absolutely sure? This will delete all products, categories, stock, sales, and history. Your login will be preserved.
              </p>
            </div>
            
            <form onSubmit={handleReset} className="p-6">
              {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}
              
              <label className="block text-sm font-bold text-slate-700">
                Admin Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password to confirm"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-50"
                autoFocus
              />

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !password}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Deleting..." : "Permanently Delete Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
