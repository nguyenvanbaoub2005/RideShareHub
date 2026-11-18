import React, { createContext, useCallback, useContext, useState } from 'react';
import {
  authApi,
  clearToken,
  companyApi,
  getToken,
  saveToken,
  type AuthResponse,
} from '../api/client';

interface Session {
  accessToken: string;
  role: AuthResponse['role'];
  companyId?: number;
  companyName?: string;
  companyApproved?: boolean;
}

interface AuthContextValue {
  session: Session | null;
  login: (email: string, password: string) => Promise<AuthResponse['role']>;
  establishSession: (resp: AuthResponse) => Promise<void>;
  logout: () => Promise<void>;
  setCompanyId: (id: number) => void;
  setCompanyMeta: (id: number, name: string, approved: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    const token = getToken();
    if (!token) return null;
    const role = sessionStorage.getItem('rsh_web_role') as AuthResponse['role'] | null;
    const companyId = sessionStorage.getItem('rsh_web_company_id');
    const companyName = sessionStorage.getItem('rsh_web_company_name') ?? undefined;
    const approvedRaw = sessionStorage.getItem('rsh_web_company_approved');
    if (!role) return null;
    return {
      accessToken: token,
      role,
      companyId: companyId ? Number(companyId) : undefined,
      companyName,
      companyApproved: approvedRaw === 'true',
    };
  });

  const setCompanyMeta = useCallback((id: number, name: string, approved: boolean) => {
    sessionStorage.setItem('rsh_web_company_id', String(id));
    sessionStorage.setItem('rsh_web_company_name', name);
    sessionStorage.setItem('rsh_web_company_approved', String(approved));
    setSession(prev =>
      prev ? { ...prev, companyId: id, companyName: name, companyApproved: approved } : prev,
    );
  }, []);

  const setCompanyId = useCallback((id: number) => {
    sessionStorage.setItem('rsh_web_company_id', String(id));
    setSession(prev => (prev ? { ...prev, companyId: id } : prev));
  }, []);

  const establishSession = useCallback(
    async (resp: AuthResponse) => {
      saveToken(resp.accessToken);
      sessionStorage.setItem('rsh_web_role', resp.role);
      sessionStorage.removeItem('rsh_web_company_id');
      sessionStorage.removeItem('rsh_web_company_name');
      sessionStorage.removeItem('rsh_web_company_approved');

      let resolvedCompanyId: number | undefined;
      let resolvedCompanyName: string | undefined;
      let resolvedApproved = false;

      if (resp.role === 'TRANSPORT_COMPANY') {
        try {
          const company = await companyApi.getMyCompanyProfile();
          resolvedCompanyId = company.id;
          resolvedCompanyName = company.name;
          resolvedApproved = company.status === 'APPROVED';
          sessionStorage.setItem('rsh_web_company_id', String(company.id));
          sessionStorage.setItem('rsh_web_company_name', company.name);
          sessionStorage.setItem('rsh_web_company_approved', String(resolvedApproved));
        } catch {
          // 404 when company registration has not been submitted yet; CompanyProfilePage handles onboarding.
        }
      }

      setSession({
        accessToken: resp.accessToken,
        role: resp.role,
        companyId: resolvedCompanyId,
        companyName: resolvedCompanyName,
        companyApproved: resolvedApproved,
      });
    },
    [],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const resp = await authApi.login(email, password);
      await establishSession(resp);
      return resp.role;
    },
    [establishSession],
  );

  const logout = useCallback(async () => {
    const token = getToken();
    if (token) {
      try {
        await authApi.logout(token);
      } catch {
        // Ignore server error when clearing local session
      }
    }
    clearToken();
    sessionStorage.removeItem('rsh_web_role');
    sessionStorage.removeItem('rsh_web_company_id');
    sessionStorage.removeItem('rsh_web_company_name');
    sessionStorage.removeItem('rsh_web_company_approved');
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ session, login, establishSession, logout, setCompanyId, setCompanyMeta }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
