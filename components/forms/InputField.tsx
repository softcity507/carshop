import React from 'react';

export function InputField({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div className="flex flex-col space-y-1 mb-4">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" {...props} />
    </div>
  );
}
