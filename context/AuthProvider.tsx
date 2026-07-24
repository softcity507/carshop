'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/firebase';
import { db } from '@/firebase/firestore';
import { AuthUser } from '@/types/auth';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: AuthUser | null;
  isAuthReady: boolean;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextType>({ user: null, isAuthReady: false, setUser: () => {} });

function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;

  const storedUser = window.sessionStorage.getItem('carhub_user') || window.localStorage.getItem('carhub_user');
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const profileSnapshot = await getDoc(doc(db, 'carUser', firebaseUser.uid));
          const profile = profileSnapshot.exists() ? profileSnapshot.data() : null;
          const authUser: AuthUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            role: profile?.role === 'admin' ? 'admin' : 'user',
          };

          const token = await firebaseUser.getIdToken();
          if (!active) return;

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
      } finally {
        if (active) {
          setIsAuthReady(true);
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthReady, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);
