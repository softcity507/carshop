import React from 'react';

export default function DashboardSettingsPage() {
  return (
    <div>
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle mb-8">Configure store details and support contacts.</p>

      <div className="card max-w-xl space-y-5 p-6">
        <label className="block space-y-2">
          <span className="field-label">Store Name</span>
          <input type="text" defaultValue="CarShop Auto Dealership" className="field-input" />
        </label>

        <label className="block space-y-2">
          <span className="field-label">Support Email</span>
          <input type="email" defaultValue="support@carshop.example" className="field-input" />
        </label>

        <button type="button" className="btn-primary">
          Save Changes
        </button>
      </div>
    </div>
  );
}
