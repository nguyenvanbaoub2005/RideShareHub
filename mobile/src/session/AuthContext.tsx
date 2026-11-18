/**
 * Auth context — provides session state and auth actions to the whole app.
 *
 * Automatically refreshes expired access tokens using the persisted refresh token
 * and clears the session back to /login if refresh is rejected or missing.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
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
    phone?: string,
  ) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const sessionRef = useRef<Session | null | undefined>(undefined);
  sessionRef.current = session;
  const refreshInFlightRef = useRef<Promise<string | null> | null>(null);

  const expireSession = useCallback(async () => {
    await clearSession();
    sessionRef.current = null;
    setSession(null);
  }, []);

  const tryRefreshToken = useCallback(async (): Promise<string | null> => {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const current = sessionRef.current ?? (await loadSession());
    if (!current?.refreshToken) {
      return null;
    }

    const promise = (async () => {
      try {
        const refreshed = await api.refreshTokens(current.refreshToken);
        await saveSession(refreshed);
        const next: Session = {
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          role: refreshed.role,
        };
        sessionRef.current = next;
        setSession(next);
        return refreshed.accessToken;
      } catch {
        return null;
      } finally {
        refreshInFlightRef.current = null;
      }
    })();

    refreshInFlightRef.current = promise;
    return promise;
  }, []);

  // Register handlers synchronously before any child route mounts
  api.configureSessionHandlers({
    tryRefreshToken,
    onSessionExpired: expireSession,
  });

  // Restore persisted session on mount
  useEffect(() => {
    loadSession()
      .then(s => {
        sessionRef.current = s;
        setSession(s);
      })
      .catch(() => {
        sessionRef.current = null;
        setSession(null);
      });
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const auth = await api.login(email, password);
      await saveSession(auth);
      const next: Session = {
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken,
        role: auth.role,
      };
      sessionRef.current = next;
      setSession(next);
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
      phone?: string,
    ) => {
      setLoading(true);
      try {
        const auth = await api.register(email, password, fullName, role, phone);
        await saveSession(auth);
        const next: Session = {
          accessToken: auth.accessToken,
          refreshToken: auth.refreshToken,
          role: auth.role,
        };
        sessionRef.current = next;
        setSession(next);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) {
      await expireSession();
      return;
    }
    setLoading(true);
    try {
      await api.logout(current.accessToken, current.refreshToken);
    } catch {
      // Even if server logout fails, clear local session
    } finally {
      await expireSession();
      setLoading(false);
    }
  }, [expireSession]);

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
