import React, { useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info, Loader2 } from 'lucide-react';

const icons = {
  success: <CheckCircle className="h-5 w-5 text-emerald-500" />,
  error: <AlertCircle className="h-5 w-5 text-red-500" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  info: <Info className="h-5 w-5 text-blue-500" />,
  loading: <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
};

const tones = {
  success: 'bg-white border-emerald-200 text-emerald-800',
  error: 'bg-white border-red-200 text-red-800',
  warning: 'bg-white border-amber-200 text-amber-800',
  info: 'bg-white border-blue-200 text-blue-800',
  loading: 'bg-white border-blue-200 text-blue-800'
};

export default function ToastItem({ toast, onDismiss, onMouseEnter, onMouseLeave }) {
  useEffect(() => {
    if (toast.type === 'loading') return;
    
    let duration = toast.duration;
    if (!duration) {
      if (toast.type === 'success') duration = 4000;
      else if (toast.type === 'info') duration = 4000;
      else if (toast.type === 'warning') duration = 6000;
      else if (toast.type === 'error') duration = 8000;
    }

    if (toast.isHovered) return;

    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <div
      onMouseEnter={() => onMouseEnter(toast.id)}
      onMouseLeave={() => onMouseLeave(toast.id)}
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-4 shadow-lg transition-all ${tones[toast.type] || tones.info}`}
      role={toast.type === 'error' ? 'alert' : 'status'}
    >
      <div className="flex-shrink-0 mt-0.5">
        {icons[toast.type] || icons.info}
      </div>
      <div className="flex-1 pt-0.5">
        <p className="text-sm font-medium">{toast.message}</p>
        {toast.action && (
          <div className="mt-2">
            <button
              onClick={() => {
                toast.action.onClick();
                if (toast.action.dismissOnClick !== false) {
                  onDismiss(toast.id);
                }
              }}
              className="text-xs font-bold hover:underline"
            >
              {toast.action.label}
            </button>
          </div>
        )}
      </div>
      {toast.type !== 'loading' && (
        <div className="flex-shrink-0 flex">
          <button
            onClick={() => onDismiss(toast.id)}
            className="inline-flex rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none"
          >
            <span className="sr-only">Close</span>
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
