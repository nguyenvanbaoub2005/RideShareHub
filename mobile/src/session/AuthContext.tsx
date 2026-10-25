/**
 * Auth context — provides session state and auth actions to the whole app.
 *
 * Usage:
 *   const { session, signIn, signOut, loading } = useAuth();
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import * as api from '../api/client';
import { clearSession, loadSession, saveSession, type Session } from './store';

interface AuthContextValue {
  /** null = not logged in, undefined = still loading */
  session: Session | null | undefined;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: 'PASSENGER' | 'TRANSPORT_COMPANY',
  ) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  // Restore persisted session on mount
  useEffect(() => {
    loadSession().then(setSession).catch(() => setSession(null));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const auth = await api.login(email, password);
      await saveSession(auth);
      setSession({ accessToken: auth.accessToken, refreshToken: auth.refreshToken, role: auth.role });
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      role: 'PASSENGER' | 'TRANSPORT_COMPANY',
    ) => {
      setLoading(true);
      try {
        const auth = await api.register(email, password, fullName, role);
        await saveSession(auth);
        setSession({ accessToken: auth.accessToken, refreshToken: auth.refreshToken, role: auth.role });
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      await api.logout(session.accessToken, session.refreshToken);
    } catch {
      // Even if server logout fails, clear local session
    } finally {
      await clearSession();
      setSession(null);
      setLoading(false);
    }
  }, [session]);

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
