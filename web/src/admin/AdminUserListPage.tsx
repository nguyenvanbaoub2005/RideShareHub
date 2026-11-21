/**
 * SP4-P1-02b: Read-only Paginated Admin User Directory (Figma AD-05).
 * Route: /admin/users
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  adminDirectoryApi,
  type AdminOverviewResponse,
  type AdminUserResponse,
  type PagedResponse,
} from '../api/client';
import { AppShell } from '../components/AppShell';
import { Badge } from '../components/Badge';
import { ErrorAlert } from '../components/Alert';
import { Icon } from '../components/Icon';
import { PageSpinner } from '../components/Spinner';
import { buildAdminNav } from './adminNav';

const PAGE_SIZE = 10;

export function AdminUserListPage() {
  const [paged, setPaged] = useState<PagedResponse<AdminUserResponse> | null>(null);
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'PASSENGER' | 'DRIVER' | 'TRANSPORT_COMPANY' | 'ADMIN'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'LOCKED'>('ALL');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [userPage, ov] = await Promise.all([
        adminDirectoryApi.listUsers({
          page,
          size: PAGE_SIZE,
          role: roleFilter,
          status: statusFilter,
          query,
        }),
        adminDirectoryApi.getOverview().catch(() => null),
      ]);
      setPaged(userPage);
      if (ov) setOverview(ov);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, statusFilter, query]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const navItems = buildAdminNav('users', {
    pendingCompanies: overview?.pendingCompanies,
    openIncidents: overview?.openIncidentsCount,
  });

  const resetFilters = () => {
    setRoleFilter('ALL');
    setStatusFilter('ALL');
    setQuery('');
    setPage(0);
  };

  const users = paged?.items ?? [];

  return (
    <AppShell
      role="ADMIN"
      breadcrumbs={['Quản trị', 'Người dùng']}
      eyebrow="Danh mục người dùng · AD-05"
      title="Danh sách người dùng hệ thống"
      subtitle="Tra cứu tài khoản hành khách, tài xế, nhà xe và quản trị viên ở chế độ chỉ xem phân trang."
      navItems={navItems}
      profileName="Quản trị viên"
      profileSub="Quyền quản lý hệ thống"
      profileInitials="AD"
      headerAction={
        <button type="button" className="btn btn--secondary" onClick={() => void loadUsers()}>
          Làm mới
        </button>
      }
      logoutId="admin-users-logout"
    >
      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Tổng người dùng</span>
            <span className="metric-card__icon metric-card__icon--blue">
              <Icon name="users" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{overview?.totalUsers ?? paged?.totalElements ?? 0}</div>
          <div className="metric-card__note">Tất cả vai trò trên nền tảng</div>
        </div>

        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Hành khách</span>
            <span className="metric-card__icon metric-card__icon--blue">
              <Icon name="user" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{overview?.passengerCount ?? '—'}</div>
          <div className="metric-card__note">Tài khoản đặt vé di động</div>
        </div>

        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Tài xế</span>
            <span className="metric-card__icon metric-card__icon--teal">
              <Icon name="car" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{overview?.driverUserCount ?? '—'}</div>
          <div className="metric-card__note">Tài khoản thực hiện chuyến</div>
        </div>

        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Tài khoản bị khóa</span>
            <span className="metric-card__icon metric-card__icon--red">
              <Icon name="shield" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{overview?.lockedUsersCount ?? 0}</div>
          <div className="metric-card__note">Chế độ xem chỉ đọc</div>
        </div>
      </div>

      <section className="panel">
        <div className="panel__head" style={{ borderBottom: 'none', paddingBottom: 12, marginBottom: 0 }}>
          <div>
            <h2 className="panel__title">Danh sách tài khoản</h2>
            <p className="panel__sub">
              {paged ? `${paged.totalElements} tài khoản phù hợp` : 'Đang tải...'}
            </p>
          </div>
          <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>Chỉ xem (Read-only)</span>
        </div>

        <div className="filter-pills" role="tablist" aria-label="Lọc theo vai trò">
          {(
            [
              ['ALL', 'Tất cả'],
              ['PASSENGER', 'Hành khách'],
              ['DRIVER', 'Tài xế'],
              ['TRANSPORT_COMPANY', 'Nhà xe'],
              ['ADMIN', 'Quản trị'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={roleFilter === key}
              className={`filter-pill ${roleFilter === key ? 'filter-pill--active' : ''}`}
              onClick={() => {
                setRoleFilter(key);
                setPage(0);
              }}
            >
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="toolbar">
          <div className="search-box">
            <span className="search-box__icon">
              <Icon name="search" size={16} />
            </span>
            <input
              type="search"
              className="form__input"
              aria-label="Tìm người dùng"
              placeholder="Tìm tên, email, số điện thoại, mã..."
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </div>

          <select
            aria-label="Lọc trạng thái tài khoản"
            className="form__select"
            style={{ width: 'auto', minWidth: 180 }}
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'LOCKED');
              setPage(0);
            }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="LOCKED">Đã khóa</option>
          </select>

          {(query || roleFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
              Xóa bộ lọc
            </button>
          )}
        </div>

        {loading ? (
          <PageSpinner />
        ) : users.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">
              <Icon name="inbox" size={28} />
            </span>
            <div className="empty-state__title">Không có người dùng phù hợp</div>
            <p className="empty-state__body">Thử thay đổi bộ lọc vai trò, trạng thái hoặc từ khóa tìm kiếm.</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Người dùng</th>
                    <th>Email / SĐT</th>
                    <th>Vai trò</th>
                    <th>Ngày tạo</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{u.fullName}</div>
                        <div style={{ fontSize: 11, color: 'var(--slate-400)', fontFamily: 'monospace' }}>
                          #{u.id}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: 13 }}>{u.email}</div>
                        <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>{u.phone ?? '—'}</div>
                      </td>
                      <td>
                        <Badge value={u.role} />
                      </td>
                      <td style={{ fontSize: 13 }}>
                        {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td>
                        <Badge value={u.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {paged && paged.totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 16,
                  fontSize: 13,
                  color: 'var(--slate-600)',
                }}
              >
                <span>
                  Trang {paged.page + 1} / {paged.totalPages} · Tổng {paged.totalElements} tài khoản
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    disabled={!paged.hasPrevious}
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                  >
                    Trang trước
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    disabled={!paged.hasNext}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Trang sau
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </AppShell>
  );
}
