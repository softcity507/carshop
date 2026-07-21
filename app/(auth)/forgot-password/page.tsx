import React from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-center">Forgot Password</h2>
      <p className="text-sm text-gray-500 mb-4 text-center">Lorem ipsum dolor sit amet, enter your email to reset password.</p>
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Email Address</label>
          <input type="email" className="w-full border p-2 rounded mt-1" placeholder="user@example.com" />
        </div>
        <button type="button" className="w-full bg-blue-600 text-white p-2 rounded">Send Reset Link</button>
      </form>
      <div className="mt-4 text-center text-sm">
        <Link href="/login" className="text-blue-600 hover:underline">Back to Login</Link>
      </div>
    </div>
  );
}
