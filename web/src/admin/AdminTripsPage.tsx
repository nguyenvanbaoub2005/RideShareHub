/**
 * SP4-P1-02: Read-only Paginated Admin Trip Directory (Figma AD-07).
 * Route: /admin/trips
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  adminApi,
  adminDirectoryApi,
  type AdminOverviewResponse,
  type AdminTripResponse,
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

function formatTime(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatVnd(amount: number): string {
  return `${Number(amount).toLocaleString('vi-VN')} đ`;
}

export function AdminTripsPage() {
  const [paged, setPaged] = useState<PagedResponse<AdminTripResponse> | null>(null);
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'IN_PROGRESS' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED' | 'DRAFT'
  >('ALL');
  const [companyIdFilter, setCompanyIdFilter] = useState<string>('ALL');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.listRegistrations().then(setCompanies).catch(() => {});
  }, []);

  const loadTrips = useCallback(async () => {
    setLoading(true);
    try {
      const [tripPage, ov] = await Promise.all([
        adminDirectoryApi.listTrips({
          page,
          size: PAGE_SIZE,
          status: statusFilter,
          companyId: companyIdFilter === 'ALL' ? undefined : Number(companyIdFilter),
          query,
        }),
        adminDirectoryApi.getOverview().catch(() => null),
      ]);
      setPaged(tripPage);
      if (ov) setOverview(ov);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách chuyến đi.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, companyIdFilter, query]);

  useEffect(() => {
    void loadTrips();
  }, [loadTrips]);

  const navItems = buildAdminNav('trips', {
    pendingCompanies: overview?.pendingCompanies,
    openIncidents: overview?.openIncidentsCount,
  });

  const resetFilters = () => {
    setStatusFilter('ALL');
    setCompanyIdFilter('ALL');
    setQuery('');
    setPage(0);
  };

  const trips = paged?.items ?? [];

  return (
    <AppShell
      role="ADMIN"
      breadcrumbs={['Quản trị', 'Chuyến đi']}
      eyebrow="Danh mục chuyến đi · Read-only"
      title="Danh sách chuyến đi toàn nền tảng"
      subtitle="Tra cứu lịch trình, nhà xe, tài xế, tình trạng ghế và giá vé niêm yết theo phân trang."
      navItems={navItems}
      profileName="Quản trị viên"
      profileSub="Quyền quản lý hệ thống"
      profileInitials="AD"
      headerAction={
        <Link to="/admin/monitoring" className="btn btn--primary">
          <Icon name="route" size={16} />
          <span>Giám sát GPS & Sự cố</span>
        </Link>
      }
      logoutId="admin-trips-logout"
    >
      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Tổng chuyến đi</span>
            <span className="metric-card__icon metric-card__icon--blue">
              <Icon name="bus" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{overview?.totalTrips ?? paged?.totalElements ?? 0}</div>
          <div className="metric-card__note">Toàn hệ thống RideShareHub</div>
        </div>

        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Đang chạy</span>
            <span className="metric-card__icon metric-card__icon--teal">
              <Icon name="route" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{overview?.activeTrips ?? '—'}</div>
          <div className="metric-card__note">{overview?.upcomingTrips ?? 0} chuyến sắp khởi hành</div>
        </div>

        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Hoàn thành</span>
            <span className="metric-card__icon metric-card__icon--teal">
              <Icon name="check" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{overview?.completedTrips ?? '—'}</div>
          <div className="metric-card__note">Đã kết thúc hành trình</div>
        </div>

        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Đã hủy</span>
            <span className="metric-card__icon metric-card__icon--red">
              <Icon name="x" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{overview?.cancelledTrips ?? '—'}</div>
          <div className="metric-card__note">{overview?.draftTrips ?? 0} bản nháp</div>
        </div>
      </div>

      <section className="panel">
        <div className="panel__head" style={{ borderBottom: 'none', paddingBottom: 12, marginBottom: 0 }}>
          <div>
            <h2 className="panel__title">Bảng chuyến đi</h2>
            <p className="panel__sub">
              {paged ? `${paged.totalElements} chuyến phù hợp` : 'Đang tải...'}
            </p>
          </div>
          <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>Chỉ xem (Read-only)</span>
        </div>

        <div className="filter-pills" role="tablist" aria-label="Lọc trạng thái chuyến đi">
          {(
            [
              ['ALL', 'Tất cả'],
              ['IN_PROGRESS', 'Đang chạy'],
              ['UPCOMING', 'Sắp khởi hành'],
              ['COMPLETED', 'Hoàn thành'],
              ['CANCELLED', 'Đã hủy'],
              ['DRAFT', 'Bản nháp'],
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
              aria-label="Tìm chuyến đi"
              placeholder="Tìm mã chuyến, tuyến, nhà xe, tài xế, biển số..."
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
        ) : trips.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">
              <Icon name="inbox" size={28} />
            </span>
            <div className="empty-state__title">Không có chuyến đi phù hợp</div>
            <p className="empty-state__body">Thử thay đổi bộ lọc trạng thái, nhà xe hoặc từ khóa.</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Chuyến / Tuyến</th>
                    <th>Nhà xe</th>
                    <th>Tài xế & Xe</th>
                    <th>Khởi hành</th>
                    <th>Ghế & Giá vé</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map(t => (
                    <tr key={t.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{t.routeName}</div>
                        <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>
                          #{t.id} · {t.origin} → {t.destination}
                        </div>
                      </td>
                      <td style={{ fontWeight: 500 }}>{t.companyName}</td>
                      <td>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{t.driverName}</div>
                        <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>
                          <span className="data-table__plate">{t.vehiclePlate}</span> · {t.vehicleType}
                        </div>
                      </td>
                      <td style={{ fontSize: 13 }}>{formatTime(t.departureTime)}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {t.bookedSeats}/{t.seatCapacity} ghế
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>{formatVnd(t.fare)}</div>
                      </td>
                      <td>
                        <Badge value={t.status} />
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
                  Trang {paged.page + 1} / {paged.totalPages} · Tổng {paged.totalElements} chuyến đi
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
