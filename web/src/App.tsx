import React from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { LoginPage } from './auth/LoginPage';
import { AdminCompanyListPage } from './admin/AdminCompanyListPage';
import { AdminCompanyDetailPage } from './admin/AdminCompanyDetailPage';
import { CompanyProfilePage } from './company/CompanyProfilePage';
import { VehicleListPage } from './company/VehicleListPage';
import { VehicleFormPage } from './company/VehicleFormPage';
import { DriverListPage } from './company/DriverListPage';
import { DriverFormPage } from './company/DriverFormPage';
import { RouteListPage } from './company/RouteListPage';
import { RouteFormPage } from './company/RouteFormPage';
import { TripListPage } from './company/TripListPage';
import { TripFormPage } from './company/TripFormPage';

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
          <Route path="/company/drivers" element={<DriverListPage />} />
          <Route path="/company/drivers/new" element={<DriverFormPage />} />
          <Route path="/company/drivers/:driverId/edit" element={<DriverFormPage />} />
          <Route path="/company/routes" element={<RouteListPage />} />
          <Route path="/company/routes/new" element={<RouteFormPage />} />
          <Route path="/company/routes/:routeId/edit" element={<RouteFormPage />} />
          <Route path="/company/trips" element={<TripListPage />} />
          <Route path="/company/trips/new" element={<TripFormPage />} />
          <Route path="/company/trips/:tripId/edit" element={<TripFormPage />} />
        </Route>

        <Route path="*" element={<DefaultRedirect />} />
      </Routes>
    </AuthProvider>
  );
}
