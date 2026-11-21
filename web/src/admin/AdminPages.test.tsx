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

function signInMockAdmin() {
  sessionStorage.setItem('rsh_web_access', 'mock-admin-token');
  sessionStorage.setItem('rsh_web_role', 'ADMIN');
}

const sampleOverview: client.AdminOverviewResponse = {
  totalCompanies: 8,
  pendingCompanies: 2,
  approvedCompanies: 5,
  rejectedCompanies: 1,
  totalUsers: 45,
  passengerCount: 30,
  driverUserCount: 8,
  companyOwnerCount: 6,
  adminCount: 1,
  lockedUsersCount: 2,
  totalDrivers: 12,
  availableDrivers: 7,
  onTripDrivers: 3,
  inactiveDrivers: 2,
  totalTrips: 20,
  activeTrips: 3,
  upcomingTrips: 6,
  completedTrips: 9,
  cancelledTrips: 1,
  draftTrips: 1,
  totalBookings: 64,
  confirmedBookings: 12,
  pickedUpBookings: 6,
  completedBookings: 40,
  cancelledBookings: 5,
  noShowBookings: 1,
  totalRatings: 18,
  averageRating: 4.65,
  openIncidentsCount: 1,
  pendingCompanyList: [
    {
      id: 10,
      name: 'Nhà xe Hải Vân Express',
      representativeName: 'Trần Minh Quang',
      contactPhone: '0905123789',
      contactEmail: 'haivan@example.com',
      address: '120 Tôn Đức Thắng, Đà Nẵng',
      createdAt: '2026-11-20T08:00:00Z',
    },
  ],
  recentRatings: [
    {
      id: 99,
      bookingCode: 'BK-A1B2C3D4',
      companyName: 'Nhà xe Miền Trung',
      driverName: 'Nguyễn Văn Hùng',
      passengerName: 'Lê Thị Hoa',
      score: 5,
      comment: 'Xe đúng giờ, tài xế nhiệt tình.',
      createdAt: '2026-11-21T07:30:00Z',
    },
  ],
};

