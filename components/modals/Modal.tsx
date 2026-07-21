import React from 'react';

export function Modal({ isOpen, title, children, onClose }: { isOpen: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-xl font-bold mb-4">{title}</h3>
        {children}
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-200 rounded text-sm">Close</button>
      </div>
    </div>
  );
}
