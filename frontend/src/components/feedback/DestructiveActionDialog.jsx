import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';

export default function DestructiveActionDialog({ dialog, onResolve }) {
  const [typedValue, setTypedValue] = useState('');
  
  if (!dialog) return null;

  const handleConfirm = (e) => {
    e.preventDefault();
    if (typedValue === dialog.requiredText) {
      onResolve(true);
    }
  };
  
  const handleCancel = () => onResolve(false);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
        onClick={handleCancel}
        aria-hidden="true"
      ></div>
      
      <form 
        onSubmit={handleConfirm}
        className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg"
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="modal-title"
      >
        <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
              <h3 className="text-lg font-semibold leading-6 text-gray-900" id="modal-title">
                {dialog.title}
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500 whitespace-pre-wrap">
                  {dialog.description}
                </p>
                <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800 border border-red-200">
                  <p>This action is <strong>irreversible</strong>.</p>
                  <p className="mt-1">
                    Please type <strong>{dialog.requiredText}</strong> to confirm.
                  </p>
                </div>
                <div className="mt-4">
                  <input
                    type="text"
                    value={typedValue}
                    onChange={(e) => setTypedValue(e.target.value)}
                    className="block w-full rounded-lg border-gray-300 py-2 px-3 text-gray-900 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm border outline-none"
                    placeholder={dialog.requiredText}
                    autoComplete="off"
                    autoFocus
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-3">
          <button
            type="submit"
            disabled={typedValue !== dialog.requiredText}
            className="inline-flex w-full justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            {dialog.confirmText || 'Permanently Delete'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="mt-3 inline-flex w-full justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
