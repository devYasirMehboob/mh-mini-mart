import React from 'react';
import { PackageOpen } from 'lucide-react';

export default function EmptyState({ icon: Icon = PackageOpen, title = 'No data found', message = 'There are no records to display.', action }) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="mb-1 text-lg font-medium text-gray-900">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-gray-500">{message}</p>
      {action && (
        <div>{action}</div>
      )}
    </div>
  );
}
