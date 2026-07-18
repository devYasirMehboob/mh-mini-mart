import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center text-gray-500">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