describe('SP4-P1-02 & SP4-P1-04b: Admin Dashboard & Read-Only Directories', () => {
  it('renders AdminDashboardPage with KPI metrics, pending approvals, and recent ratings', async () => {
    signInMockAdmin();
    vi.spyOn(client.adminDirectoryApi, 'getOverview').mockResolvedValue(sampleOverview);

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Tổng quan nền tảng RideShareHub')).toBeInTheDocument();
    expect(screen.getByText('Nhà xe Hải Vân Express')).toBeInTheDocument();
    expect(screen.getByText('Duyệt hồ sơ →')).toBeInTheDocument();
    expect(screen.getByText(/4\.65 \(18 đánh giá\)/i)).toBeInTheDocument();
    expect(screen.getByText(/BK-A1B2C3D4/)).toBeInTheDocument();
  });

  it('renders AdminUserListPage with role filtering, search, pagination, and read-only enforcement', async () => {
    signInMockAdmin();
    vi.spyOn(client.adminDirectoryApi, 'getOverview').mockResolvedValue(sampleOverview);
    const listUsersSpy = vi
      .spyOn(client.adminDirectoryApi, 'listUsers')
      .mockResolvedValueOnce({
        items: [
          {
            id: 101,
            fullName: 'Nguyễn Văn An',
            email: 'an.nguyen@example.com',
            phone: '0935111222',
            role: 'PASSENGER',
            status: 'ACTIVE',
            createdAt: '2026-11-18T10:00:00Z',
            updatedAt: '2026-11-18T10:00:00Z',
          },
        ],
        page: 0,
        size: 10,
        totalElements: 12,
        totalPages: 2,
        hasNext: true,
        hasPrevious: false,
      })
      .mockResolvedValue({
        items: [
          {
            id: 102,
            fullName: 'Trần Văn Tài Xế',
            email: 'taixe@example.com',
            phone: '0905222333',
            role: 'DRIVER',
            status: 'ACTIVE',
            createdAt: '2026-11-19T10:00:00Z',
            updatedAt: '2026-11-19T10:00:00Z',
          },
        ],
        page: 1,
        size: 10,
        totalElements: 12,
        totalPages: 2,
        hasNext: false,
        hasPrevious: true,
      });

    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Nguyễn Văn An')).toBeInTheDocument();
    expect(screen.getByText('Trang 1 / 2 · Tổng 12 tài khoản')).toBeInTheDocument();
    // Strictly read-only: no lock/delete controls
    expect(screen.queryByRole('button', { name: /khóa/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));

    await waitFor(() => {
      expect(listUsersSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, size: 10 }),
      );
    });
    expect(await screen.findByText('Trần Văn Tài Xế')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Tài xế' }));
    await waitFor(() => {
      expect(listUsersSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 0, role: 'DRIVER' }),
      );
    });
  });

  it('renders AdminDriverListPage with status chips and handles empty state cleanly', async () => {
    signInMockAdmin();
    vi.spyOn(client.adminDirectoryApi, 'getOverview').mockResolvedValue(sampleOverview);
    vi.spyOn(client.adminApi, 'listRegistrations').mockResolvedValue([]);
    const listDriversSpy = vi
      .spyOn(client.adminDirectoryApi, 'listDrivers')
      .mockResolvedValueOnce({
        items: [
          {
            id: 5,
            userId: 50,
            companyId: 1,
            companyName: 'Nhà xe Miền Trung',
            fullName: 'Phạm Hoàng Nam',
            phone: '0905888999',
            licenseNumber: 'D2-998877',
            status: 'ON_TRIP',
            totalTrips: 14,
            createdAt: '2026-11-15T08:00:00Z',
          },
        ],
        page: 0,
        size: 10,
        totalElements: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      })
      .mockResolvedValueOnce({
        items: [],
        page: 0,
        size: 10,
        totalElements: 0,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      });

    render(
      <MemoryRouter initialEntries={['/admin/drivers']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Phạm Hoàng Nam')).toBeInTheDocument();
    expect(screen.getByText('D2-998877')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Ngưng hoạt động' }));
    await waitFor(() => {
      expect(listDriversSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'INACTIVE', page: 0 }),
      );
    });
    expect(await screen.findByText('Không có tài xế nào phù hợp')).toBeInTheDocument();
  });

  it('renders AdminTripsPage with read-only trips table and handles error state', async () => {
    signInMockAdmin();
    vi.spyOn(client.adminDirectoryApi, 'getOverview').mockResolvedValue(sampleOverview);
    vi.spyOn(client.adminApi, 'listRegistrations').mockResolvedValue([]);
    vi.spyOn(client.adminDirectoryApi, 'listTrips')
      .mockResolvedValueOnce({
        items: [
          {
            id: 77,
            companyId: 1,
            companyName: 'Nhà xe Miền Trung',
            routeName: 'Đà Nẵng - Huế',
            origin: 'Đà Nẵng',
            destination: 'Huế',
            driverName: 'Phạm Hoàng Nam',
            driverPhone: '0905888999',
            vehiclePlate: '43B-777.88',
            vehicleType: 'Limousine 9 chỗ',
            departureTime: '2026-11-22T08:00:00Z',
            estimatedMinutes: 120,
            fare: 180000,
            bookedSeats: 5,
            seatCapacity: 9,
            status: 'PUBLISHED',
            assignmentStatus: 'ACCEPTED',
            createdAt: '2026-11-20T06:00:00Z',
          },
        ],
        page: 0,
        size: 10,
        totalElements: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      })
      .mockRejectedValueOnce(new Error('Máy chủ tạm gián đoạn'));

    render(
      <MemoryRouter initialEntries={['/admin/trips']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Đà Nẵng - Huế')).toBeInTheDocument();
    expect(screen.getByText('43B-777.88')).toBeInTheDocument();
    expect(screen.getByText('5/9 ghế')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Hoàn thành' }));
    expect(await screen.findByText('Máy chủ tạm gián đoạn')).toBeInTheDocument();
  });
});
