import React, { type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Icon } from './Icon';

export interface NavLinkItem {
  to: string;
  label: string;
  icon: string;
  active?: boolean;
  disabled?: boolean;
  badge?: number;
  id?: string;
}

interface AppShellProps {
  role: 'ADMIN' | 'COMPANY';
  breadcrumbs: string[];
  eyebrow: string;
  title: string;
  subtitle?: string;
  headerAction?: ReactNode;
  topbarStatus?: ReactNode;
  navItems: NavLinkItem[];
  profileName: string;
  profileSub: string;
  profileInitials: string;
  narrow?: boolean;
  logoutId?: string;
  children: ReactNode;
}

export function BrandMark({ light = false, subtitle }: { light?: boolean; subtitle: string }) {
  return (
    <div className="brand">
      <span className="brand__icon">
        <Icon name="bus" size={22} />
      </span>
      <span className={`brand__title ${light ? 'brand__title--light' : ''}`}>
        RideShareHub
        <span className="brand__sub">{subtitle}</span>
      </span>
    </div>
  );
}

export function AppShell({
  role,
  breadcrumbs,
  eyebrow,
  title,
  subtitle,
  headerAction,
  topbarStatus,
  navItems,
  profileName,
  profileSub,
  profileInitials,
  narrow = false,
  logoutId = 'shell-logout',
  children,
}: AppShellProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const isAdmin = role === 'ADMIN';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div style={{ padding: '4px 4px 0' }}>
          <BrandMark light subtitle={isAdmin ? 'Trung tâm quản trị' : 'Đối tác vận tải'} />
        </div>

        <div className="sidebar__profile">
          <span className="sidebar__avatar">{profileInitials}</span>
          <div style={{ minWidth: 0 }}>
            <div className="sidebar__profile-name">{profileName}</div>
            <div className="sidebar__profile-sub">{profileSub}</div>
          </div>
        </div>

        <div className="sidebar__section">
          {isAdmin ? 'Không gian quản trị' : 'Không gian quản lý'}
        </div>

        <nav className="sidebar__nav">
          {navItems.map(item => (
            <Link
              key={item.to}
              id={item.id}
              to={item.disabled ? '#' : item.to}
              aria-disabled={item.disabled}
              onClick={e => { if (item.disabled) e.preventDefault(); }}
              title={item.disabled ? 'Cần được phê duyệt để truy cập' : item.label}
              className={`sidebar__item ${item.active ? 'sidebar__item--active' : ''} ${item.disabled ? 'sidebar__item--disabled' : ''}`}
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="sidebar__badge">{item.badge}</span>
              )}
            </Link>
          ))}
        </nav>

        <div className="sidebar__assurance">
          <Icon name="shield" size={22} className="sidebar__assurance-icon" />
          <div className="sidebar__assurance-title">
            {isAdmin ? 'Duyệt đúng, vận hành tốt' : 'Vận hành an tâm'}
          </div>
          <p className="sidebar__assurance-copy">
            {isAdmin
              ? 'Xác minh đối tác để xây dựng nền tảng vận tải đáng tin cậy.'
              : 'Thông tin tập trung. Hành trình luôn kết nối.'}
          </p>
        </div>

        <button id={logoutId} type="button" className="sidebar__logout" onClick={handleLogout}>
          <Icon name="logout" size={16} />
          <span>Đăng xuất</span>
        </button>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={`${crumb}-${idx}`}>
                {idx > 0 && <Icon name="right" size={14} />}
                <span className={`breadcrumbs__item ${idx === breadcrumbs.length - 1 ? 'breadcrumbs__item--active' : ''}`}>
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </nav>

          <div className="topbar__right">
            {topbarStatus}
            <span className="topbar__divider" />
            <div className="topbar__user">
              <span className="topbar__avatar">{profileInitials}</span>
              <div>
                <div className="topbar__user-name">{profileName}</div>
                <div className="topbar__user-role">{isAdmin ? 'Quản trị viên hệ thống' : 'Quản lý nhà xe'}</div>
              </div>
            </div>
          </div>
        </header>

        <main className={`app-content ${narrow ? 'app-content--narrow' : ''}`}>
          <div className="page-header">
            <div>
              <div className="page-eyebrow">{eyebrow}</div>
              <h1 className="page-title">{title}</h1>
              {subtitle && <p className="page-sub">{subtitle}</p>}
            </div>
            {headerAction}
          </div>
          {children}
        </main>

        <footer className="app-footer">
          <span>© 2026 RideShareHub · {isAdmin ? 'Cổng quản trị' : 'Không gian nhà xe'}</span>
          <span>Đà Nẵng · Huế · Hội An · Quảng Nam</span>
        </footer>
      </div>
    </div>
  );
}
