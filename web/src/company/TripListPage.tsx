import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { tripApi, type TripResponse } from '../api/client';
import { Badge } from '../components/Badge';
import { ErrorAlert, SuccessAlert } from '../components/Alert';
import { PageSpinner } from '../components/Spinner';
import { useAuth } from '../auth/AuthContext';

export function TripListPage() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const companyId = session?.companyId;

  const [trips, setTrips] = useState<TripResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  useEffect(() => {
    if (!companyId) { navigate('/company/profile', { replace: true }); return; }
    tripApi
      .listTrips(companyId)
      .then(setTrips)
      .catch(() => setError('Không tải được danh sách chuyến xe.'))
      .finally(() => setLoading(false));
  }, [companyId, navigate]);

  async function handlePublish(tripId: number) {
    if (!companyId) return;
    setActionLoadingId(tripId);
    setError(null);
    try {
      const updated = await tripApi.publishTrip(companyId, tripId);
      setTrips(ts => ts.map(t => t.id === tripId ? updated : t));
      setSuccess('Đã xuất bản chuyến xe thành công. Hành khách đã có thể tìm thấy chuyến.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xuất bản chuyến này.';
      setError(msg);
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleCancel(tripId: number) {
    if (!companyId || !window.confirm('Bạn có chắc chắn muốn huỷ chuyến xe này?')) return;
    setActionLoadingId(tripId);
    setError(null);
    try {
      const updated = await tripApi.cancelTrip(companyId, tripId);
      setTrips(ts => ts.map(t => t.id === tripId ? updated : t));
      setSuccess('Đã huỷ chuyến xe thành công.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể huỷ chuyến này.';
      setError(msg);
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleLogout() { await logout(); navigate('/login', { replace: true }); }

  if (loading) return <PageSpinner />;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar__brand">
          <span className="logo-icon">🚌</span>
          <span className="logo-text">RideShareHub</span>
          <span className="topbar__role-badge">Nhà xe</span>
        </div>
        <nav className="topbar__nav">
          <Link id="nav-profile" className="topbar__link" to="/company/profile">Hồ sơ</Link>
          <Link id="nav-vehicles" className="topbar__link" to="/company/vehicles">Đội xe</Link>
          <Link id="nav-drivers" className="topbar__link" to="/company/drivers">Tài xế</Link>
          <Link id="nav-routes" className="topbar__link" to="/company/routes">Tuyến đường</Link>
          <Link id="nav-trips-active" className="topbar__link topbar__link--active" to="/company/trips">Chuyến xe</Link>
        </nav>
        <button id="trips-logout" className="btn btn--ghost btn--sm" onClick={handleLogout}>Đăng xuất</button>
      </header>

      <main className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Quản lý chuyến xe (Trips)</h1>
            <p className="page-sub">Tạo lịch chạy, gán phương tiện, tài xế và xuất bản chuyến xe</p>
          </div>
          <Link id="create-trip-btn" className="btn btn--primary" to="/company/trips/new">
            + Tạo chuyến mới
          </Link>
        </div>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
        {success && <SuccessAlert message={success} />}

        {trips.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">🗓️</span>
            <p>Chưa có chuyến xe nào được tạo. Bắt đầu bằng cách tạo chuyến mới.</p>
            <Link className="btn btn--primary" to="/company/trips/new">Tạo chuyến đầu tiên</Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table" id="trip-table">
              <thead>
                <tr>
                  <th>Tuyến đường</th>
                  <th>Khởi hành</th>
                  <th>Xe</th>
                  <th>Tài xế</th>
                  <th>Giá vé</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {trips.map(t => (
                  <tr key={t.id} id={`trip-row-${t.id}`}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{t.routeName}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{t.origin} → {t.destination}</div>
                    </td>
                    <td>
                      {new Date(t.departureTime).toLocaleString('vi-VN', {
                        hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
                      })}
                    </td>
                    <td>
                      <span className="data-table__plate">{t.vehiclePlate}</span>
                      <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '6px' }}>({t.seatCapacity} ghế)</span>
                    </td>
                    <td>{t.driverName}</td>
                    <td style={{ fontWeight: 600, color: '#4f46e5' }}>
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(t.fare)}
                    </td>
                    <td>
                      <Badge value={t.status} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {t.status === 'DRAFT' && (
                          <>
                            <button
                              id={`publish-trip-${t.id}`}
                              className="btn btn--primary btn--sm"
                              disabled={actionLoadingId === t.id}
                              onClick={() => handlePublish(t.id)}
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
                              className="btn btn--ghost btn--sm"
                              style={{ color: '#ef4444' }}
                              disabled={actionLoadingId === t.id}
                              onClick={() => handleCancel(t.id)}
                            >
                              Huỷ
                            </button>
                          </>
                        )}
                        {t.status === 'PUBLISHED' && (
                          <button
                            id={`cancel-trip-${t.id}`}
                            className="btn btn--ghost btn--sm"
                            style={{ color: '#ef4444' }}
                            disabled={actionLoadingId === t.id}
                            onClick={() => handleCancel(t.id)}
                          >
                            Huỷ chuyến
                          </button>
                        )}
                        {(t.status === 'CANCELLED' || t.status === 'COMPLETED') && (
                          <span style={{ fontSize: '13px', color: '#94a3b8' }}>—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
