import React from 'react';

export default function DashboardSettingsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <p className="text-gray-600 mb-6">Lorem ipsum dolor sit amet, configure application settings.</p>
      <div className="bg-white p-6 border rounded space-y-4 max-w-xl">
        <div>
          <label className="block text-sm font-medium">Store Name</label>
          <input type="text" defaultValue="CarShop Auto Dealership" className="w-full border p-2 rounded mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium">Support Email</label>
          <input type="email" defaultValue="support@carshop.example" className="w-full border p-2 rounded mt-1" />
        </div>
        <button type="button" className="bg-blue-600 text-white px-4 py-2 rounded">Save Changes</button>
      </div>
    </div>
  );
}
