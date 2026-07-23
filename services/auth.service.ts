import { AuthUser } from '@/types/auth';
import { auth } from '@/firebase/firebase';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  setPersistence,
  updateProfile,
  GoogleAuthProvider,
} from 'firebase/auth';

const USER_KEY = 'carhub_user';
const TOKEN_KEY = 'carhub_token';

function storeSession(authUser: AuthUser, token: string) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(USER_KEY, JSON.stringify(authUser));
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(authUser));
    localStorage.setItem(TOKEN_KEY, token);
  }
}

function clearSession() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }
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

    storeSession(authUser, token);

    return { success: true, user: authUser, token };
  },

  async loginWithGoogle() {
    await setPersistence(auth, browserLocalPersistence);
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);

    const token = await userCredential.user.getIdToken();
    const authUser: AuthUser = {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      displayName: userCredential.user.displayName,
      role: 'user',
    };

    storeSession(authUser, token);

    return { success: true, user: authUser, token };
  },

  async logout() {
    await signOut(auth);
    clearSession();
    return { success: true };
  },
};
