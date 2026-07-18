import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const icons = {
  success: <CheckCircle className="h-5 w-5 text-emerald-500" />,
  error: <AlertCircle className="h-5 w-5 text-red-500" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  info: <Info className="h-5 w-5 text-blue-500" />
};

const tones = {
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  error: 'bg-red-50 text-red-800 border-red-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200'
};

export default function AlertBanner({ type = 'info', message, title }) {
  if (!message && !title) return null;

  return (
    <div className={`rounded-xl border p-4 ${tones[type] || tones.info}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {icons[type] || icons.info}
        </div>
        <div className="flex-1">
          {title && <h3 className="text-sm font-semibold mb-1">{title}</h3>}
          <p className="text-sm">{message}</p>
        </div>
      </div>
    </div>
  );
}
