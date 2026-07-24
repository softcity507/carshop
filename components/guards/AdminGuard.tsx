"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthReady } = useAuth();

  useEffect(() => {
    if (isAuthReady && user?.role !== 'admin') {
      router.replace('/login');
    }
  }, [isAuthReady, router, user?.role]);

  if (!isAuthReady || user?.role !== 'admin') {
    return null;
  }

  return <>{children}</>;
}
