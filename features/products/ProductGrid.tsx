import React from 'react';

export function ProductGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border p-4 rounded bg-white shadow-sm">
          <h4 className="font-bold">Car Model #{i}</h4>
          <p className="text-sm text-gray-500">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
          <div className="mt-2 text-blue-600 font-semibold">$25,000</div>
        </div>
      ))}
    </div>
  );
}
