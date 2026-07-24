"use client"

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FirebaseError } from 'firebase/app';
import { User, Lock, Eye, EyeOff, Apple } from "lucide-react";
import logo from "@/public/images/logo.png";
import { AuthService } from '@/services/auth.service';
import { useAuth } from '@/hooks/useAuth';
import { toast } from "react-toastify";
 
const initialState = {
  name: '',
  email: '',
  password: '',
};

export default function LoginPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [formState, setFormState] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const { name, email, password } = formState;

  const { setUser } = useAuth();
  const router = useRouter();
  const validateForm = () => {
    if (isSignup && name.trim().length < 4) {
      setError('Name must be at least 4 characters.');
      return false;
    }

    if (!email.trim()) {
      setError('Please enter your email address.');
      return false;
    }

    if (!email.trim().toLowerCase().endsWith('@gmail.com')) {
      setError('Please use a valid Gmail address ending with @gmail.com.');
      return false;
    }

    if (!password) {
      setError('Please enter your password.');
      return false;
    }

    if (
      password.length < 8 ||
      !/[a-zA-Z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      setError('Password must be at least 8 characters and include letters, numbers, and a special character.');
      return false;
    }

    return true;
  };
  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      const result = await AuthService.loginWithGoogle();
      setUser(result.user);
      console.log('Google Sign-In successful:', result.user);
      if (result.user.role === 'admin') {
        router.push('/dashboard');
        toast.success('Admin Login Successful', {
          position: 'top-right',
        });
      } else {
        router.push('/');
        toast.success('User Login Successful', {
          position: 'top-right',
        });
      }
     } catch (err: any) {
      console.error("Firebase Google Login Error:", error);
      console.error("Error Code:", err.code);
      console.error("Error Message:", err.message);

      setError(err.message);
      if (err instanceof FirebaseError) {
        setError('Unable to sign in with Google. Please try again.');

      } else {
        setError(err instanceof Error ? err.message : 'Unable to sign in with Google. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };




  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (isSignup) {
        const result = await AuthService.signup(name.trim(), email, password);
        setUser(result.user);
      } else {
        const result = await AuthService.login(email, password);
        setUser(result.user);
      }


      router.push('/dashboard');
    } catch (err) {
      if (err instanceof FirebaseError) {
        switch (err.code) {
          case 'auth/email-already-in-use':
            setError('This email is already registered. Please sign in or use another email.');
            break;
          case 'auth/invalid-email':
            setError('Please enter a valid email address.');
            break;
          case 'auth/wrong-password':
            setError('Incorrect password. Please try again.');
            break;
          case 'auth/user-not-found':
            setError('No account found with this email. Please sign up first.');
            break;
          case 'auth/weak-password':
            setError('Password should be at least 6 characters.');
            break;
          default:
            setError('Unable to authenticate. Please try again.');
        }
      } else {
        setError(err instanceof Error ? err.message : 'Unable to authenticate. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.25),transparent_40%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(239,68,68,0.20),transparent_35%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4 py-8 sm:px-6 md:px-10 lg:px-12 xl:px-16">
        <div className="grid w-full items-center gap-12 lg:grid-cols-2">
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
              {isSignup
                ? 'Register an account to save listings, manage your garage, and connect with verified dealers.'
                : 'Sign in to access your garage, manage inventory, and connect with verified dealers across Pakistan.'}
            </p>
          </section>

          <section className="order-1 mx-auto w-full max-w-md lg:order-2 lg:max-w-lg">
            <div className="rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl sm:p-8 lg:p-10">
              <div className="mb-8 flex items-center gap-4">
                <Image
                  src={logo}
                  alt="logo"
                  width={55}
                  height={55}
                  className="rounded-full border border-white/10 bg-slate-800 p-1"
                />

                <div>
                  <h2 className="text-2xl font-bold">
                    {isSignup ? 'Create Account' : 'Welcome Back'}
                  </h2>
                  <p className="text-sm text-slate-400">
                    {isSignup ? 'Register to join CarHub.' : 'Login to continue'}
                  </p>
                </div>
              </div>

              <div className="mb-8 grid grid-cols-2 text-center text-sm font-semibold uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => setIsSignup(false)}
                  className={`py-3 transition ${isSignup ? 'border-b border-white/10 text-slate-400 hover:text-white' : 'border-b-4 border-red-600 text-white'}`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setIsSignup(true)}
                  className={`py-3 transition ${isSignup ? 'border-b-4 border-red-600 text-white' : 'border-b border-white/10 text-slate-400 hover:text-white'}`}
                >
                  Sign Up
                </button>
              </div>

              {error && (
                <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <form className="space-y-5" onSubmit={handleSubmit}>
                {isSignup && (
                  <div>
                    <label className="mb-2 block text-sm">Name</label>
                    <div className="flex items-center rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition focus-within:border-red-500">
                      <User className="mr-3 h-5 w-5 text-slate-400" />
                      <input
                        value={name}
                        onChange={(event) => setFormState({ ...formState, name: event.target.value })}
                        type="text"
                        placeholder="John Doe"
                        className="w-full bg-transparent outline-none placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-sm">Email Address</label>
                  <div className="flex items-center rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition focus-within:border-red-500">
                    <User className="mr-3 h-5 w-5 text-slate-400" />
                    <input
                      value={email}
                      onChange={(event) => setFormState({ ...formState, email: event.target.value })}
                      type="email"
                      placeholder="racer@carhub.com"
                      className="w-full bg-transparent outline-none placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm">Password</label>
                  <div className="flex items-center rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition focus-within:border-red-500">
                    <Lock className="mr-3 h-5 w-5 text-slate-400" />
                    <input
                      value={password}
                      onChange={(event) => setFormState({ ...formState, password: event.target.value })}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter Password"
                      className="w-full bg-transparent outline-none placeholder:text-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="ml-3 rounded-full p-1 text-slate-400 transition hover:text-white"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  {!isSignup && (
                    <Link href="/forgot-password" className="text-sm text-red-400 hover:text-red-300">
                      Forgot Password?
                    </Link>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-red-600 py-4 text-sm font-bold uppercase tracking-wider transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Processing...' : isSignup ? 'Sign Up' : 'Sign In'}
                </button>
              </form>

              <div className="my-8 flex items-center gap-4">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs uppercase tracking-widest text-slate-500">Continue With</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-950 py-3 font-medium transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {/* <Google className="h-5 w-5" /> */}
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

