import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { companyApi, type VehicleResponse } from '../api/client';
import { Badge } from '../components/Badge';
import { ErrorAlert } from '../components/Alert';
import { PageSpinner } from '../components/Spinner';
import { useAuth } from '../auth/AuthContext';

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Sẵn sàng',
  IN_USE: 'Đang dùng',
  MAINTENANCE: 'Bảo dưỡng',
  INACTIVE: 'Ngưng hoạt động',
};

export function VehicleListPage() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const companyId = session?.companyId;

  const [vehicles, setVehicles] = useState<VehicleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState<number | null>(null);

  useEffect(() => {
    if (!companyId) { navigate('/company/profile', { replace: true }); return; }
    companyApi
      .listVehicles(companyId)
      .then(setVehicles)
      .catch(() => setError('Không tải được danh sách xe.'))
      .finally(() => setLoading(false));
  }, [companyId, navigate]);

  async function handleStatusChange(vehicleId: number, newStatus: VehicleResponse['status']) {
    if (!companyId) return;
    setStatusLoading(vehicleId);
    try {
      const updated = await companyApi.updateVehicleStatus(companyId, vehicleId, newStatus);
      setVehicles(vs => vs.map(v => v.id === vehicleId ? updated : v));
    } catch {
      setError('Không thể cập nhật trạng thái xe.');
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
          <Link id="nav-vehicles-active" className="topbar__link topbar__link--active" to="/company/vehicles">Đội xe</Link>
          <Link id="nav-drivers" className="topbar__link" to="/company/drivers">Tài xế</Link>
          <Link id="nav-routes" className="topbar__link" to="/company/routes">Tuyến đường</Link>
          <Link id="nav-trips" className="topbar__link" to="/company/trips">Chuyến xe</Link>
        </nav>
        <button id="vehicles-logout" className="btn btn--ghost btn--sm" onClick={handleLogout}>Đăng xuất</button>
      </header>

      <main className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Đội xe</h1>
            <p className="page-sub">Quản lý và theo dõi trạng thái phương tiện</p>
          </div>
          <Link id="add-vehicle-btn" className="btn btn--primary" to="/company/vehicles/new">
            + Thêm xe
          </Link>
        </div>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

        {vehicles.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">🚐</span>
            <p>Chưa có xe nào. Bắt đầu bằng cách thêm xe mới.</p>
            <Link className="btn btn--primary" to="/company/vehicles/new">Thêm xe đầu tiên</Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table" id="vehicle-table">
              <thead>
                <tr>
                  <th>Biển số</th>
                  <th>Loại xe</th>
                  <th>Hãng / Mẫu</th>
                  <th>Số ghế</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map(v => (
                  <tr key={v.id} id={`vehicle-row-${v.id}`}>
                    <td className="data-table__plate">{v.plateNumber}</td>
                    <td>{v.vehicleType}</td>
                    <td>{[v.brand, v.model].filter(Boolean).join(' ') || '—'}</td>
                    <td className="data-table__center">{v.seatCapacity}</td>
                    <td>
                      <select
                        id={`status-select-${v.id}`}
                        className="status-select"
                        value={v.status}
                        disabled={statusLoading === v.id}
                        onChange={e => handleStatusChange(v.id, e.target.value as VehicleResponse['status'])}
                        aria-label={`Trạng thái xe ${v.plateNumber}`}
                      >
                        {Object.entries(STATUS_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <Link
                        id={`edit-vehicle-${v.id}`}
                        className="btn btn--ghost btn--sm"
                        to={`/company/vehicles/${v.id}/edit`}
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
