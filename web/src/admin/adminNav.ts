import type { NavLinkItem } from '../components/AppShell';

export type AdminNavSection =
  | 'dashboard'
  | 'companies'
  | 'users'
  | 'drivers'
  | 'trips'
  | 'monitoring';

export function buildAdminNav(
  active: AdminNavSection,
  counts?: { pendingCompanies?: number; openIncidents?: number },
): NavLinkItem[] {
  return [
    {
      id: 'nav-admin-dashboard',
      to: '/admin/dashboard',
      label: 'Tổng quan',
      icon: 'dashboard',
      active: active === 'dashboard',
    },
    {
      id: 'nav-admin-companies',
      to: '/admin/companies',
      label: 'Quản lý nhà xe',
      icon: 'building',
      active: active === 'companies',
      badge: counts?.pendingCompanies,
    },
    {
      id: 'nav-admin-users',
      to: '/admin/users',
      label: 'Người dùng',
      icon: 'users',
      active: active === 'users',
    },
    {
      id: 'nav-admin-drivers',
      to: '/admin/drivers',
      label: 'Tài xế',
      icon: 'car',
      active: active === 'drivers',
    },
    {
      id: 'nav-admin-trips',
      to: '/admin/trips',
      label: 'Chuyến đi',
      icon: 'bus',
      active: active === 'trips',
    },
    {
      id: 'nav-admin-monitoring',
      to: '/admin/monitoring',
      label: 'Giám sát vận hành',
      icon: 'route',
      active: active === 'monitoring',
      badge: counts?.openIncidents,
    },
  ];
}
