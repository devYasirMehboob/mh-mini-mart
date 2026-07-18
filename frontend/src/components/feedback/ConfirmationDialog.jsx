import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Info, AlertCircle } from 'lucide-react';

const icons = {
  danger: <AlertCircle className="h-6 w-6 text-red-600" />,
  warning: <AlertTriangle className="h-6 w-6 text-amber-600" />,
  info: <Info className="h-6 w-6 text-blue-600" />
};

const tones = {
  danger: {
    iconBg: 'bg-red-100',
    button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white'
  },
  warning: {
    iconBg: 'bg-amber-100',
    button: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 text-white'
  },
  info: {
    iconBg: 'bg-blue-100',
    button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white'
  }
};

export default function ConfirmationDialog({ dialog, onResolve }) {
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    // Focus the confirm button on mount for accessibility, 
    // unless it's a danger action where we might want to focus cancel.
    if (confirmBtnRef.current && dialog?.tone !== 'danger') {
      confirmBtnRef.current.focus();
    }
  }, [dialog?.tone]);

  if (!dialog) return null;

  const toneConfig = tones[dialog.tone] || tones.info;
  const Icon = icons[dialog.tone] || icons.info;

  const handleConfirm = () => onResolve(true);
  const handleCancel = () => onResolve(false);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
        onClick={handleCancel}
        aria-hidden="true"
      ></div>
      
      <div 
        className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg"
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="modal-title"
      >
        <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
          <div className="sm:flex sm:items-start">
            <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10 ${toneConfig.iconBg}`}>
              {Icon}
            </div>
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
              <h3 className="text-lg font-semibold leading-6 text-gray-900" id="modal-title">
                {dialog.title}
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500 whitespace-pre-wrap">
                  {dialog.description}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-3">
          <button
            type="button"
            ref={confirmBtnRef}
            onClick={handleConfirm}
            className={`inline-flex w-full justify-center rounded-lg px-4 py-2 text-sm font-semibold shadow-sm sm:w-auto focus:outline-none focus:ring-2 focus:ring-offset-2 ${toneConfig.button}`}
          >
            {dialog.confirmText || 'Confirm'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            autoFocus={dialog.tone === 'danger'}
            className="mt-3 inline-flex w-full justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
          >
            {dialog.cancelText || 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
