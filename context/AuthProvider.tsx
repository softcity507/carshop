'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/firebase';
import { AuthUser } from '@/types/auth';

interface AuthContextType {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextType>({ user: null, setUser: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedUser = window.sessionStorage.getItem('carhub_user') || window.localStorage.getItem('carhub_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const authUser: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          role: 'user',
        };

        const token = await firebaseUser.getIdToken();
        window.sessionStorage.setItem('carhub_user', JSON.stringify(authUser));
        window.sessionStorage.setItem('carhub_token', token);
        window.localStorage.setItem('carhub_user', JSON.stringify(authUser));
        window.localStorage.setItem('carhub_token', token);
        setUser(authUser);
      } else {
        window.sessionStorage.removeItem('carhub_user');
        window.sessionStorage.removeItem('carhub_token');
        window.localStorage.removeItem('carhub_user');
        window.localStorage.removeItem('carhub_token');
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);
