"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { FiShoppingCart } from "react-icons/fi";
import logo from "@/public/images/logo.png";
import { useAuth } from '@/hooks/useAuth';
import { AuthService } from '@/services/auth.service';
import { CartButton } from '@/features/cart/CartButton';

export function Header() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { user, setUser } = useAuth();
  const admin = user?.role === 'admin';
  const handleLogout = async () => {
    await AuthService.logout();
    setUser(null);
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <Image
            src={logo}
            alt="CarShop"
            width={45}
            height={45}
            className="rounded-full border-2 border-slate-200 p-[2px]"
          />

          <div className="hidden sm:block">
            <h2 className="text-xl font-bold text-slate-200">
              CarShop
            </h2>

            <p className="text-xs text-slate-400">
              Cars & Spare Parts
            </p>
          </div>
        </Link>

        {/* Desktop Menu */}
        <nav className="hidden items-center gap-2 lg:flex">

          <Link
            href="/"
            className="rounded-full px-4 py-2 text-slate-200 transition hover:bg-slate-800 hover:text-white"
          >
            Home
          </Link>

          <Link
            href="/products"
            className="rounded-full px-4 py-2 text-slate-200 transition hover:bg-slate-800 hover:text-white"
          >
            Product
          </Link>

          <Link
            href="/about"
            className="rounded-full px-4 py-2 text-slate-200 transition hover:bg-slate-800 hover:text-white"
          >
            About
          </Link>

          <Link
            href="/contact"
            className="rounded-full px-4 py-2 text-slate-200 transition hover:bg-slate-800 hover:text-white"
          >
            Contact
          </Link>

          {/* Only worth showing once there is an account to hang orders off. */}
          {user && (
            <Link
              href="/orderStausAndHistory"
              className="rounded-full px-4 py-2 text-slate-200 transition hover:bg-slate-800 hover:text-white"
            >
              My Orders
            </Link>
          )}

          <CartButton />

           {admin && (
            <Link
              href="/users"
              className="rounded-full bg-[#4CBDAD] px-5 py-2 text-white transition hover:bg-[#71d4c7]/90"
            >
              Admin Dashboard
            </Link>
          )}
          {user ? (
            <>
               
              <button
                onClick={handleLogout}
                className="rounded-full border border-blue-500 px-5 py-2 text-blue-400 transition hover:bg-blue-500 hover:text-white"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-blue-500 px-5 py-2 text-blue-400 transition hover:bg-blue-500 hover:text-white"
            >
              Login
            </Link>
          )}

          
        </nav>

        {/* Mobile: cart stays reachable without opening the menu */}
        <div className="flex items-center gap-1 lg:hidden">
          <CartButton />

          <button
            onClick={() => setOpen(!open)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="rounded-lg p-2 text-white"
          >
            {open ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="border-t border-white/10 bg-slate-950 lg:hidden">
          <nav className="flex flex-col px-6 py-5">

            <Link
              href="/"
              className="rounded-lg px-4 py-3 text-white hover:bg-slate-800"
              onClick={() => setOpen(false)}
            >
              Home
            </Link>

            <Link
              href="/products"
              className="rounded-lg px-4 py-3 text-white hover:bg-slate-800"
              onClick={() => setOpen(false)}
            >
              Products
            </Link>

            <Link
              href="/about"
              className="rounded-lg px-4 py-3 text-white hover:bg-slate-800"
              onClick={() => setOpen(false)}
            >
              About
            </Link>

            <Link
              href="/contact"
              className="rounded-lg px-4 py-3 text-white hover:bg-slate-800"
              onClick={() => setOpen(false)}
            >
              Contact
            </Link>

            {user && (
              <Link
                href="/orderStausAndHistory"
                className="rounded-lg px-4 py-3 text-white hover:bg-slate-800"
                onClick={() => setOpen(false)}
              >
                My Orders
              </Link>
            )}

            <Link
              href="/cart"
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-white hover:bg-slate-800"
              onClick={() => setOpen(false)}
            >
              <FiShoppingCart size={18} />
              Cart
            </Link>

            <hr className="my-4 border-white/10" />

            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-lg bg-blue-600 px-4 py-3 text-center text-white"
                  onClick={() => setOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    setOpen(false);
                    handleLogout();
                  }}
                  className="mt-3 rounded-lg border border-blue-500 px-4 py-3 text-center text-blue-400 hover:bg-blue-500 hover:text-white"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-lg border border-blue-500 px-4 py-3 text-center text-blue-400"
                onClick={() => setOpen(false)}
              >
                Login
              </Link>
            )}

            {admin && (
              <Link
                href="/admin"
                className="mt-3 rounded-lg bg-violet-600 px-4 py-3 text-center text-white"
                onClick={() => setOpen(false)}
              >
                Admin Dashboard
              </Link>
            )}

          </nav>
        </div>
      )}
    </header>
  );
}
