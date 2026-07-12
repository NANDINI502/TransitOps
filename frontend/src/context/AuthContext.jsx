import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { authApi, setTokenGetter, ApiError } from '../api/client';

const AuthContext = createContext(null);

const REMEMBER_KEY = 'transitops:remember';

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    setTokenGetter(async () => {
      if (!auth?.currentUser) return null;
      try {
        return await auth.currentUser.getIdToken();
      } catch {
        return null;
      }
    });
  }, []);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const me = await authApi.me();
          setProfile(me);
        } catch (err) {
          console.warn('GET /auth/me failed, using fallback profile', err);
          setProfile({
            uid: user.uid,
            email: user.email,
            name: user.email?.split('@')[0] || 'User',
            role: null,
          });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = useCallback(async (email, password, rememberMe) => {
    setAuthError(null);
    if (!auth) {
      const msg = 'Firebase is not configured. Set VITE_FIREBASE_* env vars.';
      setAuthError(msg);
      throw new Error(msg);
    }
    try {
      if (rememberMe) localStorage.setItem(REMEMBER_KEY, '1');
      else localStorage.removeItem(REMEMBER_KEY);
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdToken();
      try {
        const me = await authApi.me();
        setProfile(me);
      } catch (err) {
        setProfile({
          uid: cred.user.uid,
          email: cred.user.email,
          name: cred.user.email?.split('@')[0] || 'User',
          role: null,
        });
      }
      return token;
    } catch (err) {
      const msg = friendlyFirebaseError(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  }, []);

  const logout = useCallback(async () => {
    if (auth) await firebaseSignOut(auth);
    setProfile(null);
    setFirebaseUser(null);
  }, []);

  const value = useMemo(
    () => ({
      firebaseUser,
      profile,
      role: profile?.role || null,
      loading,
      authError,
      setAuthError,
      isAuthenticated: !!firebaseUser,
      login,
      logout,
    }),
    [firebaseUser, profile, loading, authError, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function friendlyFirebaseError(err) {
  const code = err?.code || '';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'Invalid email or password. Please try again.';
  }
  if (code.includes('too-many-requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (code.includes('network-request-failed')) {
    return 'Network error — check your connection and try again.';
  }
  if (code.includes('invalid-api-key') || code.includes('api-key-not-valid')) {
    return 'Firebase is not configured correctly. Check VITE_FIREBASE_* env vars.';
  }
  return err?.message || 'Sign in failed. Please try again.';
}

export { ApiError };
