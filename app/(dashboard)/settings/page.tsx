import React from 'react';
import { ActivityLog } from '@/features/settings/ActivityLog';
import { StoreSettingsForm } from '@/features/settings/StoreSettingsForm';

export default function DashboardSettingsPage() {
  return (
    <div>
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle mb-8">
        Store details, checkout rules and the running log of what happens day to day.
      </p>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] xl:items-start">
        <StoreSettingsForm />
        <ActivityLog />
      </div>
    </div>
  );
}
