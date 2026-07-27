import React from 'react';
import { ContactMessages } from '@/features/contact/ContactMessages';

export default function DashboardMessagesPage() {
  return (
    <div>
      <h1 className="page-title">Contact Messages</h1>
      <p className="page-subtitle mb-8">
        Enquiries sent from the contact page, with the sender&apos;s account and sign-in details.
      </p>
      <ContactMessages />
    </div>
  );
}
