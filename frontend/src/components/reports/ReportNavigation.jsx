import usePermissions from "../../hooks/usePermissions";
import { purchaseTypes, reportGroups } from "./reportConfig";
import Icon from "../Icon";

function ReportNavigation({ active, onChange }) {
  const { can } = usePermissions();
  const groups = reportGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        ([key]) => !purchaseTypes.has(key) || can("purchases.view"),
      ),
    }))
    .filter((group) => group.items.length);
  return (
    <aside className="no-scrollbar lg:sticky lg:top-[98px] lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto lg:pr-2">
      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.label}>
            <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onChange(key)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[13px] font-bold transition-all ${
                    active === key
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                  }`}
                >
                  {label}
                  {active === key && (
                    <Icon name="arrow" className="size-3 opacity-80" />
                  )}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}
export default ReportNavigation;
