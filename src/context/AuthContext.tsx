import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { handleStaticApiFallback } from '../utils/staticFallbackStore';

interface AuthContextValue {
  firebaseUser: User | null;
  authLoading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  apiFetch: <T = any>(path: string, options?: RequestInit) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const idTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }
    try {
      const unsubscribe = onAuthStateChanged(
        auth,
        async (user) => {
          setFirebaseUser(user);
          if (user) {
            try {
              idTokenRef.current = await user.getIdToken();
            } catch (err) {
              console.error('Failed to retrieve ID token:', err);
              idTokenRef.current = null;
            }
          } else {
            idTokenRef.current = null;
          }
          setAuthLoading(false);
        },
        () => {
          setAuthLoading(false);
        }
      );
      return () => unsubscribe();
    } catch {
      setAuthLoading(false);
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    if (!auth) {
      setAuthError('Google Sign-In is not available on this static host.');
      return;
    }
    try {
      const credential = await signInWithPopup(auth, googleAuthProvider);
      idTokenRef.current = await credential.user.getIdToken();
      setFirebaseUser(credential.user);
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      setAuthError(err?.message || 'Google Sign-In could not be completed.');
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthError(null);
    if (!auth) return;
    try {
      await signOut(auth);
      idTokenRef.current = null;
      setFirebaseUser(null);
    } catch (err: any) {
      console.error('Sign-out error:', err);
    }
  }, []);

  const apiFetch = useCallback(async <T = any>(path: string, options: RequestInit = {}): Promise<T> => {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');

    try {
      if (auth && auth.currentUser) {
        const freshToken = await auth.currentUser.getIdToken();
        idTokenRef.current = freshToken;
        headers.set('Authorization', `Bearer ${freshToken}`);
      } else if (idTokenRef.current) {
        headers.set('Authorization', `Bearer ${idTokenRef.current}`);
      } else {
        headers.set('X-Workspace-Mode', 'demo-workspace');
      }

      const response = await fetch(path, {
        ...options,
        headers,
      });

      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');

      // If hosted on static GitHub Pages where /api/* returns 404/405 or HTML, seamlessly use static store
      if (response.status === 404 || response.status === 405 || !isJson) {
        return handleStaticApiFallback(path, options) as T;
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }
      return data as T;
    } catch (err: any) {
      // If network fetch fails on static deployment (GitHub Pages), use client-side fallback
      if (
        err instanceof TypeError ||
        String(err?.message || '').includes('Failed to fetch') ||
        String(err?.message || '').includes('NetworkError')
      ) {
        return handleStaticApiFallback(path, options) as T;
      }
      throw err;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        authLoading,
        authError,
        signInWithGoogle,
        logout,
        apiFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
