import SettingField from "./SettingField";

function SettingsSectionForm({ section, values, errors, onChange, disabled }) {
  const featureOff = values?.enabled === false;
  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
      <header className="border-b border-slate-100 pb-6">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-extrabold tracking-tight text-slate-900">
            {section.label}
          </h3>
          {section.private && (
            <span className="rounded-md bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700 ring-1 ring-inset ring-amber-600/20">
              Admin private
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-slate-500">{section.description}</p>
      </header>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {section.fields.map((field) => (
          <SettingField
            key={field[0]}
            field={field}
            value={values?.[field[0]]}
            error={errors[`${section.key}.${field[0]}`]?.[0]}
            onChange={onChange}
            disabled={disabled || (featureOff && field[0] !== "enabled")}
          />
        ))}
      </div>
      {section.key === "printer" && values?.printing_method === "qz" && (
        <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm">
          <strong>Note:</strong> QZ Tray is not installed by this project.
          Browser printing remains the working fallback; no test success will be
          simulated.
        </p>
      )}
      {section.key === "backups" && (
        <p className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800 shadow-sm">
          <strong>Note:</strong> These preferences are stored for the Backups
          module. This page does not run or schedule backups.
        </p>
      )}
    </section>
  );
}

export default SettingsSectionForm;
