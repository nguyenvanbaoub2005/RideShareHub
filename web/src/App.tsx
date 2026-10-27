import React from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { LoginPage } from './auth/LoginPage';
import { AdminCompanyListPage } from './admin/AdminCompanyListPage';
import { AdminCompanyDetailPage } from './admin/AdminCompanyDetailPage';
import { CompanyProfilePage } from './company/CompanyProfilePage';
import { VehicleListPage } from './company/VehicleListPage';
import { VehicleFormPage } from './company/VehicleFormPage';

/** Redirects unauthenticated to /login */
function RequireAdmin() {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (session.role !== 'ADMIN') return <Navigate to="/company/profile" replace />;
  return <Outlet />;
}

function RequireCompany() {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (session.role !== 'TRANSPORT_COMPANY') return <Navigate to="/admin/companies" replace />;
  return <Outlet />;
}

function DefaultRedirect() {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (session.role === 'ADMIN') return <Navigate to="/admin/companies" replace />;
  return <Navigate to="/company/profile" replace />;
}

/**
 * App is Router-agnostic — BrowserRouter lives in main.tsx,
 * MemoryRouter lives in tests. This allows both to work correctly.
 */
export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<RequireAdmin />}>
          <Route path="/admin/companies" element={<AdminCompanyListPage />} />
          <Route path="/admin/companies/:companyId" element={<AdminCompanyDetailPage />} />
        </Route>

        <Route element={<RequireCompany />}>
          <Route path="/company/profile" element={<CompanyProfilePage />} />
          <Route path="/company/vehicles" element={<VehicleListPage />} />
          <Route path="/company/vehicles/new" element={<VehicleFormPage />} />
          <Route path="/company/vehicles/:vehicleId/edit" element={<VehicleFormPage />} />
        </Route>

        <Route path="*" element={<DefaultRedirect />} />
      </Routes>
    </AuthProvider>
  );
}
