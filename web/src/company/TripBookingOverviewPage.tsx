/**
 * SP2-P1-05: Company Trip Booking Overview — read-only list of Bookings for a Trip.
 * Route: /company/trips/:tripId/bookings
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { tripApi, type BookingRecord, type TripResponse } from '../api/client';
import { AppShell } from '../components/AppShell';
import { Badge } from '../components/Badge';
import { ErrorAlert } from '../components/Alert';
import { Icon } from '../components/Icon';
import { PageSpinner } from '../components/Spinner';
import { useAuth } from '../auth/AuthContext';
import { buildCompanyNav, initialsOf } from './companyNav';

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TripBookingOverviewPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  const companyId = session?.companyId;

  const [trip, setTrip] = useState<TripResponse | null>(null);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || !tripId) {
      navigate('/company/trips', { replace: true });
      return;
    }
    const id = Number(tripId);

    Promise.all([
      tripApi.listTrips(companyId).then(ts => ts.find(t => t.id === id) ?? null),
      tripApi.listTripBookings(companyId, id),
    ])
      .then(([t, bs]) => {
        setTrip(t);
        setBookings(bs);
      })
      .catch(() => setError('Không tải được dữ liệu đặt chỗ.'))
      .finally(() => setLoading(false));
  }, [companyId, tripId, navigate]);

  const activeSeats = bookings
    .filter(b => b.status !== 'CANCELLED' && b.status !== 'NO_SHOW')
    .reduce((sum, b) => sum + b.seatCount, 0);
  const capacity = trip?.seatCapacity ?? 0;
  const remaining = Math.max(0, capacity - activeSeats);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = bookings.filter(b => {
    const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;
    if (!matchStatus) return false;
    if (!normalizedQuery) return true;
    return [b.bookingCode, b.passengerName, b.pickup?.label ?? '', b.dropoff?.label ?? '']
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery);
  });

  const companyName = session?.companyName ?? 'Nhà xe';

  return (
    <AppShell
      role="COMPANY"
      breadcrumbs={['Không gian nhà xe', 'Quản lý chuyến đi', trip ? `${trip.origin} → ${trip.destination}` : `Chuyến #${tripId}`]}
      eyebrow="Theo dõi đặt chỗ"
      title="Đặt chỗ của chuyến xe"
      subtitle={
        trip
          ? `${trip.routeName} · Khởi hành ${formatDate(trip.departureTime)} · Xe ${trip.vehiclePlate}`
          : 'Danh sách đặt chỗ và thông tin đón / trả khách trên chuyến.'
      }
      navItems={buildCompanyNav('trips', true)}
      profileName={companyName}
      profileSub="Đối tác đã xác minh"
      profileInitials={initialsOf(companyName)}
      topbarStatus={trip ? <Badge value={trip.status} /> : <Badge value="APPROVED" />}
      logoutId="trip-bookings-logout"
    >
      <button
        type="button"
        className="back-link"
        onClick={() => navigate('/company/trips')}
      >
        <Icon name="left" size={16} />
        <span>Quay lại danh sách chuyến</span>
      </button>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      {loading ? (
        <PageSpinner />
      ) : (
        <>
          {trip && (
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-card__top">
                  <span className="metric-card__label">Chỗ đã đặt / mở bán</span>
                  <span className="metric-card__icon metric-card__icon--blue">
                    <Icon name="users" size={18} />
                  </span>
                </div>
                <div className="metric-card__value">{activeSeats} / {capacity}</div>
                <div className="metric-card__note">Chỗ đã huỷ tự động hoàn về quỹ trống</div>
              </div>
              <div className="metric-card">
                <div className="metric-card__top">
                  <span className="metric-card__label">Chỗ còn lại</span>
                  <span className="metric-card__icon metric-card__icon--teal">
                    <Icon name="ticket" size={18} />
                  </span>
                </div>
                <div className="metric-card__value">{remaining}</div>
                <div className="metric-card__note">Tài xế: {trip.driverName}</div>
              </div>
              <div className="metric-card">
                <div className="metric-card__top">
                  <span className="metric-card__label">Giá vé niêm yết</span>
                  <span className="metric-card__icon metric-card__icon--amber">
                    <Icon name="ticket" size={18} />
                  </span>
                </div>
                <div className="metric-card__value" style={{ fontSize: '1.5rem' }}>{formatVND(trip.fare)}</div>
                <div className="metric-card__note">Mỗi chỗ ngồi</div>
              </div>
              <div className="metric-card">
                <div className="metric-card__top">
                  <span className="metric-card__label">Trạng thái chuyến</span>
                  <span className="metric-card__icon metric-card__icon--blue">
                    <Icon name="bus" size={18} />
                  </span>
                </div>
                <div style={{ marginTop: 14 }}>
                  <Badge value={trip.status} />
                </div>
                <div className="metric-card__note" style={{ marginTop: 12 }}>Biển số {trip.vehiclePlate}</div>
              </div>
            </div>
          )}

          <section className="panel">
            <div className="panel__head">
              <div>
                <h2 className="panel__title">Danh sách đặt chỗ ({filtered.length})</h2>
                <p className="panel__sub">Chế độ xem tổng quan — chỗ đã huỷ không tính vào sức chứa chuyến.</p>
              </div>
            </div>

            <div className="toolbar" style={{ marginTop: 0 }}>
              <div className="search-box">
                <span className="search-box__icon">
                  <Icon name="search" size={16} />
                </span>
                <input
                  type="search"
                  className="form__input"
                  aria-label="Tìm đặt chỗ"
                  placeholder="Tìm mã vé, tên hành khách, điểm đón..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>
              <select
                aria-label="Lọc trạng thái đặt chỗ"
                className="form__select"
                style={{ width: 'auto', minWidth: 180 }}
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PENDING">Chờ xác nhận</option>
                <option value="CONFIRMED">Đã xác nhận</option>
                <option value="PICKED_UP">Đã lên xe</option>
                <option value="COMPLETED">Hoàn thành</option>
                <option value="CANCELLED">Đã huỷ</option>
                <option value="NO_SHOW">Vắng mặt</option>
              </select>
            </div>

            {filtered.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state__icon">
                  <Icon name="ticket" size={28} />
                </span>
                <div className="empty-state__title">Chưa có đặt chỗ nào</div>
                <p className="empty-state__body">
                  {bookings.length === 0
                    ? 'Khi hành khách đặt vé trên chuyến này, danh sách sẽ xuất hiện tại đây.'
                    : 'Không tìm thấy đặt chỗ khớp bộ lọc hiện tại.'}
                </p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Mã vé</th>
                      <th>Hành khách</th>
                      <th className="data-table__center">Ghế</th>
                      <th>Điểm đón</th>
                      <th>Điểm trả</th>
                      <th>Giá ước tính</th>
                      <th>Trạng thái</th>
                      <th>Ngày đặt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(b => (
                      <tr key={b.id}>
                        <td className="data-table__plate" style={{ color: 'var(--primary)' }}>
                          {b.bookingCode}
                        </td>
                        <td style={{ fontWeight: 600 }}>{b.passengerName}</td>
                        <td className="data-table__center">{b.seatCount} chỗ</td>
                        <td style={{ maxWidth: 180 }}>{b.pickup?.label ?? '—'}</td>
                        <td style={{ maxWidth: 180 }}>{b.dropoff?.label ?? '—'}</td>
                        <td style={{ fontWeight: 600 }}>{formatVND(b.fareEstimate)}</td>
                        <td><Badge value={b.status} /></td>
                        <td style={{ fontSize: 12, color: 'var(--slate-500)', whiteSpace: 'nowrap' }}>
                          {formatDate(b.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}
