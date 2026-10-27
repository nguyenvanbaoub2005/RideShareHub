import React, { createContext, useCallback, useContext, useState } from 'react';
import { authApi, clearToken, getToken, saveToken, type AuthResponse } from '../api/client';

interface Session {
  accessToken: string;
  role: AuthResponse['role'];
  companyId?: number; // stored after company registration lookup
}

interface AuthContextValue {
  session: Session | null;
  login: (email: string, password: string) => Promise<AuthResponse['role']>;
  logout: () => Promise<void>;
  setCompanyId: (id: number) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    const token = getToken();
    if (!token) return null;
    // Restore role stored in sessionStorage
    const role = sessionStorage.getItem('rsh_web_role') as AuthResponse['role'] | null;
    const companyId = sessionStorage.getItem('rsh_web_company_id');
    if (!role) return null;
    return { accessToken: token, role, companyId: companyId ? Number(companyId) : undefined };
  });

  const login = useCallback(async (email: string, password: string) => {
    const resp = await authApi.login(email, password);
    saveToken(resp.accessToken);
    sessionStorage.setItem('rsh_web_role', resp.role);
    setSession({ accessToken: resp.accessToken, role: resp.role });
    return resp.role;
  }, []);

  const logout = useCallback(async () => {
    const token = getToken();
    if (token) {
      try { await authApi.logout(token); } catch { /* ignore */ }
    }
    clearToken();
    sessionStorage.removeItem('rsh_web_role');
    sessionStorage.removeItem('rsh_web_company_id');
    setSession(null);
  }, []);

  const setCompanyId = useCallback((id: number) => {
    sessionStorage.setItem('rsh_web_company_id', String(id));
    setSession(prev => prev ? { ...prev, companyId: id } : prev);
  }, []);

  return (
    <AuthContext.Provider value={{ session, login, logout, setCompanyId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
