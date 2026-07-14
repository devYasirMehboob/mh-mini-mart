function AlertMessage({ type = "error", message, onDismiss }) {
  if (!message) return null;

  const styles = type === "success"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-red-200 bg-red-50 text-red-700";

  return (
    <div className={"flex items-center justify-between gap-4 rounded-xl border px-4 py-3 text-sm " + styles} role={type === "success" ? "status" : "alert"}>
      <span>{message}</span>
      <button type="button" className="font-bold opacity-70 hover:opacity-100" onClick={onDismiss} aria-label="Dismiss">&times;</button>
    </div>
  );
}

export default AlertMessage;

