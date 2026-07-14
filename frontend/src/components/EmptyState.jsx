import Icon from "./Icon";

function EmptyState({ icon = "products", title, description, actionLabel, onAction }) {
  return (
    <div className="grid min-h-64 place-items-center p-8 text-center">
      <div>
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
          <Icon name={icon} className="size-5" />
        </span>
        <h3 className="mt-4 text-sm font-bold text-slate-800">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
        {actionLabel && (
          <button className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700" type="button" onClick={onAction}>
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default EmptyState;


