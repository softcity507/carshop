"use client"

import React, { useState } from "react";  
import Image from "next/image";
import Link from "next/link";
import { User, Lock, Apple } from "lucide-react";
import logo from "@/public/images/logo.png";

export default function LoginPage() {
  const [isSignup, setIsSignup] = useState(false);

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.25),_transparent_40%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(239,68,68,0.20),_transparent_35%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4 py-8 sm:px-6 md:px-10 lg:px-12 xl:px-16">
        <div className="grid w-full items-center gap-12 lg:grid-cols-2">
          {/* LEFT */}
          <section className="order-2 text-center lg:order-1 lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300 sm:text-sm">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Pakistan's Smart Car Marketplace
            </div>

            <p className="mt-8 text-xs uppercase tracking-[0.4em] text-slate-400 sm:text-sm">
              CarHub
            </p>

            <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl md:text-6xl xl:text-7xl">
              Precision
              <br />
              Performance
              <br />
              Systems
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg lg:mx-0">
              Sign in to access your garage, manage inventory,
              and connect with verified dealers across Pakistan.
            </p>
          </section>

          {/* RIGHT */}
          <section className="order-1 mx-auto w-full max-w-md lg:order-2 lg:max-w-lg">
            <div className="rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl sm:p-8 lg:p-10">
              {/* Header */}
              <div className="mb-8 flex items-center gap-4">
                <Image
                  src={logo}
                  alt="logo"
                  width={55}
                  height={55}
                  className="rounded-full border border-white/10 bg-slate-800 p-1"
                />

                <div>
                  <h2 className="text-2xl font-bold">Welcome Back</h2>
                  <p className="text-sm text-slate-400">
                    Login to continue
                  </p>
                </div>
              </div>

              {/* Tabs */}
                <div className="mb-8 grid grid-cols-2 text-center text-sm font-semibold uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => setIsSignup(false)}
                  className={`py-3 transition ${isSignup ? "border-b border-white/10 text-slate-400 hover:text-white" : "border-b-4 border-red-600 text-white"}`}
                >
                  Login
                </button>

                <button
                  type="button"
                  onClick={() => setIsSignup(true)}
                  className={`py-3 transition ${isSignup ? "border-b-4 border-red-600 text-white" : "border-b border-white/10 text-slate-400 hover:text-white"}`}
                >
                  Sign Up
                </button>
              </div>

              {/* FORM */}
              <form className="space-y-5">
                {isSignup && (
                  <div>
                    <label className="mb-2 block text-sm">
                      Name
                    </label>

                    <div className="flex items-center rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition focus-within:border-red-500">
                      <User className="mr-3 h-5 w-5 text-slate-400" />

                      <input
                        type="text"
                        placeholder="John Doe"
                        className="w-full bg-transparent outline-none placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="mb-2 block text-sm">
                    Email Address
                  </label>

                  <div className="flex items-center rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition focus-within:border-red-500">
                    <User className="mr-3 h-5 w-5 text-slate-400" />

                    <input
                      type="email"
                      placeholder="racer@carhub.com"
                      className="w-full bg-transparent outline-none placeholder:text-slate-500"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="mb-2 block text-sm">
                    Password
                  </label>

                  <div className="flex items-center rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition focus-within:border-red-500">
                    <Lock className="mr-3 h-5 w-5 text-slate-400" />

                    <input
                      type="password"
                      placeholder="Enter Password"
                      className="w-full bg-transparent outline-none placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  {!isSignup && (
                    <Link
                      href="/forgot-password"
                      className="text-sm text-red-400 hover:text-red-300"
                    >
                      Forgot Password?
                    </Link>
                  )}
                </div>

                <button className="w-full rounded-2xl bg-red-600 py-4 text-sm font-bold uppercase tracking-wider transition hover:bg-red-500">
                  {isSignup ? "Sign Up" : "Sign In"}
                </button>
              </form>

              {/* Divider */}
              <div className="my-8 flex items-center gap-4">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs uppercase tracking-widest text-slate-500">
                  Continue With
                </span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              {/* Social */}
              <div className="grid gap-4 sm:grid-cols-2">
                <button className="rounded-2xl border border-white/10 bg-slate-950 py-3 font-medium transition hover:bg-slate-800">
                  Google
                </button>

                <button className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-950 py-3 font-medium transition hover:bg-slate-800">
                  <Apple className="h-5 w-5" />
                  Apple
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}