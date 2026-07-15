function SettingsSaveBar({ dirty, busy, onReset, onSave }) {
  return (
    <div className="sticky bottom-6 z-10 mt-6 flex flex-col gap-4 rounded-2xl border border-slate-200/60 bg-white/95 p-4 shadow-xl shadow-slate-200/50 backdrop-blur-md sm:flex-row sm:items-center">
      <p className="flex-1 px-2 text-[13px] font-medium text-slate-500">
        {dirty
          ? "You have unsaved changes in this section."
          : "This section is up to date."}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          disabled={!dirty || busy}
          onClick={onReset}
          className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-5 text-[13px] font-bold text-slate-600 transition hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40"
        >
          Reset
        </button>
        <button
          type="button"
          disabled={!dirty || busy}
          onClick={onSave}
          className="min-h-[44px] rounded-xl bg-blue-600 px-6 text-[13px] font-bold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 hover:shadow-md hover:shadow-blue-500/30 disabled:opacity-40"
        >
          {busy ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );
}
export default SettingsSaveBar;
