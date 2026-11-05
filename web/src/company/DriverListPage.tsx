import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { driverApi, type DriverResponse } from '../api/client';
import { ErrorAlert } from '../components/Alert';
import { PageSpinner } from '../components/Spinner';
import { useAuth } from '../auth/AuthContext';

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Sẵn sàng',
  ON_TRIP: 'Đang chạy',
  INACTIVE: 'Ngưng hoạt động',
};

export function DriverListPage() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const companyId = session?.companyId;

  const [drivers, setDrivers] = useState<DriverResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState<number | null>(null);

  useEffect(() => {
    if (!companyId) { navigate('/company/profile', { replace: true }); return; }
    driverApi
      .listDrivers(companyId)
      .then(setDrivers)
      .catch(() => setError('Không tải được danh sách tài xế.'))
      .finally(() => setLoading(false));
  }, [companyId, navigate]);

  async function handleStatusChange(driverId: number, newStatus: DriverResponse['status']) {
    if (!companyId) return;
    setStatusLoading(driverId);
    try {
      const updated = await driverApi.updateDriverStatus(companyId, driverId, newStatus);
      setDrivers(ds => ds.map(d => d.id === driverId ? updated : d));
    } catch {
      setError('Không thể cập nhật trạng thái tài xế.');
    } finally {
      setStatusLoading(null);
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
          <Link id="nav-drivers-active" className="topbar__link topbar__link--active" to="/company/drivers">Tài xế</Link>
          <Link id="nav-routes" className="topbar__link" to="/company/routes">Tuyến đường</Link>
          <Link id="nav-trips" className="topbar__link" to="/company/trips">Chuyến xe</Link>
        </nav>
        <button id="drivers-logout" className="btn btn--ghost btn--sm" onClick={handleLogout}>Đăng xuất</button>
      </header>

      <main className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Danh sách tài xế</h1>
            <p className="page-sub">Quản lý đội ngũ tài xế và trạng thái hoạt động</p>
          </div>
          <Link id="add-driver-btn" className="btn btn--primary" to="/company/drivers/new">
            + Thêm tài xế
          </Link>
        </div>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

        {drivers.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">👨‍✈️</span>
            <p>Chưa có tài xế nào. Bắt đầu bằng cách thêm tài xế mới.</p>
            <Link className="btn btn--primary" to="/company/drivers/new">Thêm tài xế đầu tiên</Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table" id="driver-table">
              <thead>
                <tr>
                  <th>Họ và tên</th>
                  <th>Số điện thoại</th>
                  <th>Số bằng lái</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map(d => (
                  <tr key={d.id} id={`driver-row-${d.id}`}>
                    <td style={{ fontWeight: 600 }}>{d.fullName}</td>
                    <td>{d.phone}</td>
                    <td>{d.licenseNumber}</td>
                    <td>
                      <select
                        id={`driver-status-select-${d.id}`}
                        className="status-select"
                        value={d.status}
                        disabled={statusLoading === d.id}
                        onChange={e => handleStatusChange(d.id, e.target.value as DriverResponse['status'])}
                        aria-label={`Trạng thái tài xế ${d.fullName}`}
                      >
                        {Object.entries(STATUS_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <Link
                        id={`edit-driver-${d.id}`}
                        className="btn btn--ghost btn--sm"
                        to={`/company/drivers/${d.id}/edit`}
                      >
                        Sửa
                      </Link>
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
