import { cleanup, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../App';
import * as client from '../api/client';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe('Company Management Pages (Drivers, Routes, Trips)', () => {
  beforeEach(() => {
    sessionStorage.setItem('rsh_web_access', 'mock-token');
    sessionStorage.setItem('rsh_web_role', 'TRANSPORT_COMPANY');
    sessionStorage.setItem('rsh_web_company_id', '1');
  });

  it('renders DriverListPage with driver items', async () => {
    vi.spyOn(client.driverApi, 'listDrivers').mockResolvedValueOnce([
      {
        id: 1,
        companyId: 1,
        fullName: 'Nguyễn Văn Tài',
        phone: '0901234567',
        licenseNumber: 'B2-999999',
        status: 'AVAILABLE',
        createdAt: new Date().toISOString(),
      },
    ]);

    render(
      <MemoryRouter initialEntries={['/company/drivers']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Danh sách tài xế')).toBeInTheDocument();
    expect(await screen.findByText('Nguyễn Văn Tài')).toBeInTheDocument();
    expect(screen.getByText('0901234567')).toBeInTheDocument();
  });

  it('renders RouteListPage with route items', async () => {
    vi.spyOn(client.routeApi, 'listRoutes').mockResolvedValueOnce([
      {
        id: 1,
        companyId: 1,
        name: 'Đà Nẵng - Huế',
        origin: 'Bến xe Đà Nẵng',
        destination: 'Bến xe Huế',
        estimatedMinutes: 120,
        baseFare: 150000,
        description: null,
        createdAt: new Date().toISOString(),
      },
    ]);

    render(
      <MemoryRouter initialEntries={['/company/routes']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Tuyến đường vận hành')).toBeInTheDocument();
    expect(await screen.findByText('Đà Nẵng - Huế')).toBeInTheDocument();
  });

  it('renders TripListPage with trips and publish button', async () => {
    vi.spyOn(client.tripApi, 'listTrips').mockResolvedValueOnce([
      {
        id: 1,
        routeId: 1,
        routeName: 'Đà Nẵng - Huế',
        origin: 'Đà Nẵng',
        destination: 'Huế',
        companyId: 1,
        companyName: 'Công ty vận tải miền Trung',
        vehicleId: 1,
        vehiclePlate: '43A-123.45',
        seatCapacity: 16,
        driverId: 1,
        driverName: 'Nguyễn Văn Tài',
        departureTime: new Date(Date.now() + 86400000).toISOString(),
        fare: 150000,
        note: null,
        status: 'DRAFT',
        createdAt: new Date().toISOString(),
      },
    ]);

    render(
      <MemoryRouter initialEntries={['/company/trips']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Quản lý chuyến xe (Trips)')).toBeInTheDocument();
    expect(await screen.findByText('43A-123.45')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /xuất bản/i })).toBeInTheDocument();
  });
});
