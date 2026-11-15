/**
 * SP2-P1-05: Company Trip Booking Overview — read-only list of Bookings for a Trip.
 *
 * Route: /company/trips/:tripId/bookings
 */
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { tripApi, type BookingRecord, type TripResponse } from '../api/client';
import { Badge } from '../components/Badge';
import { ErrorAlert } from '../components/Alert';
import { PageSpinner } from '../components/Spinner';
import { useAuth } from '../auth/AuthContext';

type BookingStatus = BookingRecord['status'];

function bookingStatusLabel(s: BookingStatus): string {
  switch (s) {
    case 'PENDING': return 'Chờ xác nhận';
    case 'CONFIRMED': return 'Đã xác nhận';
    case 'PICKED_UP': return 'Đã lên xe';
    case 'COMPLETED': return 'Hoàn thành';
    case 'CANCELLED': return 'Đã hủy';
    case 'NO_SHOW': return 'Vắng mặt';
    default: return s;
  }
}

function bookingStatusVariant(s: BookingStatus): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  switch (s) {
    case 'CONFIRMED': return 'success';
    case 'PENDING': return 'warning';
    case 'CANCELLED': return 'danger';
    case 'PICKED_UP': return 'info';
    case 'COMPLETED': return 'success';
    case 'NO_SHOW': return 'neutral';
    default: return 'neutral';
  }
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function TripBookingOverviewPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  const companyId = session?.companyId;

  const [trip, setTrip] = useState<TripResponse | null>(null);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || !tripId) { navigate('/company/trips', { replace: true }); return; }
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

  if (loading) return <PageSpinner />;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
      {/* Back */}
      <Link to="/company/trips" style={{ color: 'var(--primary)', fontSize: 14, textDecoration: 'none' }}>
        ← Quay lại danh sách chuyến
      </Link>

      <h1 style={{ marginTop: 16, marginBottom: 4, fontSize: 22, fontWeight: 700 }}>
        Đặt chỗ của chuyến xe
      </h1>

      {/* Trip info */}
      {trip && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 24,
          display: 'flex',
          gap: 32,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{trip.origin} → {trip.destination}</div>
            <div style={{ color: 'var(--text-sub)', fontSize: 13, marginTop: 4 }}>
              {formatDate(trip.departureTime)} · {trip.vehiclePlate}
            </div>
          </div>
          <Badge value={trip.status} />
          <div style={{ color: 'var(--text-sub)', fontSize: 13 }}>
            {bookings.filter(b => b.status !== 'CANCELLED' && b.status !== 'NO_SHOW')
              .reduce((sum, b) => sum + b.seatCount, 0)} / {trip.seatCapacity} ghế đã đặt
          </div>
        </div>
      )}

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      {/* Bookings table */}
      {bookings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-sub)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎫</div>
          <p>Chưa có đặt chỗ nào cho chuyến này.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', color: 'var(--text-sub)' }}>Mã vé</th>
                <th style={{ padding: '10px 12px', color: 'var(--text-sub)' }}>Hành khách</th>
                <th style={{ padding: '10px 12px', color: 'var(--text-sub)' }}>Ghế</th>
                <th style={{ padding: '10px 12px', color: 'var(--text-sub)' }}>Điểm đón</th>
                <th style={{ padding: '10px 12px', color: 'var(--text-sub)' }}>Giá vé</th>
                <th style={{ padding: '10px 12px', color: 'var(--text-sub)' }}>Trạng thái</th>
                <th style={{ padding: '10px 12px', color: 'var(--text-sub)' }}>Ngày đặt</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 600 }}>{b.bookingCode}</td>
                  <td style={{ padding: '10px 12px' }}>{b.passengerName}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>{b.seatCount}</td>
                  <td style={{ padding: '10px 12px', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={b.pickupAddress}>
                    {b.pickupAddress}
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{formatVND(b.estimatedFare)}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <Badge value={b.status} />
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-sub)' }}>{formatDate(b.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
