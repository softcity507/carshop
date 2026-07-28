import React from 'react';
import { AdminProfile } from '@/features/dashboard/AdminProfile';
import { RecentActivity } from '@/features/dashboard/RecentActivity';

export default function DashboardProfilePage() {
  return (
    <div>
      <h1 className="page-title">My Profile</h1>
      <p className="page-subtitle mb-8">Your account and what you have been doing lately.</p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
        <AdminProfile />
        <RecentActivity />
      </div>
    </div>
  );
}
