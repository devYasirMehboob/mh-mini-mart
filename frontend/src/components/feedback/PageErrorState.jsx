import React from 'react';
import { ServerCrash, AlertCircle, RefreshCw } from 'lucide-react';

export default function PageErrorState({ error, onRetry }) {
  const isNetwork = error?.type === 'network';
  
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
        {isNetwork ? <ServerCrash className="h-8 w-8" /> : <AlertCircle className="h-8 w-8" />}
      </div>
      <h2 className="mb-2 text-xl font-bold text-gray-900">
        {isNetwork ? 'Connection Error' : 'Something went wrong'}
      </h2>
      <p className="mb-6 max-w-md text-sm text-gray-500">
        {error?.message || 'An unexpected error occurred while loading this page.'}
      </p>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      )}
    </div>
  );
}
