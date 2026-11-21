import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { tripApi, type TripResponse } from '../api/client';
import { AppShell } from '../components/AppShell';
import { Badge } from '../components/Badge';
import { ErrorAlert, SuccessAlert } from '../components/Alert';
import { ConfirmModal } from '../components/ConfirmModal';
import { Icon } from '../components/Icon';
import { PageSpinner } from '../components/Spinner';
import { useAuth } from '../auth/AuthContext';
import { buildCompanyNav, initialsOf } from './companyNav';

const STATUS_OPTIONS: [string, string][] = [
  ['ALL', 'Tất cả trạng thái'],
  ['DRAFT', 'Bản nháp'],
  ['PUBLISHED', 'Đã mở bán'],
  ['FULL', 'Đã hết chỗ'],
  ['IN_PROGRESS', 'Đang chạy'],
  ['COMPLETED', 'Đã hoàn thành'],
  ['CANCELLED', 'Đã huỷ'],
];

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export function TripListPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const companyId = session?.companyId;

  const [trips, setTrips] = useState<TripResponse[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [publishTarget, setPublishTarget] = useState<TripResponse | null>(null);
  const [cancelTarget, setCancelTarget] = useState<TripResponse | null>(null);

  useEffect(() => {
    if (!companyId) {
      navigate('/company/profile', { replace: true });
      return;
    }
    tripApi
      .listTrips(companyId)
      .then(setTrips)
      .catch(() => setError('Không tải được danh sách chuyến xe.'))
      .finally(() => setLoading(false));
  }, [companyId, navigate]);

  async function confirmPublish() {
    if (!companyId || !publishTarget) return;
    setActionLoadingId(publishTarget.id);
    setError(null);
    try {
      const updated = await tripApi.publishTrip(companyId, publishTarget.id);
      setTrips(ts => ts.map(t => (t.id === publishTarget.id ? updated : t)));
      setSuccess(`Đã xuất bản chuyến ${updated.routeName}. Hành khách đã có thể tìm và đặt chỗ.`);
      setPublishTarget(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể xuất bản chuyến này.');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function confirmCancel() {
    if (!companyId || !cancelTarget) return;
    setActionLoadingId(cancelTarget.id);
    setError(null);
    try {
      const updated = await tripApi.cancelTrip(companyId, cancelTarget.id);
      setTrips(ts => ts.map(t => (t.id === cancelTarget.id ? updated : t)));
      setSuccess(`Đã huỷ chuyến ${updated.routeName} thành công.`);
      setCancelTarget(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể huỷ chuyến này.');
    } finally {
      setActionLoadingId(null);
    }
  }

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = trips
    .filter(t => {
      const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
      if (!matchStatus) return false;
      if (!normalizedQuery) return true;
      return [t.routeName, t.origin, t.destination, t.vehiclePlate, t.driverName, String(t.id)]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    })
    .sort((a, b) => new Date(b.departureTime).getTime() - new Date(a.departureTime).getTime());

  const publishedCount = trips.filter(t => t.status === 'PUBLISHED' || t.status === 'FULL').length;
  const activeCount = trips.filter(t => t.status === 'IN_PROGRESS').length;
  const draftCount = trips.filter(t => t.status === 'DRAFT').length;
  const companyName = session?.companyName ?? 'Nhà xe';

  return (
    <AppShell
      role="COMPANY"
      breadcrumbs={['Không gian nhà xe', 'Quản lý chuyến đi']}
      eyebrow="Điều hành vận tải"
      title="Quản lý chuyến xe (Trips)"
      subtitle="Tạo lịch chạy, gán phương tiện, tài xế, xuất bản chuyến và theo dõi đặt chỗ."
      navItems={buildCompanyNav('trips', true)}
      profileName={companyName}
      profileSub="Đối tác đã xác minh"
      profileInitials={initialsOf(companyName)}
      topbarStatus={<Badge value="APPROVED" />}
      logoutId="trips-logout"
      headerAction={
        <Link id="create-trip-btn" className="btn btn--primary" to="/company/trips/new">
          <Icon name="plus" size={16} />
          <span>Tạo chuyến đi</span>
        </Link>
      }
    >
      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
      {success && <SuccessAlert message={success} onDismiss={() => setSuccess(null)} />}

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Tổng chuyến</span>
            <span className="metric-card__icon metric-card__icon--blue">
              <Icon name="bus" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{trips.length}</div>
          <div className="metric-card__note">Tất cả chuyến đã lập lịch</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Đã mở bán</span>
            <span className="metric-card__icon metric-card__icon--teal">
              <Icon name="check" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{publishedCount}</div>
          <div className="metric-card__note">Đang hiển thị cho hành khách</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Đang chạy</span>
            <span className="metric-card__icon metric-card__icon--blue">
              <Icon name="route" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{activeCount}</div>
          <div className="metric-card__note">Tài xế đang thực hiện hành trình</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Bản nháp</span>
            <span className="metric-card__icon metric-card__icon--amber">
              <Icon name="calendar" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{draftCount}</div>
          <div className="metric-card__note">Chờ kiểm tra và xuất bản</div>
        </div>
      </div>

      <section className="panel">
        <div className="panel__head">
          <div>
            <h2 className="panel__title">Danh sách chuyến đi</h2>
            <p className="panel__sub">Quản lý lịch vận hành và trạng thái công bố · {filtered.length} chuyến</p>
          </div>
        </div>

        <div className="toolbar" style={{ marginTop: 0 }}>
          <div className="search-box">
            <span className="search-box__icon">
              <Icon name="search" size={16} />
            </span>
            <input
              id="trip-search"
              name="tripSearch"
              type="search"
              className="form__input"
              aria-label="Tìm chuyến đi"
              placeholder="Tìm tuyến đường, biển số xe, tài xế..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <select
            id="trip-status-filter"
            name="tripStatusFilter"
            aria-label="Lọc trạng thái chuyến"
            className="form__select"
            style={{ width: 'auto', minWidth: 180 }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          {(query || statusFilter !== 'ALL') && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => { setQuery(''); setStatusFilter('ALL'); }}
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        {loading ? (
          <PageSpinner />
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">
              <Icon name="calendar" size={28} />
            </span>
            <div className="empty-state__title">
              {trips.length === 0 ? 'Chưa có chuyến xe nào' : 'Không tìm thấy chuyến phù hợp'}
            </div>
            <p className="empty-state__body">
              {trips.length === 0
                ? 'Tạo chuyến xe mới từ tuyến đường, phương tiện và tài xế đã có.'
                : 'Thử từ khóa khác hoặc xóa bộ lọc.'}
            </p>
            {trips.length === 0 && (
              <Link className="btn btn--primary" to="/company/trips/new">
                Tạo chuyến đầu tiên
              </Link>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table" id="trip-table">
              <thead>
                <tr>
                  <th>Chuyến / Tuyến</th>
                  <th>Khởi hành</th>
                  <th>Xe / Tài xế</th>
                  <th>Đã đặt / Chỗ</th>
                  <th>Giá vé</th>
                  <th>Công bố</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} id={`trip-row-${t.id}`}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{t.routeName}</div>
                      <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 2 }}>
                        {t.origin} → {t.destination}
                      </div>
                    </td>
                    <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                      {new Date(t.departureTime).toLocaleString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </td>
                    <td>
                      <div className="data-table__plate">{t.vehiclePlate}</div>
                      <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 2 }}>
                        {t.driverName}
                      </div>
                    </td>
                    <td style={{ fontSize: 13, fontWeight: 600 }}>
                      {t.bookedSeats ?? 0} / {t.seatCapacity}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                      {formatVND(t.fare)}
                    </td>
                    <td>
                      <Badge value={t.status} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Link
                          id={`view-bookings-${t.id}`}
                          className="btn btn--ghost btn--sm"
                          to={`/company/trips/${t.id}/bookings`}
                        >
                          Đặt chỗ
                        </Link>
                        <Link
                          id={`optimize-trip-${t.id}`}
                          className="btn btn--ghost btn--sm"
                          to={`/company/trips/${t.id}/optimize`}
                        >
                          Tối ưu lộ trình
                        </Link>
                        {t.status === 'DRAFT' && (
                          <>
                            <button
                              id={`publish-trip-${t.id}`}
                              type="button"
                              className="btn btn--primary btn--sm"
                              disabled={actionLoadingId === t.id}
                              onClick={() => setPublishTarget(t)}
                            >
                              Xuất bản
                            </button>
                            <Link
                              id={`edit-trip-${t.id}`}
                              className="btn btn--ghost btn--sm"
                              to={`/company/trips/${t.id}/edit`}
                            >
                              Sửa
                            </Link>
                            <button
                              id={`cancel-trip-${t.id}`}
                              type="button"
                              className="btn btn--danger-ghost btn--sm"
                              disabled={actionLoadingId === t.id}
                              onClick={() => setCancelTarget(t)}
                            >
                              Huỷ
                            </button>
                          </>
                        )}
                        {(t.status === 'PUBLISHED' || t.status === 'FULL') && (
                          <button
                            id={`cancel-trip-${t.id}`}
                            type="button"
                            className="btn btn--danger-ghost btn--sm"
                            disabled={actionLoadingId === t.id}
                            onClick={() => setCancelTarget(t)}
                          >
                            Huỷ chuyến
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmModal
        open={!!publishTarget}
        title="Công bố chuyến đi?"
        message={`Chuyến "${publishTarget?.routeName ?? ''}" sẽ hiển thị trong kết quả tìm kiếm của hành khách.`}
        confirmLabel="Công bố chuyến"
        loading={actionLoadingId === publishTarget?.id}
        onCancel={() => setPublishTarget(null)}
        onConfirm={confirmPublish}
      />

      <ConfirmModal
        open={!!cancelTarget}
        destructive
        title="Huỷ chuyến xe?"
        message={`Bạn có chắc chắn muốn huỷ chuyến "${cancelTarget?.routeName ?? ''}"?`}
        confirmLabel="Xác nhận huỷ"
        loading={actionLoadingId === cancelTarget?.id}
        onCancel={() => setCancelTarget(null)}
        onConfirm={confirmCancel}
      />
    </AppShell>
  );
}
