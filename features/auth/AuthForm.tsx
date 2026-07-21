import React from 'react';

export function AuthForm() {
  return (
    <form className="space-y-4 max-w-sm mx-auto p-6 bg-white border rounded shadow">
      <h2 className="text-xl font-bold">Authentication</h2>
      <p className="text-sm text-gray-600">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Access your account.</p>
      <div>
        <label className="block text-sm font-medium">Email</label>
        <input type="email" className="w-full border p-2 rounded" placeholder="email@example.com" />
      </div>
      <div>
        <label className="block text-sm font-medium">Password</label>
        <input type="password" className="w-full border p-2 rounded" placeholder="••••••••" />
      </div>
      <button type="button" className="w-full bg-blue-600 text-white p-2 rounded">Submit</button>
    </form>
  );
}
