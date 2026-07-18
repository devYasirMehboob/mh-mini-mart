import React from 'react';

export default function InlineError({ error }) {
  if (!error) return null;

  // Handle arrays (e.g. ['Name is required']) or direct strings
  const message = Array.isArray(error) ? error[0] : error;

  return (
    <p className="mt-1.5 text-sm font-medium text-red-600 animate-in fade-in slide-in-from-top-1">
      {message}
    </p>
  );
}
