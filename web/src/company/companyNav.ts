import type { NavLinkItem } from '../components/AppShell';

export type CompanyNavSection = 'profile' | 'vehicles' | 'drivers' | 'routes' | 'trips' | 'monitoring';

export function buildCompanyNav(
  active: CompanyNavSection,
  approved: boolean,
): NavLinkItem[] {
  return [
    {
      id: active === 'profile' ? 'nav-profile-active' : 'nav-profile',
      to: '/company/profile',
      label: 'Hồ sơ nhà xe',
      icon: 'building',
      active: active === 'profile',
    },
    {
      id: active === 'vehicles' ? 'nav-vehicles-active' : 'nav-vehicles',
      to: '/company/vehicles',
      label: 'Quản lý phương tiện',
      icon: 'car',
      active: active === 'vehicles',
      disabled: !approved,
    },
    {
      id: active === 'drivers' ? 'nav-drivers-active' : 'nav-drivers',
      to: '/company/drivers',
      label: 'Quản lý tài xế',
      icon: 'users',
      active: active === 'drivers',
      disabled: !approved,
    },
    {
      id: active === 'routes' ? 'nav-routes-active' : 'nav-routes',
      to: '/company/routes',
      label: 'Quản lý tuyến đường',
      icon: 'route',
      active: active === 'routes',
      disabled: !approved,
    },
    {
      id: active === 'trips' ? 'nav-trips-active' : 'nav-trips',
      to: '/company/trips',
      label: 'Quản lý chuyến đi',
      icon: 'bus',
      active: active === 'trips',
      disabled: !approved,
    },
    {
      id: active === 'monitoring' ? 'nav-monitoring-active' : 'nav-monitoring',
      to: '/company/monitoring',
      label: 'Giám sát trực tiếp',
      icon: 'pin',
      active: active === 'monitoring',
      disabled: !approved,
    },
  ];
}

export function initialsOf(name?: string, fallback = 'NX'): string {
  if (!name?.trim()) return fallback;
  const cleaned = name
    .trim()
    .replace(/^(nhà xe|công ty(\s+tnhh|\s+cổ phần|\s+cp)?|doanh nghiệp|hợp tác xã|htx)\s+/i, '');
  const parts = (cleaned || name.trim()).split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}
