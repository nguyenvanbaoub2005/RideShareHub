import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { driverApi, type DriverResponse } from '../api/client';
import { AppShell } from '../components/AppShell';
import { Badge } from '../components/Badge';
import { ErrorAlert } from '../components/Alert';
import { Icon } from '../components/Icon';
import { PageSpinner } from '../components/Spinner';
import { useAuth } from '../auth/AuthContext';
import { buildCompanyNav, initialsOf } from './companyNav';

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Sẵn sàng',
  ON_TRIP: 'Đang chạy',
  INACTIVE: 'Ngưng hoạt động',
};

export function DriverListPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const companyId = session?.companyId;

  const [drivers, setDrivers] = useState<DriverResponse[]>([]);
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
    driverApi
      .listDrivers(companyId)
      .then(setDrivers)
      .catch(() => setError('Không tải được danh sách tài xế.'))
      .finally(() => setLoading(false));
  }, [companyId, navigate]);

  async function handleStatusChange(driverId: number, newStatus: DriverResponse['status']) {
    if (!companyId) return;
    setStatusLoading(driverId);
    setError(null);
    try {
      const updated = await driverApi.updateDriverStatus(companyId, driverId, newStatus);
      setDrivers(ds => ds.map(d => (d.id === driverId ? updated : d)));
    } catch {
      setError('Không thể cập nhật trạng thái tài xế.');
    } finally {
      setStatusLoading(null);
    }
  }

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = drivers.filter(d => {
    const matchStatus = statusFilter === 'ALL' || d.status === statusFilter;
    if (!matchStatus) return false;
    if (!normalizedQuery) return true;
    return [d.fullName, d.phone, d.licenseNumber]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery);
  });

  const availableCount = drivers.filter(d => d.status === 'AVAILABLE').length;
  const onTripCount = drivers.filter(d => d.status === 'ON_TRIP').length;
  const companyName = session?.companyName ?? 'Nhà xe';

  return (
    <AppShell
      role="COMPANY"
      breadcrumbs={['Không gian nhà xe', 'Quản lý tài xế']}
      eyebrow="Quản lý nguồn lực"
      title="Danh sách tài xế"
      subtitle="Quản lý đội ngũ tài xế, giấy phép lái xe và trạng thái nhận chuyến."
      navItems={buildCompanyNav('drivers', true)}
      profileName={companyName}
      profileSub="Đối tác đã xác minh"
      profileInitials={initialsOf(companyName)}
      topbarStatus={<Badge value="APPROVED" />}
      logoutId="drivers-logout"
      headerAction={
        <Link id="add-driver-btn" className="btn btn--primary" to="/company/drivers/new">
          <Icon name="plus" size={16} />
          <span>Thêm tài xế</span>
        </Link>
      }
    >
      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      <div className="metrics-grid metrics-grid--3">
        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Tổng tài xế</span>
            <span className="metric-card__icon metric-card__icon--blue">
              <Icon name="users" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{drivers.length}</div>
          <div className="metric-card__note">Nhân sự lái xe thuộc nhà xe</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Sẵn sàng nhận chuyến</span>
            <span className="metric-card__icon metric-card__icon--teal">
              <Icon name="check" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{availableCount}</div>
          <div className="metric-card__note">Có thể phân công lịch trình mới</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Đang thực hiện chuyến</span>
            <span className="metric-card__icon metric-card__icon--amber">
              <Icon name="route" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{onTripCount}</div>
          <div className="metric-card__note">Đang trong hành trình vận hành</div>
        </div>
      </div>

      <section className="panel">
        <div className="panel__head">
          <div>
            <h2 className="panel__title">Đội ngũ tài xế</h2>
            <p className="panel__sub">{companyName} · {filtered.length} tài xế</p>
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
              aria-label="Tìm tài xế"
              placeholder="Tìm họ tên, số điện thoại, số bằng lái..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <select
            aria-label="Lọc trạng thái tài xế"
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
              <Icon name="users" size={28} />
            </span>
            <div className="empty-state__title">
              {drivers.length === 0 ? 'Chưa có tài xế nào' : 'Không tìm thấy tài xế phù hợp'}
            </div>
            <p className="empty-state__body">
              {drivers.length === 0
                ? 'Thêm tài xế mới để có thể phân công lịch chạy trên các chuyến xe.'
                : 'Thử từ khóa khác hoặc xóa bộ lọc.'}
            </p>
            {drivers.length === 0 && (
              <Link className="btn btn--primary" to="/company/drivers/new">
                Thêm tài xế đầu tiên
              </Link>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table" id="driver-table">
              <thead>
                <tr>
                  <th>Tài xế</th>
                  <th>Số điện thoại</th>
                  <th>Số bằng lái</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id} id={`driver-row-${d.id}`}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span className="avatar-circle">
                          {d.fullName.trim().split(/\s+/).pop()?.[0]?.toUpperCase() ?? 'T'}
                        </span>
                        <span style={{ fontWeight: 600 }}>{d.fullName}</span>
                      </div>
                    </td>
                    <td>{d.phone}</td>
                    <td className="data-table__plate">{d.licenseNumber}</td>
                    <td>
                      <select
                        id={`driver-status-select-${d.id}`}
                        className="status-select"
                        value={d.status}
                        disabled={statusLoading === d.id}
                        onChange={e =>
                          handleStatusChange(d.id, e.target.value as DriverResponse['status'])
                        }
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
                        style={{ color: 'var(--primary)' }}
                        to={`/company/drivers/${d.id}/edit`}
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
