import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { routeApi, type RouteResponse } from '../api/client';
import { ErrorAlert, SuccessAlert } from '../components/Alert';
import { PageSpinner } from '../components/Spinner';
import { useAuth } from '../auth/AuthContext';

export function RouteListPage() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const companyId = session?.companyId;

  const [routes, setRoutes] = useState<RouteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (!companyId) { navigate('/company/profile', { replace: true }); return; }
    routeApi
      .listRoutes(companyId)
      .then(setRoutes)
      .catch(() => setError('Không tải được danh sách tuyến đường.'))
      .finally(() => setLoading(false));
  }, [companyId, navigate]);

  async function handleDelete(routeId: number) {
    if (!companyId || !window.confirm('Bạn có chắc chắn muốn xoá tuyến đường này?')) return;
    setDeletingId(routeId);
    setError(null);
    try {
      await routeApi.deleteRoute(companyId, routeId);
      setRoutes(rs => rs.filter(r => r.id !== routeId));
      setSuccess('Đã xoá tuyến đường thành công.');
    } catch {
      setError('Không thể xoá tuyến đường này.');
    } finally {
      setDeletingId(null);
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
          <Link id="nav-routes-active" className="topbar__link topbar__link--active" to="/company/routes">Tuyến đường</Link>
          <Link id="nav-trips" className="topbar__link" to="/company/trips">Chuyến xe</Link>
        </nav>
        <button id="routes-logout" className="btn btn--ghost btn--sm" onClick={handleLogout}>Đăng xuất</button>
      </header>

      <main className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Tuyến đường vận hành</h1>
            <p className="page-sub">Quản lý các lộ trình và bảng giá cơ sở</p>
          </div>
          <Link id="add-route-btn" className="btn btn--primary" to="/company/routes/new">
            + Thêm tuyến
          </Link>
        </div>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
        {success && <SuccessAlert message={success} />}

        {routes.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">🗺️</span>
            <p>Chưa có tuyến đường nào. Bắt đầu bằng cách thêm tuyến mới.</p>
            <Link className="btn btn--primary" to="/company/routes/new">Thêm tuyến đầu tiên</Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table" id="route-table">
              <thead>
                <tr>
                  <th>Tên tuyến</th>
                  <th>Điểm đi</th>
                  <th>Điểm đến</th>
                  <th>Thời gian ước tính</th>
                  <th>Giá cơ sở</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {routes.map(r => (
                  <tr key={r.id} id={`route-row-${r.id}`}>
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td>{r.origin}</td>
                    <td>{r.destination}</td>
                    <td>{r.estimatedMinutes} phút</td>
                    <td style={{ fontWeight: 600, color: '#4f46e5' }}>
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(r.baseFare)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Link
                          id={`edit-route-${r.id}`}
                          className="btn btn--ghost btn--sm"
                          to={`/company/routes/${r.id}/edit`}
                        >
                          Sửa
                        </Link>
                        <button
                          id={`delete-route-${r.id}`}
                          className="btn btn--ghost btn--sm"
                          style={{ color: '#ef4444' }}
                          disabled={deletingId === r.id}
                          onClick={() => handleDelete(r.id)}
                        >
                          Xoá
                        </button>
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
