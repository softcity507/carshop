import React from 'react';

const stats = [
  { label: 'Total Sales', value: '$120,450' },
  { label: 'Orders', value: '1,240' },
  { label: 'Users', value: '850' },
  { label: 'Products', value: '45' },
];

export function DashboardOverview() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="card p-5">
          <h4 className="field-label">{stat.label}</h4>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-heading">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
