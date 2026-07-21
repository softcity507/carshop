import React from 'react';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-center">Login</h2>
      <p className="text-sm text-gray-500 mb-4 text-center">Lorem ipsum dolor sit amet, sign in to your account.</p>
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input type="email" className="w-full border p-2 rounded mt-1" placeholder="user@example.com" />
        </div>
        <div>
          <label className="block text-sm font-medium">Password</label>
          <input type="password" className="w-full border p-2 rounded mt-1" placeholder="••••••••" />
        </div>
        <button type="button" className="w-full bg-blue-600 text-white p-2 rounded">Sign In</button>
      </form>
      <div className="mt-4 text-center text-sm">
        <Link href="/forgot-password" className="text-blue-600 hover:underline">Forgot password?</Link>
        <span className="mx-2">•</span>
        <Link href="/register" className="text-blue-600 hover:underline">Register</Link>
      </div>
    </div>
  );
}
