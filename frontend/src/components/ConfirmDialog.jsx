import Modal from "./Modal";

function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Delete",
  isConfirming = false,
  onCancel,
  onConfirm,
}) {
  return (
    <Modal
      isOpen={isOpen}
      title={title}
      description={message}
      onClose={isConfirming ? () => {} : onCancel}
      size="sm"
    >
      <div className="flex justify-end gap-3 px-6 py-5">
        <button
          className="min-h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          type="button"
          disabled={isConfirming}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="min-h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          disabled={isConfirming}
          onClick={onConfirm}
        >
          {isConfirming ? "Deleting..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
