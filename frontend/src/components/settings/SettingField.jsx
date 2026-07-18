import InlineError from "../feedback/InlineError";

function SettingField({ field, value, error, onChange, disabled }) {
  const [key, label, type, options] = field;
  const id = `setting-${key}`;
  if (type === "toggle") {
    return (
      <label
        htmlFor={id}
        className="flex min-h-[72px] cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 transition-colors hover:bg-slate-100/70"
      >
        <span className="flex flex-col gap-1">
          <strong className="text-[13px] font-bold text-slate-900">
            {label}
          </strong>
          {error && <InlineError error={error} />}
        </span>
        <input
          id={id}
          type="checkbox"
          checked={Boolean(value)}
          disabled={disabled}
          onChange={(e) => onChange(key, e.target.checked)}
          className="size-5 rounded border-slate-300 text-blue-600 transition focus:ring-blue-500 disabled:opacity-50"
        />
      </label>
    );
  }
  const base =
    "min-h-12 w-full rounded-xl border bg-slate-50 px-4 text-[13px] font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50 hover:bg-white hover:border-slate-300";
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="ml-1 text-[11px] font-extrabold uppercase tracking-widest text-slate-500">
        {label}
      </span>
      {type === "textarea" ? (
        <textarea
          id={id}
          rows="3"
          value={value ?? ""}
          disabled={disabled}
          onChange={(e) => onChange(key, e.target.value)}
          className={`${base} py-3 ${
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
              : "border-slate-200"
          }`}
        />
      ) : type === "select" ? (
        <select
          id={id}
          value={value ?? ""}
          disabled={disabled}
          onChange={(e) => onChange(key, e.target.value)}
          className={`${base} ${
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
              : "border-slate-200"
          }`}
        >
          {options.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type={type}
          step={type === "number" ? "any" : undefined}
          value={value ?? ""}
          disabled={disabled}
          onChange={(e) => onChange(key, e.target.value)}
          className={`${base} ${
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
              : "border-slate-200"
          }`}
        />
      )}
      {error && <InlineError error={error} />}
    </label>
  );
}
export default SettingField;
