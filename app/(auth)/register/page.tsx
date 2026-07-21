import React from 'react';
import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-center">Create Account</h2>
      <p className="text-sm text-gray-500 mb-4 text-center">Lorem ipsum dolor sit amet, register to get started.</p>
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Full Name</label>
          <input type="text" className="w-full border p-2 rounded mt-1" placeholder="John Doe" />
        </div>
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input type="email" className="w-full border p-2 rounded mt-1" placeholder="user@example.com" />
        </div>
        <div>
          <label className="block text-sm font-medium">Password</label>
          <input type="password" className="w-full border p-2 rounded mt-1" placeholder="••••••••" />
        </div>
        <button type="button" className="w-full bg-blue-600 text-white p-2 rounded">Register</button>
      </form>
      <div className="mt-4 text-center text-sm">
        <span>Already have an account? </span>
        <Link href="/login" className="text-blue-600 hover:underline">Log in</Link>
      </div>
    </div>
  );
}
