import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../App';
import * as client from '../api/client';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe('SP4-P2-02: Trip Monitoring & Incident Pages (Company & Admin)', () => {
  it('renders CompanyMonitoringPage with live GPS telemetry, stale flag, and incident resolution', async () => {
    sessionStorage.setItem('rsh_web_access', 'mock-company-token');
    sessionStorage.setItem('rsh_web_role', 'TRANSPORT_COMPANY');
    sessionStorage.setItem('rsh_web_company_id', '1');

    vi.spyOn(client.monitoringApi, 'listCompanyMonitoringTrips').mockResolvedValue([
      {
        tripId: 101,
        routeName: 'Đà Nẵng - Huế',
        origin: 'Đà Nẵng',
        destination: 'Huế',
        companyId: 1,
        companyName: 'Nhà Xe Hoàng Gia',
        driverName: 'Nguyễn Văn Hùng',
        driverPhone: '0905123456',
        vehiclePlate: '43A-888.88',
        vehicleType: 'Limousine 7 chỗ',
        departureTime: new Date().toISOString(),
        estimatedMinutes: 120,
        status: 'IN_PROGRESS',
        assignmentStatus: 'ACCEPTED',
        bookedSeats: 3,
        seatCapacity: 7,
        currentLat: 16.1234,
        currentLng: 108.1567,
        speedKmh: 42,
        locationUpdatedAt: new Date(Date.now() - 90_000).toISOString(),
        locationStale: true,
        completedStopsCount: 1,
        totalStopsCount: 2,
        nextStopAddress: '15 Hùng Vương, TP. Huế',
        nextStopType: 'DROPOFF',
        openIncidentsCount: 1,
        totalIncidentsCount: 1,
      },
    ]);

    vi.spyOn(client.monitoringApi, 'listCompanyIncidents').mockResolvedValue([
      {
        id: 55,
        tripId: 101,
        routeName: 'Đà Nẵng - Huế',
        origin: 'Đà Nẵng',
        destination: 'Huế',
        companyId: 1,
        companyName: 'Nhà Xe Hoàng Gia',
        vehiclePlate: '43A-888.88',
        driverId: 2,
        driverName: 'Nguyễn Văn Hùng',
        driverPhone: '0905123456',
        incidentType: 'HEAVY_TRAFFIC',
        incidentTypeLabel: 'Kẹt xe kéo dài',
        description: 'Ùn tắc tại đường dẫn hầm Hải Vân khoảng 15 phút',
        latitude: 16.1234,
        longitude: 108.1567,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
      },
    ]);

    vi.spyOn(client.monitoringApi, 'getTripLiveSnapshot').mockResolvedValue({
      eventType: 'SNAPSHOT',
      tripId: 101,
      routeName: 'Đà Nẵng - Huế',
      origin: 'Đà Nẵng',
      destination: 'Huế',
      departureTime: new Date().toISOString(),
      estimatedMinutes: 120,
      tripStatus: 'IN_PROGRESS',
      assignmentStatus: 'ACCEPTED',
      companyName: 'Nhà Xe Hoàng Gia',
      vehiclePlate: '43A-888.88',
      vehicleType: 'Limousine 7 chỗ',
      driverName: 'Nguyễn Văn Hùng',
      driverPhone: '0905123456',
      currentLat: 16.1234,
      currentLng: 108.1567,
      speedKmh: 42,
      locationUpdatedAt: new Date(Date.now() - 90_000).toISOString(),
      locationStale: true,
      completedStopsCount: 1,
      totalStopsCount: 2,
      stops: [
        {
          id: 1,
          tripId: 101,
          bookingId: 10,
          bookingCode: 'BK-10',
          passengerName: 'Trần Minh',
          seatCount: 2,
          bookingStatus: 'PICKED_UP',
          stopType: 'PICKUP',
          stopOrder: 1,
          address: '24 Lê Duẩn, Đà Nẵng',
          latitude: 16.068,
          longitude: 108.221,
          status: 'COMPLETED',
        },
        {
          id: 2,
          tripId: 101,
          bookingId: 10,
          bookingCode: 'BK-10',
          passengerName: 'Trần Minh',
          seatCount: 2,
          bookingStatus: 'PICKED_UP',
          stopType: 'DROPOFF',
          stopOrder: 2,
          address: '15 Hùng Vương, TP. Huế',
          latitude: 16.463,
          longitude: 107.595,
          status: 'PENDING',
        },
      ],
      recentEvents: [],
      serverTimestamp: new Date().toISOString(),
    });

    const resolveSpy = vi
      .spyOn(client.monitoringApi, 'resolveIncident')
      .mockResolvedValueOnce({
        id: 55,
        tripId: 101,
        routeName: 'Đà Nẵng - Huế',
        origin: 'Đà Nẵng',
        destination: 'Huế',
        companyId: 1,
        companyName: 'Nhà Xe Hoàng Gia',
        vehiclePlate: '43A-888.88',
        driverId: 2,
        driverName: 'Nguyễn Văn Hùng',
        driverPhone: '0905123456',
        incidentType: 'HEAVY_TRAFFIC',
        incidentTypeLabel: 'Kẹt xe kéo dài',
        description: 'Ùn tắc tại đường dẫn hầm Hải Vân khoảng 15 phút',
        status: 'RESOLVED',
        resolutionNote: 'Nhà xe đã tiếp nhận và phối hợp xử lý',
        createdAt: new Date().toISOString(),
      });

    render(
      <MemoryRouter initialEntries={['/company/monitoring']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Giám sát chuyến đi trực tiếp')).toBeInTheDocument();
    expect(await screen.findByText(/16\.1234, 108\.1567/)).toBeInTheDocument();
    expect(await screen.findByText('Kẹt xe kéo dài')).toBeInTheDocument();

    const resolveBtn = screen.getByRole('button', { name: 'Đánh dấu đã xử lý' });
    fireEvent.click(resolveBtn);

    await waitFor(() => {
      expect(resolveSpy).toHaveBeenCalledWith(101, 55, expect.any(String));
    });
  });

  it('renders AdminMonitoringPage KPIs and switches to system-wide incidents view', async () => {
    sessionStorage.setItem('rsh_web_access', 'mock-admin-token');
    sessionStorage.setItem('rsh_web_role', 'ADMIN');

    vi.spyOn(client.adminApi, 'listRegistrations').mockResolvedValue([]);
    vi.spyOn(client.monitoringApi, 'listAdminMonitoringTrips').mockResolvedValue([
      {
        tripId: 201,
        routeName: 'Đà Nẵng - Hội An',
        origin: 'Đà Nẵng',
        destination: 'Hội An',
        companyId: 2,
        companyName: 'Nhà Xe Thu Bồn',
        driverName: 'Lê Tài',
        driverPhone: '0914222333',
        vehiclePlate: '92A-555.55',
        vehicleType: 'Xe 16 chỗ',
        departureTime: new Date().toISOString(),
        estimatedMinutes: 50,
        status: 'IN_PROGRESS',
        assignmentStatus: 'ACCEPTED',
        bookedSeats: 4,
        seatCapacity: 16,
        locationUpdatedAt: new Date().toISOString(),
        locationStale: false,
        completedStopsCount: 0,
        totalStopsCount: 2,
        openIncidentsCount: 1,
        totalIncidentsCount: 1,
      },
    ]);

    vi.spyOn(client.monitoringApi, 'listAdminIncidents').mockResolvedValue([
      {
        id: 88,
        tripId: 201,
        routeName: 'Đà Nẵng - Hội An',
        origin: 'Đà Nẵng',
        destination: 'Hội An',
        companyId: 2,
        companyName: 'Nhà Xe Thu Bồn',
        vehiclePlate: '92A-555.55',
        driverId: 5,
        driverName: 'Lê Tài',
        incidentType: 'VEHICLE_ISSUE',
        incidentTypeLabel: 'Sự cố phương tiện',
        description: 'Điều hòa khoang khách bị yếu cần hỗ trợ kiểm tra',
        status: 'OPEN',
        createdAt: new Date().toISOString(),
      },
    ]);

    render(
      <MemoryRouter initialEntries={['/admin/monitoring']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Giám sát chuyến đi & Sự cố')).toBeInTheDocument();
    expect(await screen.findByText('Đà Nẵng - Hội An')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Cảnh báo sự cố/i }));
    expect(await screen.findByText('Sự cố phương tiện')).toBeInTheDocument();
    expect(screen.getByText(/Điều hòa khoang khách bị yếu/)).toBeInTheDocument();
  });
});
