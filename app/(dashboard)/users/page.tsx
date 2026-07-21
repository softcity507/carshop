import React from 'react';
import { UserList } from '@/features/users/UserList';

export default function DashboardUsersPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">User Management</h1>
      <p className="text-gray-600 mb-6">Lorem ipsum dolor sit amet, manage registered user accounts and permissions.</p>
      <UserList />
    </div>
  );
}
