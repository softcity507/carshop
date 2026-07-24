import React from 'react';
import { Footer } from '@/components/layout/Footer';
import type { ProductCard } from '@/features/products/ProductGrid';

const catalogProducts: ProductCard[] = [
  {
    name: 'Velocity GT-8',
    description: 'Series X | 2024 Production',
    price: '$89,500',
    badge: 'High Performance',
    specs: ['Mid-Size', '4.0L V8 Twin Turbo'],
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAGEKDBKcp4mbA1r3gpSii78cDLvLm4HvUuM73GTd1G81r_bPgy_jgTKHz0QF25n-fB72ZizBe86HAClslfa3PwGYrOz6ehy38MjYVwHcsDuQhcX5Z5EbeYcGn6BJyiWYYDf0hDT279vOs3VB5w-IsMZmg2ESkEdb11W3lmO9YXk4pxSgqkAPCHCb3v5gRQyNMOH1bURc7z8xznfMZE_o5VCjgtGSg_wTJImz7n-NF5bwbllnjjWe3lXkvW4s_D_NPoYLwIYSJ_cB_1',
  },
  {
    name: 'Nebula eV-X',
    description: 'Eco-Performance | 2024',
    price: '$112,000',
    badge: 'Full Electric',
    specs: ['Full-Size SUV', 'Dual Electric Motors'],
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOIWbetc8hxK9MI0__C29ySWSDshfpRZN8Dko5gsifCGgNixE09q4vu7UBvfD7e08gtCyQNjyIjpvwcAnD3iom1HqfsCHn2iNXYe9NtvqJ5uE_hBXnXiubW-o7-LHzClgoHXJkZ-6LDdnKvDbRRVWyhm_hprerJdsnArDf-5VjgQIDm7y5yK3vNjeljS29QSrcVLXq9bML-zxNPN6EMQMKWScyh1cO-Jkt_2Atu1zY2jMtig4Y0ACpCrhEHvgD8iU9mReEj1Oue27Y',
  },
  {
    name: 'Pinnacle S-6',
    description: 'Elite Trim | 2024 Production',
    price: '$74,900',
    badge: 'Limited Edition',
    specs: ['Compact', '3.0L Inline 6 Turbo'],
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAuEVqjqB8yVNxF-t85euOhSn5iJtB07XgeOf_yK3ci6cdLp4AOMoN0lIEq2VFG9Hpup0m-NfDV7ZdxgSsP9I04XcG-KmHUkFz38wQtsOe76QX7cOjCBUp_Cj7OEQTGsrKQqdvuCItesc31n4wvzokhtZFY2TOaw7ZbuuvyQDAs-ErhwObsHt-d58x7vCOOuV0n2s8XMWJYA2SIzV_dm_fOtv6s2J84VuOPeYSN_FzMjbXU23F0Y5QkiQjJLikmfN-MEkEixVVkJ94s',
  },
  {
    name: 'Shadow Black Ops',
    description: 'Limited Production | 2024',
    price: '$145,000',
    badge: 'Luxury',
    specs: ['Full-Size', 'V12 Biturbo'],
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC2dlN_b4430Iuwz4-LPnh89xgh2GiVDw7K4gC--viXFgU0ddAvnavRbR15O7VCqwqhesaTFu-Uxwq4dw_L7LJQcL3n2024bpGAINY1ICSJSj9iEfDL1gZDCoUWewoUOrM9aOUUaGxwtzYK3WlHHM19RTgLZLDu7wUsjEy4ydWXr4XlWLZGRE5cheWRfTfRgGwUyK39e4XKr13MdPb_nsccfWIqBn3Mw7TtAxTGTUAjFheSlbhxTOoO3Dm3_q3mJ-fZLcFOQYUsYK9z',
  },
];

const filters: Array<{ label: string; options: string[] }> = [
  { label: 'Body Style', options: ['All Styles', 'Sedan', 'SUV', 'Coupe', 'Performance'] },
  { label: 'Price Range', options: ['Any Price', '$30k - $60k', '$60k - $100k', '$100k+'] },
  { label: 'Model Year', options: ['Latest', '2024', '2023', 'Classic'] },
];

export default function ProductsPage() {
  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#191c1d]">
      <main className="mx-auto w-full max-w-screen-2xl px-4 py-8 sm:px-8 lg:px-16 lg:pb-20">
        <section className="mb-12 max-w-3xl">
          <h1 className="text-4xl font-extrabold uppercase tracking-tight text-[#031636] sm:text-5xl">Vehicle Catalog</h1>
          <p className="mt-3 text-base leading-7 text-[#44474e]">Precision-engineered performance. Explore our curated selection of elite vehicles, from track-ready coupes to luxury SUVs.</p>
        </section>

        <section className="mb-12 rounded-xl bg-[#1a2b4c] p-6 shadow-lg">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-4 md:items-end">
            {filters.map(({ label, options }) => (
              <label key={label} className="block text-xs font-semibold uppercase tracking-[0.08em] text-[#b6c6f0]">
                {label}
                <select className="mt-2 w-full rounded-lg border-0 bg-white px-4 py-3 text-sm font-medium normal-case tracking-normal text-[#031636] outline-none ring-2 ring-transparent transition focus:ring-[#e51d24]">
                  {options.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
            ))}
            <button className="rounded-lg bg-[#bb0014] px-8 py-3 text-xs font-bold uppercase tracking-[0.08em] text-white shadow-lg transition hover:bg-[#e51d24]">Filter Results →</button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {catalogProducts.map((product) => (
            <article key={product.name} className="group overflow-hidden rounded-xl border border-[#c5c6cf] bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="relative h-64 overflow-hidden bg-[#e1e3e4]">
                <div className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-110" style={{ backgroundImage: `url(${product.imageUrl})` }} />
                <span className="absolute left-4 top-4 rounded bg-[#bb0014] px-3 py-1 text-xs font-semibold uppercase tracking-[0.06em] text-white shadow-lg">{product.badge}</span>
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold uppercase tracking-tight text-[#031636]">{product.name}</h2>
                    <p className="mt-1 text-sm text-[#44474e]">{product.description}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-2xl font-bold tracking-tight text-[#bb0014]">{product.price}</p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#44474e]">Starting MSRP</p>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  {product.specs?.map((spec) => <span key={spec} className="rounded-full border border-[#c5c6cf] bg-[#edeeef] px-3 py-1.5 text-xs font-semibold text-[#031636]">{spec}</span>)}
                </div>
                <button className="mt-6 w-full rounded border-2 border-[#031636] py-3 text-xs font-bold uppercase tracking-[0.15em] text-[#031636] transition hover:bg-[#031636] hover:text-white">View Details</button>
              </div>
            </article>
          ))}
        </section>
      </main>

      <Footer />
    </div>
  );
}
