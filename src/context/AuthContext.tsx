import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';

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
  // Store token strictly in memory per security guidelines
  const idTokenRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
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
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
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

    if (auth.currentUser) {
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

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }
    return data as T;
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
