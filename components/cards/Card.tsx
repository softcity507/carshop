import React from 'react';

export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm">
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <div>{children}</div>
    </div>
  );
}
