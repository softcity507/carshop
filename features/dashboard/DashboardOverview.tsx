import React from 'react';

export function DashboardOverview() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded">
        <h4 className="text-sm font-semibold text-blue-800">Total Sales</h4>
        <p className="text-2xl font-bold text-blue-900">$120,450</p>
      </div>
      <div className="p-4 bg-green-50 border border-green-200 rounded">
        <h4 className="text-sm font-semibold text-green-800">Orders</h4>
        <p className="text-2xl font-bold text-green-900">1,240</p>
      </div>
      <div className="p-4 bg-purple-50 border border-purple-200 rounded">
        <h4 className="text-sm font-semibold text-purple-800">Users</h4>
        <p className="text-2xl font-bold text-purple-900">850</p>
      </div>
      <div className="p-4 bg-amber-50 border border-amber-200 rounded">
        <h4 className="text-sm font-semibold text-amber-800">Products</h4>
        <p className="text-2xl font-bold text-amber-900">45</p>
      </div>
    </div>
  );
}
