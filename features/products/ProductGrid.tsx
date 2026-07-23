import React from 'react';

const products = [
  {
    name: 'Falcon Evo X',
    description: 'Sporty sedan with state-of-the-art performance and luxury touches.',
    price: '$42,500',
    badge: 'New Arrival',
  },
  {
    name: 'Summit Ranger',
    description: 'Rugged pickup built for tough terrain and premium comfort.',
    price: '$38,900',
    badge: 'Best Seller',
  },
  {
    name: 'Aurora GT',
    description: 'Electric coupe with fast charging, long range, and driver-first design.',
    price: '$55,200',
    badge: 'Electric',
  },
  {
    name: 'Grand Tourer',
    description: 'Luxury cruiser with advanced safety, refined cabin, and strong performance.',
    price: '$68,900',
    badge: 'Luxury',
  },
  {
    name: 'Urban Glide',
    description: 'Compact city hatchback designed for agile urban driving and premium tech.',
    price: '$24,700',
    badge: 'Popular',
  },
  {
    name: 'Trailblazer X',
    description: 'Adventure-ready SUV with excellent handling and premium interior comfort.',
    price: '$46,300',
    badge: 'Off-Road',
  },
];

export function ProductGrid() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => (
        <article key={product.name} className="group overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/90 p-6 shadow-2xl transition hover:-translate-y-1 hover:border-red-500/50">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-red-400">{product.badge}</p>
              <h3 className="mt-4 text-xl font-bold text-white">{product.name}</h3>
            </div>
            <div className="rounded-2xl bg-slate-950/70 px-3 py-2 text-sm text-slate-300">In stock</div>
          </div>

          <p className="mt-5 text-sm leading-6 text-slate-300">{product.description}</p>

          <div className="mt-6 flex items-center justify-between gap-4">
            <span className="text-lg font-semibold text-white">{product.price}</span>
            <button className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-red-500">
              View
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
