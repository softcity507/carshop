"use client";
import Link from 'next/link';
import Image from "next/image";
import {
   Car,
  Wrench,
  
} from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background Blur */}
      <div className="absolute left-0 top-0 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-orange-500/20 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 py-20 lg:py-28">
        <div className="grid items-center gap-16 lg:grid-cols-2">

          {/* LEFT */}
          <div>

            <span className="inline-flex items-center rounded-full border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm text-blue-300">
              🚗 Pakistan's Smart Car Marketplace
            </span>

            <h1 className="mt-6 text-5xl font-extrabold leading-tight text-[#1B1E2E] lg:text-7xl">
              Buy Cars &
              <span className="block text-blue-400">
                Genuine Spare Parts
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-[#535B84]">
              Purchase brand-new and used vehicles, shop genuine spare
              parts, compare prices, and enjoy secure online shopping with
              trusted dealers across Pakistan.
            </p>

             

            {/* Buttons */}
            <div className="mt-8 flex flex-wrap gap-4">

              <Link href="/products" className="rounded-xl bg-blue-600 px-8 py-4 font-semibold text-white hover:bg-blue-700">
                Browse Cars
              </Link>

              <button className="rounded-xl border border-white/30 px-8 py-4 font-semibold text-white hover:bg-white hover:text-black">
                Shop Spare Parts
              </button>

            </div>

            {/* Stats */}
            <div className="mt-14 grid grid-cols-2 gap-6 md:grid-cols-4">

              <div>
                <h3 className="text-3xl font-bold text-[#1B1E2E]">20K+</h3>
                <p className="text-[#535B84]">Cars Listed</p>
              </div>

              <div>
                <h3 className="text-3xl font-bold text-[#1B1E2E]">50K+</h3>
                <p className="text-[#535B84]">Spare Parts</p>
              </div>

              <div>
                <h3 className="text-3xl font-bold text-[#1B1E2E]">500+</h3>
                <p className="text-[#535B84]">Dealers</p>
              </div>

              <div>
                <h3 className="text-3xl font-bold text-[#1B1E2E]">24/7</h3>
                <p className="text-[#535B84]">Support</p>
              </div>

            </div>
          </div>

          {/* RIGHT */}
          <div className="relative">

            <Image
              src="/images/hero-car.jpeg"
              alt="Car"
              width={800}
              height={650}
              priority
              className="mx-auto rounded-3xl object-cover shadow-2xl"
            />

            {/* Floating Card */}
            <div className="absolute  left-0 top-10 hidden md:block rounded-2xl bg-white p-3 m-2 shadow-2xl ">
              <div className="flex items-center gap-3 ">
                <Car className="text-blue-600" />
                <div>
                  <h4 className="font-bold">500+ Dealers</h4>
                  <p className="text-sm text-gray-500">
                    Verified Sellers
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute bottom-10 right-0 hidden md:block rounded-2xl bg-white p-3 m-2 shadow-2xl">
              <div className="flex items-center gap-3">
                <Wrench className="text-orange-500" />
                <div>
                  <h4 className="font-bold">Original Parts</h4>
                  <p className="text-sm text-gray-500">
                    100% Genuine Products
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}