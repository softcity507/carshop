import React from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
       <main className="flex-1 max-w-4xl mx-auto p-6 md:p-12 w-full">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-extrabold uppercase tracking-tight text-[#031636] mb-6">
            About CarShop
          </h1>
          
          <p className="text-base text-gray-700 leading-relaxed mb-6">
            Welcome to <span className="font-semibold text-[#031636]">CarShop</span>, your ultimate digital destination for discovering, comparing, and acquiring premium vehicles. We bridge the gap between automotive passion and cutting-edge technology, ensuring a seamless and transparent purchasing experience from browse to driveway.
          </p>

          <h2 className="text-xl font-bold uppercase tracking-wide text-[#031636] mt-8 mb-4">
            Our Mission
          </h2>
          <p className="text-base text-gray-700 leading-relaxed mb-6">
            Our platform is engineered to remove the friction traditionally associated with car buying. By combining high-performance tools, verified specifications, and secure transaction workflows, we empower you to find the exact model that matches your lifestyle and performance expectations.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 pt-8 border-t border-gray-200">
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
              <h3 className="font-bold text-[#031636] uppercase tracking-wider text-sm mb-2">Verified Inventory</h3>
              <p className="text-xs text-gray-600">Every listing features rigorous spec tracking, transparent pricing, and comprehensive vehicle breakdowns.</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
              <h3 className="font-bold text-[#031636] uppercase tracking-wider text-sm mb-2">Modern Technology</h3>
              <p className="text-xs text-gray-600">Built using state-of-the-art web architecture to deliver lightning-fast response times and secure booking paths.</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
              <h3 className="font-bold text-[#031636] uppercase tracking-wider text-sm mb-2">Customer First</h3>
              <p className="text-xs text-gray-600">Dedicated support pathways and smooth regional currency integration tailored for your convenience.</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}