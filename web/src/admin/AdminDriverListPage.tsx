/**
 * SP4-P1-02b: Read-only Paginated Admin Driver Directory.
 * Route: /admin/drivers
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  adminApi,
  adminDirectoryApi,
  type AdminDriverResponse,
  type AdminOverviewResponse,
  type CompanyResponse,
  type PagedResponse,
} from '../api/client';
import { AppShell } from '../components/AppShell';
import { Badge } from '../components/Badge';
import { ErrorAlert } from '../components/Alert';
import { Icon } from '../components/Icon';
import { PageSpinner } from '../components/Spinner';
import { buildAdminNav } from './adminNav';

const PAGE_SIZE = 10;

export function AdminDriverListPage() {
  const [paged, setPaged] = useState<PagedResponse<AdminDriverResponse> | null>(null);
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'ON_TRIP' | 'INACTIVE'>('ALL');
  const [companyIdFilter, setCompanyIdFilter] = useState<string>('ALL');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.listRegistrations().then(setCompanies).catch(() => {});
  }, []);

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const [driverPage, ov] = await Promise.all([
        adminDirectoryApi.listDrivers({
          page,
          size: PAGE_SIZE,
          status: statusFilter,
          companyId: companyIdFilter === 'ALL' ? undefined : Number(companyIdFilter),
          query,
        }),
        adminDirectoryApi.getOverview().catch(() => null),
      ]);
      setPaged(driverPage);
      if (ov) setOverview(ov);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách tài xế.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, companyIdFilter, query]);

  useEffect(() => {
    void loadDrivers();
  }, [loadDrivers]);

  const navItems = buildAdminNav('drivers', {
    pendingCompanies: overview?.pendingCompanies,
    openIncidents: overview?.openIncidentsCount,
  });

  const resetFilters = () => {
    setStatusFilter('ALL');
    setCompanyIdFilter('ALL');
    setQuery('');
    setPage(0);
  };

  const drivers = paged?.items ?? [];

  return (
    <AppShell
      role="ADMIN"
      breadcrumbs={['Quản trị', 'Tài xế']}
      eyebrow="Danh mục tài xế · Read-only"
      title="Danh sách tài xế toàn hệ thống"
      subtitle="Theo dõi danh sách tài xế, đơn vị nhà xe chủ quản, bằng lái và trạng thái sẵn sàng."
      navItems={navItems}
      profileName="Quản trị viên"
      profileSub="Quyền quản lý hệ thống"
      profileInitials="AD"
      headerAction={
        <button type="button" className="btn btn--secondary" onClick={() => void loadDrivers()}>
          Làm mới
        </button>
      }
      logoutId="admin-drivers-logout"
    >
      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Tổng tài xế</span>
            <span className="metric-card__icon metric-card__icon--blue">
              <Icon name="car" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{overview?.totalDrivers ?? paged?.totalElements ?? 0}</div>
          <div className="metric-card__note">Thuộc tất cả nhà xe đối tác</div>
        </div>

        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Sẵn sàng</span>
            <span className="metric-card__icon metric-card__icon--teal">
              <Icon name="check" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{overview?.availableDrivers ?? '—'}</div>
          <div className="metric-card__note">Có thể nhận chuyến mới</div>
        </div>

        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Đang chạy chuyến</span>
            <span className="metric-card__icon metric-card__icon--blue">
              <Icon name="route" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{overview?.onTripDrivers ?? '—'}</div>
          <div className="metric-card__note">Đang thực hiện hành trình</div>
        </div>

        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Ngưng hoạt động</span>
            <span className="metric-card__icon metric-card__icon--amber">
              <Icon name="clock" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{overview?.inactiveDrivers ?? '—'}</div>
          <div className="metric-card__note">Tạm nghỉ hoặc ngưng nhận chuyến</div>
        </div>
      </div>

      <section className="panel">
        <div className="panel__head" style={{ borderBottom: 'none', paddingBottom: 12, marginBottom: 0 }}>
          <div>
            <h2 className="panel__title">Hồ sơ tài xế</h2>
            <p className="panel__sub">
              {paged ? `${paged.totalElements} tài xế phù hợp` : 'Đang tải...'}
            </p>
          </div>
          <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>Chỉ xem (Read-only)</span>
        </div>

        <div className="filter-pills" role="tablist" aria-label="Lọc trạng thái tài xế">
          {(
            [
              ['ALL', 'Tất cả'],
              ['AVAILABLE', 'Sẵn sàng'],
              ['ON_TRIP', 'Đang chạy'],
              ['INACTIVE', 'Ngưng hoạt động'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={statusFilter === key}
              className={`filter-pill ${statusFilter === key ? 'filter-pill--active' : ''}`}
              onClick={() => {
                setStatusFilter(key);
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
              aria-label="Tìm tài xế"
              placeholder="Tìm tên tài xế, SĐT, bằng lái, nhà xe..."
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </div>

          <select
            aria-label="Lọc theo nhà xe"
            className="form__select"
            style={{ width: 'auto', minWidth: 200 }}
            value={companyIdFilter}
            onChange={e => {
              setCompanyIdFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="ALL">Tất cả nhà xe</option>
            {companies.map(c => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>

          {(query || statusFilter !== 'ALL' || companyIdFilter !== 'ALL') && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
              Xóa bộ lọc
            </button>
          )}
        </div>

        {loading ? (
          <PageSpinner />
        ) : drivers.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">
              <Icon name="inbox" size={28} />
            </span>
            <div className="empty-state__title">Không có tài xế nào phù hợp</div>
            <p className="empty-state__body">Thử thay đổi bộ lọc trạng thái, nhà xe hoặc từ khóa.</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tài xế</th>
                    <th>Nhà xe</th>
                    <th>Số điện thoại</th>
                    <th>Giấy phép lái xe</th>
                    <th>Số chuyến</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map(d => (
                    <tr key={d.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{d.fullName}</div>
                        <div style={{ fontSize: 11, color: 'var(--slate-400)', fontFamily: 'monospace' }}>
                          #{d.id}
                        </div>
                      </td>
                      <td style={{ fontWeight: 500 }}>{d.companyName}</td>
                      <td style={{ fontSize: 13 }}>{d.phone}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{d.licenseNumber}</td>
                      <td style={{ fontWeight: 600 }}>{d.totalTrips}</td>
                      <td>
                        <Badge value={d.status} />
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
                  Trang {paged.page + 1} / {paged.totalPages} · Tổng {paged.totalElements} tài xế
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
