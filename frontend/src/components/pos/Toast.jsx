import { useEffect } from "react";
function Toast({ toast, onClose }) {
  useEffect(() => { if (!toast) return undefined; const timer = window.setTimeout(onClose, 2800); return () => window.clearTimeout(timer); }, [toast, onClose]);
  if (!toast) return null;
  const tone = toast.type === "error" ? "border-red-200 bg-red-50 text-red-700" : toast.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-blue-200 bg-blue-50 text-blue-700";
  return <div className={`fixed right-5 top-20 z-[70] max-w-sm rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg ${tone}`} role="status">{toast.message}</div>;
}
export default Toast;
