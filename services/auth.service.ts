import { AuthUser } from '@/types/auth';
import { auth } from '@/firebase/firebase';
import { db } from '@/firebase/firestore';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  setPersistence,
  updateProfile,
  getAdditionalUserInfo,
  GoogleAuthProvider,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { clearRecentActivity } from '@/lib/activityCookie';
import { invalidateAll } from '@/lib/dataCache';

const USER_KEY = 'carhub_user';
const TOKEN_KEY = 'carhub_token';

function storeSession(authUser: AuthUser, token: string) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(USER_KEY, JSON.stringify(authUser));
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(authUser));
    localStorage.setItem(TOKEN_KEY, token);
    // Whatever was cached belonged to whoever was here before, and an admin sees more than a
    // customer does — start the new session with nothing carried over.
    invalidateAll();
  }
}

function clearSession() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    // The cached activity trail belongs to the admin who just left, not to the machine.
    clearRecentActivity();
    invalidateAll();
  }
}

async function saveCarUser(
  uid: string,
  email: string | null,
  displayName: string | null,
  options?: { setCreatedAt?: boolean }
) {
  const userRef = doc(db, 'carUser', uid);
  const userData: Record<string, unknown> = {
    email,
    displayName,
    role: 'user',
    lastLogin: serverTimestamp(),
  };

  if (options?.setCreatedAt) {
    userData.createdAt = serverTimestamp();
  }

  await setDoc(userRef, userData, { merge: true });
}

export const AuthService = {
  async signup(name: string, email: string, password: string) {
    await setPersistence(auth, browserLocalPersistence);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (name.trim()) {
      await updateProfile(userCredential.user, { displayName: name.trim() });
    }

    const token = await userCredential.user.getIdToken();
    const authUser: AuthUser = {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      displayName: userCredential.user.displayName,
      role: 'user',
    };

    await saveCarUser(
      authUser.uid,
      authUser.email,
      authUser.displayName ?? name.trim(),
      { setCreatedAt: true }
    );

    storeSession(authUser, token);

    return { success: true, user: authUser, token };
  },

  async login(email: string, password: string) {
    await setPersistence(auth, browserLocalPersistence);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    const token = await userCredential.user.getIdToken();
    const authUser: AuthUser = {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      displayName: userCredential.user.displayName,
      role: 'user',
    };

    const userRef = doc(db, 'carUser', authUser.uid);
    const userSnapshot = await getDoc(userRef);

    if (userSnapshot.exists()) {
      const data = userSnapshot.data();
      authUser.role = data.role === 'admin' ? 'admin' : 'user';
    } else {
      await saveCarUser(authUser.uid, authUser.email, authUser.displayName, { setCreatedAt: false });
    }

    storeSession(authUser, token);

    return { success: true, user: authUser, token };
  },

  async loginWithGoogle() {
    await setPersistence(auth, browserLocalPersistence);
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const additionalInfo = getAdditionalUserInfo(userCredential);
    const isNewGoogleUser = additionalInfo?.isNewUser ?? false;

    const token = await userCredential.user.getIdToken();
    const authUser: AuthUser = {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      displayName: userCredential.user.displayName,
      role: 'user',
    };

    const userRef = doc(db, 'carUser', authUser.uid);
    const userSnapshot = await getDoc(userRef);

    if (userSnapshot.exists()) {
      const data = userSnapshot.data();
      authUser.role = data.role === 'admin' ? 'admin' : 'user';
    } else {
      await saveCarUser(
        authUser.uid,
        authUser.email,
        authUser.displayName,
        { setCreatedAt: isNewGoogleUser }
      );
    }

    storeSession(authUser, token);

    return { success: true, user: authUser, token };
  },

  async logout() {
    await signOut(auth);
    clearSession();
    return { success: true };
  },
};
