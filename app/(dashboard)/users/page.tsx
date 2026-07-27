import React from 'react';
import { UserList } from '@/features/users/UserList';

export default function DashboardUsersPage() {
  return (
    <div>
      <h1 className="page-title">User Management</h1>
      <p className="page-subtitle mb-8">Manage registered accounts, roles and permissions.</p>
      <UserList />
    </div>
  );
}
