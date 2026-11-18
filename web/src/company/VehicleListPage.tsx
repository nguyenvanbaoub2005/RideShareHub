import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { companyApi, type VehicleResponse } from '../api/client';
import { AppShell } from '../components/AppShell';
import { Badge } from '../components/Badge';
import { ErrorAlert } from '../components/Alert';
import { Icon } from '../components/Icon';
import { PageSpinner } from '../components/Spinner';
import { useAuth } from '../auth/AuthContext';
import { buildCompanyNav, initialsOf } from './companyNav';

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Sẵn sàng',
  IN_USE: 'Đang dùng',
  MAINTENANCE: 'Bảo dưỡng',
  INACTIVE: 'Ngưng hoạt động',
};

export function VehicleListPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const companyId = session?.companyId;

  const [vehicles, setVehicles] = useState<VehicleResponse[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState<number | null>(null);

  useEffect(() => {
    if (!companyId) {
      navigate('/company/profile', { replace: true });
      return;
    }
    companyApi
      .listVehicles(companyId)
      .then(setVehicles)
      .catch(() => setError('Không tải được danh sách xe.'))
      .finally(() => setLoading(false));
  }, [companyId, navigate]);

  async function handleStatusChange(vehicleId: number, newStatus: VehicleResponse['status']) {
    if (!companyId) return;
    setStatusLoading(vehicleId);
    setError(null);
    try {
      const updated = await companyApi.updateVehicleStatus(companyId, vehicleId, newStatus);
      setVehicles(vs => vs.map(v => (v.id === vehicleId ? updated : v)));
    } catch {
      setError('Không thể cập nhật trạng thái xe.');
    } finally {
      setStatusLoading(null);
    }
  }

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = vehicles.filter(v => {
    const matchStatus = statusFilter === 'ALL' || v.status === statusFilter;
    if (!matchStatus) return false;
    if (!normalizedQuery) return true;
    return [v.plateNumber, v.vehicleType, v.brand ?? '', v.model ?? '']
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery);
  });

  const availableCount = vehicles.filter(v => v.status === 'AVAILABLE').length;
  const unavailableCount = vehicles.filter(v => v.status !== 'AVAILABLE').length;
  const companyName = session?.companyName ?? 'Nhà xe';

  return (
    <AppShell
      role="COMPANY"
      breadcrumbs={['Không gian nhà xe', 'Quản lý phương tiện']}
      eyebrow="Quản lý nguồn lực"
      title="Đội xe"
      subtitle="Quản lý thông tin phương tiện, sức chứa và trạng thái sẵn sàng vận hành."
      navItems={buildCompanyNav('vehicles', true)}
      profileName={companyName}
      profileSub="Đối tác đã xác minh"
      profileInitials={initialsOf(companyName)}
      topbarStatus={<Badge value="APPROVED" />}
      logoutId="vehicles-logout"
      headerAction={
        <Link id="add-vehicle-btn" className="btn btn--primary" to="/company/vehicles/new">
          <Icon name="plus" size={16} />
          <span>Thêm phương tiện</span>
        </Link>
      }
    >
      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      <div className="metrics-grid metrics-grid--3">
        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Tổng phương tiện</span>
            <span className="metric-card__icon metric-card__icon--blue">
              <Icon name="car" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{vehicles.length}</div>
          <div className="metric-card__note">Phương tiện thuộc quyền quản lý</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Sẵn sàng vận hành</span>
            <span className="metric-card__icon metric-card__icon--teal">
              <Icon name="check" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{availableCount}</div>
          <div className="metric-card__note">Có thể gán vào chuyến mới</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Đang dùng / Bảo dưỡng</span>
            <span className="metric-card__icon metric-card__icon--amber">
              <Icon name="settings" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{unavailableCount}</div>
          <div className="metric-card__note">Theo dõi lịch bảo dưỡng định kỳ</div>
        </div>
      </div>

      <section className="panel">
        <div className="panel__head">
          <div>
            <h2 className="panel__title">Danh sách phương tiện</h2>
            <p className="panel__sub">{companyName} · {filtered.length} phương tiện</p>
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
              aria-label="Tìm phương tiện"
              placeholder="Tìm biển số, loại xe, hãng / mẫu xe..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <select
            aria-label="Lọc trạng thái xe"
            className="form__select"
            style={{ width: 'auto', minWidth: 180 }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
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
              <Icon name="car" size={28} />
            </span>
            <div className="empty-state__title">
              {vehicles.length === 0 ? 'Chưa có phương tiện nào' : 'Không tìm thấy phương tiện phù hợp'}
            </div>
            <p className="empty-state__body">
              {vehicles.length === 0
                ? 'Bắt đầu bằng cách thêm xe đầu tiên để phục vụ lên lịch chuyến.'
                : 'Thử thay đổi từ khóa hoặc xóa bộ lọc.'}
            </p>
            {vehicles.length === 0 && (
              <Link className="btn btn--primary" to="/company/vehicles/new">
                Thêm xe đầu tiên
              </Link>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table" id="vehicle-table">
              <thead>
                <tr>
                  <th>Biển số</th>
                  <th>Loại xe</th>
                  <th>Hãng / Mẫu</th>
                  <th className="data-table__center">Số ghế</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id} id={`vehicle-row-${v.id}`}>
                    <td className="data-table__plate">{v.plateNumber}</td>
                    <td>{v.vehicleType}</td>
                    <td>{[v.brand, v.model].filter(Boolean).join(' ') || '—'}</td>
                    <td className="data-table__center">{v.seatCapacity} chỗ</td>
                    <td>
                      <select
                        id={`status-select-${v.id}`}
                        className="status-select"
                        value={v.status}
                        disabled={statusLoading === v.id}
                        onChange={e =>
                          handleStatusChange(v.id, e.target.value as VehicleResponse['status'])
                        }
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
                        style={{ color: 'var(--primary)' }}
                        to={`/company/vehicles/${v.id}/edit`}
                      >
                        Chỉnh sửa
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
