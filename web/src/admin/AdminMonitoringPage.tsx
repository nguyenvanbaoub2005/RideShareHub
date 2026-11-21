/**
 * SP4-P2-02: Admin System-Wide Trip Monitoring & Incident Management Page
 * Faithful to Figma admin/AdminOperations.tsx (AD-07, lines 600-790).
 * Route: /admin/monitoring
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  adminApi,
  monitoringApi,
  type TripIncidentResponse,
  type TripLiveSnapshotResponse,
  type TripMonitoringSummary,
} from '../api/client';
import { AppShell } from '../components/AppShell';
import { Badge } from '../components/Badge';
import { ErrorAlert, SuccessAlert } from '../components/Alert';
import { Icon } from '../components/Icon';
import { PageSpinner, Spinner } from '../components/Spinner';

function formatTime(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}

export function AdminMonitoringPage() {
  const [trips, setTrips] = useState<TripMonitoringSummary[]>([]);
  const [incidents, setIncidents] = useState<TripIncidentResponse[]>([]);
  const [pendingCompaniesCount, setPendingCompaniesCount] = useState(0);
  const [viewMode, setViewMode] = useState<'TRIPS' | 'INCIDENTS'>('TRIPS');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_PROGRESS' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const [incidentFilter, setIncidentFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');
  const [selectedSnapshot, setSelectedSnapshot] = useState<TripLiveSnapshotResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [tripList, incList, companyRegs] = await Promise.all([
        monitoringApi.listAdminMonitoringTrips(),
        monitoringApi.listAdminIncidents(),
        adminApi.listRegistrations().catch(() => []),
      ]);
      setTrips(tripList);
      setIncidents(incList);
      setPendingCompaniesCount(companyRegs.filter(c => c.status === 'PENDING').length);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu giám sát hệ thống');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll(false);
  }, [loadAll]);

  async function handleOpenDetail(tripId: number) {
    try {
      const snap = await monitoringApi.getTripLiveSnapshot(tripId);
      setSelectedSnapshot(snap);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải chi tiết lộ trình trực tiếp');
    }
  }

  async function handleResolve(inc: TripIncidentResponse) {
    setResolvingId(inc.id);
    setError(null);
    setSuccess(null);
    try {
      await monitoringApi.resolveIncident(
        inc.tripId,
        inc.id,
        'Admin đã xác nhận xử lý sự cố',
      );
      setSuccess(`Đã xử lý xong báo cáo sự cố #${inc.id}.`);
      await loadAll(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật trạng thái sự cố');
    } finally {
      setResolvingId(null);
    }
  }

  const companyNames = Array.from(new Set(trips.map(t => t.companyName))).sort();
  const activeCount = trips.filter(t => t.status === 'IN_PROGRESS').length;
  const upcomingCount = trips.filter(t => t.status === 'PUBLISHED' || t.status === 'FULL').length;
  const completedCount = trips.filter(t => t.status === 'COMPLETED').length;
  const cancelledCount = trips.filter(t => t.status === 'CANCELLED').length;
  const openIncidentsCount = incidents.filter(i => i.status !== 'RESOLVED').length;

  const q = query.trim().toLowerCase();
  const filteredTrips = trips.filter(t => {
    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'UPCOMING'
        ? t.status === 'PUBLISHED' || t.status === 'FULL'
        : t.status === statusFilter);
    if (!matchStatus) return false;
    if (companyFilter !== 'ALL' && t.companyName !== companyFilter) return false;
    if (!q) return true;
    return [String(t.tripId), t.routeName, t.companyName, t.driverName, t.vehiclePlate]
      .join(' ')
      .toLowerCase()
      .includes(q);
  });

  const filteredIncidents = incidents.filter(i => {
    if (incidentFilter === 'OPEN') return i.status !== 'RESOLVED';
    if (incidentFilter === 'RESOLVED') return i.status === 'RESOLVED';
    return true;
  });

  const navItems = [
    {
      id: 'nav-admin-companies',
      to: '/admin/companies',
      label: 'Quản lý nhà xe',
      icon: 'building',
      active: false,
      badge: pendingCompaniesCount,
    },
    {
      id: 'nav-admin-monitoring',
      to: '/admin/monitoring',
      label: 'Giám sát vận hành',
      icon: 'route',
      active: true,
      badge: openIncidentsCount,
    },
  ];

  return (
    <AppShell
      role="ADMIN"
      breadcrumbs={['Quản trị', 'Giám sát vận hành']}
      eyebrow="Giám sát liên nhà xe · AD-07"
      title="Giám sát chuyến đi & Sự cố"
      subtitle="Theo dõi GPS gần nhất, tiến độ đón/trả và cảnh báo sự cố toàn nền tảng (chế độ chỉ xem cho chuyến)."
      navItems={navItems}
      profileName="Quản trị viên"
      profileSub="Quyền quản lý hệ thống"
      profileInitials="AD"
      topbarStatus={
        <button
          type="button"
          className="topbar__chip"
          onClick={() => setViewMode(openIncidentsCount > 0 ? 'INCIDENTS' : 'TRIPS')}
        >
          <Icon name="alert" size={14} />
          <span>{openIncidentsCount} sự cố đang mở</span>
        </button>
      }
      headerAction={
        <button type="button" className="btn btn--primary" onClick={() => void loadAll(false)}>
          Làm mới dữ liệu
        </button>
      }
      logoutId="admin-monitoring-logout"
    >
      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
      {success && <SuccessAlert message={success} onDismiss={() => setSuccess(null)} />}

      {/* 4 KPI cards matching Figma AD-07 */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Tổng chuyến đi</span>
            <span className="metric-card__icon metric-card__icon--blue">
              <Icon name="bus" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{trips.length}</div>
          <div className="metric-card__note">Toàn bộ đối tác nhà xe</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Đang chạy</span>
            <span className="metric-card__icon metric-card__icon--teal">
              <Icon name="route" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{activeCount}</div>
          <div className="metric-card__note">Đang thực hiện hành trình</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Sắp khởi hành</span>
            <span className="metric-card__icon metric-card__icon--amber">
              <Icon name="clock" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{upcomingCount}</div>
          <div className="metric-card__note">{completedCount} chuyến đã hoàn thành</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Sự cố đang mở</span>
            <span className="metric-card__icon metric-card__icon--amber">
              <Icon name="alert" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{openIncidentsCount}</div>
          <div className="metric-card__note">Tổng {incidents.length} báo cáo từ tài xế</div>
        </div>
      </div>

      {/* Switcher tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <button
          type="button"
          className={viewMode === 'TRIPS' ? 'btn btn--primary' : 'btn btn--ghost'}
          onClick={() => setViewMode('TRIPS')}
        >
          Giám sát chuyến đi ({trips.length})
        </button>
        <button
          type="button"
          className={viewMode === 'INCIDENTS' ? 'btn btn--primary' : 'btn btn--ghost'}
          onClick={() => setViewMode('INCIDENTS')}
        >
          Cảnh báo sự cố ({openIncidentsCount} đang mở)
        </button>
      </div>

      {loading ? (
        <PageSpinner />
      ) : viewMode === 'TRIPS' ? (
        <section className="panel">
          <div className="panel__head">
            <div>
              <h2 className="panel__title">Giám sát chuyến đi toàn hệ thống</h2>
              <p className="panel__sub">
                Chỉ xem. Hiển thị mốc GPS gần nhất, tiến độ điểm đón/trả và trạng thái sự cố.
              </p>
            </div>
            <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>
              {filteredTrips.length} kết quả
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {(
              [
                ['ALL', 'Tất cả', trips.length],
                ['IN_PROGRESS', 'Đang chạy', activeCount],
                ['UPCOMING', 'Sắp khởi hành', upcomingCount],
                ['COMPLETED', 'Hoàn thành', completedCount],
                ['CANCELLED', 'Đã hủy', cancelledCount],
              ] as const
            ).map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                className={
                  statusFilter === key ? 'btn btn--primary btn--sm' : 'btn btn--ghost btn--sm'
                }
                onClick={() => setStatusFilter(key)}
              >
                {label} ({count})
              </button>
            ))}
          </div>

          <div className="toolbar" style={{ marginTop: 0 }}>
            <div className="search-box">
              <span className="search-box__icon">
                <Icon name="search" size={16} />
              </span>
              <input
                type="search"
                className="form__input"
                aria-label="Tìm chuyến đi"
                placeholder="Tìm mã chuyến, tài xế, biển số, tuyến..."
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
            <select
              aria-label="Lọc nhà xe"
              className="form__select"
              style={{ width: 'auto', minWidth: 180 }}
              value={companyFilter}
              onChange={e => setCompanyFilter(e.target.value)}
            >
              <option value="ALL">Tất cả nhà xe</option>
              {companyNames.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {(query || statusFilter !== 'ALL' || companyFilter !== 'ALL') && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  setQuery('');
                  setStatusFilter('ALL');
                  setCompanyFilter('ALL');
                }}
              >
                Xóa bộ lọc
              </button>
            )}
          </div>

          {filteredTrips.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__title">Không tìm thấy chuyến đi</div>
              <p className="empty-state__body">Thử thay đổi bộ lọc hoặc từ khóa.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã chuyến</th>
                    <th>Nhà xe &amp; Tài xế</th>
                    <th>Tuyến &amp; Xe</th>
                    <th>Khởi hành</th>
                    <th>GPS gần nhất &amp; Tiến độ</th>
                    <th>Trạng thái</th>
                    <th>Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrips.map(t => (
                    <tr key={t.tripId}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                        #{t.tripId}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{t.companyName}</div>
                        <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>
                          TX: {t.driverName}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{t.routeName}</div>
                        <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>
                          {t.vehiclePlate} · {t.bookedSeats}/{t.seatCapacity} khách
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                        {formatTime(t.departureTime)}
                      </td>
                      <td>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>
                          {t.completedStopsCount}/{t.totalStopsCount} điểm dừng
                        </div>
                        <div style={{ fontSize: 11, color: t.locationStale ? '#b45309' : 'var(--slate-500)' }}>
                          GPS: {formatTime(t.locationUpdatedAt)}
                          {t.locationStale ? ' (Stale)' : ''}
                        </div>
                        {t.openIncidentsCount > 0 && (
                          <div style={{ fontSize: 11, color: '#b91c1c', fontWeight: 700 }}>
                            ⚠ {t.openIncidentsCount} sự cố đang mở
                          </div>
                        )}
                      </td>
                      <td>
                        <Badge value={t.status} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => void handleOpenDetail(t.tripId)}
                        >
                          Xem trực tiếp →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <section className="panel">
          <div className="panel__head">
            <div>
              <h2 className="panel__title">Cảnh báo sự cố toàn hệ thống</h2>
              <p className="panel__sub">Theo dõi và xác nhận xử lý sự cố do tài xế gửi lên.</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['ALL', 'OPEN', 'RESOLVED'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  className={
                    incidentFilter === f ? 'btn btn--primary btn--sm' : 'btn btn--ghost btn--sm'
                  }
                  onClick={() => setIncidentFilter(f)}
                >
                  {f === 'ALL' ? 'Tất cả' : f === 'OPEN' ? 'Đang mở' : 'Đã xử lý'}
                </button>
              ))}
            </div>
          </div>

          {filteredIncidents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__title">Không có sự cố nào phù hợp</div>
              <p className="empty-state__body">Hệ thống hiện vận hành ổn định.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã</th>
                    <th>Chuyến / Nhà xe</th>
                    <th>Loại sự cố &amp; Mô tả</th>
                    <th>Thời gian gửi</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIncidents.map(inc => (
                    <tr key={inc.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>#{inc.id}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          Chuyến #{inc.tripId} · {inc.routeName}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>
                          {inc.companyName} · TX {inc.driverName} ({inc.vehiclePlate})
                        </div>
                      </td>
                      <td style={{ maxWidth: 320 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{inc.incidentTypeLabel}</div>
                        <div style={{ fontSize: 12, color: 'var(--slate-600)' }}>{inc.description}</div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{formatTime(inc.createdAt)}</td>
                      <td>
                        <Badge value={inc.status === 'RESOLVED' ? 'COMPLETED' : 'CANCELLED'} />
                      </td>
                      <td>
                        {inc.status !== 'RESOLVED' ? (
                          <button
                            type="button"
                            className="btn btn--primary btn--sm"
                            disabled={resolvingId === inc.id}
                            onClick={() => void handleResolve(inc)}
                          >
                            {resolvingId === inc.id ? <Spinner size="sm" /> : 'Xác nhận xử lý'}
                          </button>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>
                            {inc.resolutionNote ?? 'Đã xử lý'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Selected Trip Live Snapshot Modal */}
      {selectedSnapshot && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.55)',
            display: 'grid',
            placeItems: 'center',
            padding: 20,
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 18,
              padding: 22,
              maxWidth: 680,
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 14,
              }}
            >
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800 }}>
                  Chi tiết trực tiếp — Chuyến #{selectedSnapshot.tripId}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--slate-500)' }}>
                  {selectedSnapshot.routeName} · {selectedSnapshot.companyName} ·{' '}
                  {selectedSnapshot.vehiclePlate}
                </p>
              </div>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setSelectedSnapshot(null)}
              >
                Đóng ✕
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 10,
                marginBottom: 16,
              }}
            >
              <div style={{ background: 'var(--slate-50)', padding: 10, borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>Tọa độ GPS</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                  {selectedSnapshot.currentLat != null
                    ? `${Number(selectedSnapshot.currentLat).toFixed(4)}, ${Number(selectedSnapshot.currentLng).toFixed(4)}`
                    : 'Chưa có'}
                </div>
              </div>
              <div style={{ background: 'var(--slate-50)', padding: 10, borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>Cập nhật GPS</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                  {formatTime(selectedSnapshot.locationUpdatedAt)}
                </div>
              </div>
              <div style={{ background: 'var(--slate-50)', padding: 10, borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>Tiến độ điểm dừng</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                  {selectedSnapshot.completedStopsCount}/{selectedSnapshot.totalStopsCount} điểm
                </div>
              </div>
            </div>

            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              Danh sách điểm dừng đón / trả ({selectedSnapshot.stops.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedSnapshot.stops.map(s => (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: '1px solid var(--slate-200)',
                    fontSize: 13,
                  }}
                >
                  <div>
                    <strong>#{s.stopOrder}</strong> ·{' '}
                    {s.stopType === 'PICKUP' ? 'ĐÓN' : 'TRẢ'} · {s.passengerName} ({s.seatCount} ghế)
                    <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>{s.address}</div>
                  </div>
                  <Badge value={s.status === 'COMPLETED' ? 'COMPLETED' : s.status === 'ARRIVED' ? 'IN_PROGRESS' : 'PENDING'} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
