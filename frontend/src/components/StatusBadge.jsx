function StatusBadge({ status }) {
  const isActive = status === "active";

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
        isActive
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
          : "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
      ].join(" ")}
    >
      <span className={"size-1.5 rounded-full " + (isActive ? "bg-emerald-500" : "bg-slate-400")} />
      {status}
    </span>
  );
}

export default StatusBadge;
