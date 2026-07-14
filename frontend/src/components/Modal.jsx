import { useEffect } from "react";

function Modal({ isOpen, title, description, onClose, children, size = "md" }) {
  useEffect(() => {
    if (!isOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClass = size === "sm" ? "max-w-md" : size === "lg" ? "max-w-4xl" : "max-w-xl";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/35 backdrop-blur-[2px] p-4">
      <button
        className="absolute inset-0 cursor-default"
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <section
        className={"relative z-10 w-full " + widthClass + " rounded-xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]"}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <header className="flex items-start gap-4 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0 flex-1">
            <h2 id="modal-title" className="text-lg font-bold text-slate-900">{title}</h2>
            {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>
          <button
            className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            type="button"
            aria-label="Close"
            onClick={onClose}
          >
            <span className="text-xl leading-none" aria-hidden="true">&times;</span>
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export default Modal;

