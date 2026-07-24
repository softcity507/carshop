"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface StoredUser {
  role?: string;
}

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedUser = window.sessionStorage.getItem('carhub_user');

    if (!storedUser) {
      router.replace('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser) as StoredUser;

      if (parsedUser.role !== 'admin') {
        router.replace('/login');
        return;
      }

      setReady(true);
    } catch {
      router.replace('/login');
    }
  }, [router]);

  if (!ready) {
    return null;
  }

  return <>{children}</>;
}
