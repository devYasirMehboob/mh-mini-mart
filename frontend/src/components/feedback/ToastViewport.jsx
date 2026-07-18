import React from 'react';
import ToastItem from './ToastItem';

export default function ToastViewport({ toasts, dismissToast, setHoverState }) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-0 z-[100] flex flex-col items-end px-4 py-6 sm:p-6 gap-2"
    >
      <div className="flex w-full flex-col items-center space-y-4 sm:items-end mt-12 sm:mt-0">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={dismissToast}
            onMouseEnter={(id) => setHoverState(id, true)}
            onMouseLeave={(id) => setHoverState(id, false)}
          />
        ))}
      </div>
    </div>
  );
}
