import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { routeApi, type RouteResponse } from '../api/client';
import { AppShell } from '../components/AppShell';
import { Badge } from '../components/Badge';
import { ErrorAlert, SuccessAlert } from '../components/Alert';
import { ConfirmModal } from '../components/ConfirmModal';
import { Icon } from '../components/Icon';
import { PageSpinner } from '../components/Spinner';
import { useAuth } from '../auth/AuthContext';
import { buildCompanyNav, initialsOf } from './companyNav';

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h ? `${h} giờ ` : ''}${m ? `${m} phút` : ''}`.trim() || `${minutes} phút`;
}

export function RouteListPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const companyId = session?.companyId;

  const [routes, setRoutes] = useState<RouteResponse[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RouteResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!companyId) {
      navigate('/company/profile', { replace: true });
      return;
    }
    routeApi
      .listRoutes(companyId)
      .then(setRoutes)
      .catch(() => setError('Không tải được danh sách tuyến đường.'))
      .finally(() => setLoading(false));
  }, [companyId, navigate]);

  async function confirmDelete() {
    if (!companyId || !deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await routeApi.deleteRoute(companyId, deleteTarget.id);
      setRoutes(rs => rs.filter(r => r.id !== deleteTarget.id));
      setSuccess(`Đã xoá tuyến đường "${deleteTarget.name}" thành công.`);
      setDeleteTarget(null);
    } catch {
      setError('Không thể xoá tuyến đường này (có thể tuyến đang được dùng trong chuyến đi).');
    } finally {
      setDeleting(false);
    }
  }

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = routes.filter(r =>
    !normalizedQuery
      ? true
      : [r.name, r.origin, r.destination, r.description ?? '']
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery),
  );

  const uniqueLocations = new Set(routes.flatMap(r => [r.origin.trim(), r.destination.trim()])).size;
  const avgFare = routes.length
    ? Math.round(routes.reduce((sum, r) => sum + r.baseFare, 0) / routes.length)
    : 0;
  const companyName = session?.companyName ?? 'Nhà xe';

  return (
    <AppShell
      role="COMPANY"
      breadcrumbs={['Không gian nhà xe', 'Quản lý tuyến đường']}
      eyebrow="Quản lý nguồn lực"
      title="Tuyến đường vận hành"
      subtitle="Thiết lập các tuyến đường cố định, thời gian di chuyển ước tính và giá vé cơ sở."
      navItems={buildCompanyNav('routes', true)}
      profileName={companyName}
      profileSub="Đối tác đã xác minh"
      profileInitials={initialsOf(companyName)}
      topbarStatus={<Badge value="APPROVED" />}
      logoutId="routes-logout"
      headerAction={
        <Link id="add-route-btn" className="btn btn--primary" to="/company/routes/new">
          <Icon name="plus" size={16} />
          <span>Tạo tuyến đường</span>
        </Link>
      }
    >
      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
      {success && <SuccessAlert message={success} onDismiss={() => setSuccess(null)} />}

      <div className="metrics-grid metrics-grid--3">
        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Tuyến đang khai thác</span>
            <span className="metric-card__icon metric-card__icon--blue">
              <Icon name="route" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{routes.length}</div>
          <div className="metric-card__note">Lộ trình sẵn sàng lên lịch chuyến</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Địa điểm kết nối</span>
            <span className="metric-card__icon metric-card__icon--teal">
              <Icon name="pin" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{uniqueLocations}</div>
          <div className="metric-card__note">Điểm đi &amp; điểm đến đang phục vụ</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Giá cơ sở trung bình</span>
            <span className="metric-card__icon metric-card__icon--amber">
              <Icon name="ticket" size={18} />
            </span>
          </div>
          <div className="metric-card__value" style={{ fontSize: '1.5rem' }}>{formatVND(avgFare)}</div>
          <div className="metric-card__note">Tham chiếu mặc định khi tạo chuyến</div>
        </div>
      </div>

      <section className="panel">
        <div className="panel__head">
          <div>
            <h2 className="panel__title">Danh sách tuyến đường</h2>
            <p className="panel__sub">{companyName} · {filtered.length} tuyến đường</p>
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
              aria-label="Tìm tuyến đường"
              placeholder="Tìm tên tuyến, điểm đi, điểm đến..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          {query && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setQuery('')}>
              Xóa bộ lọc
            </button>
          )}
        </div>

        {loading ? (
          <PageSpinner />
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">
              <Icon name="route" size={28} />
            </span>
            <div className="empty-state__title">
              {routes.length === 0 ? 'Chưa có tuyến đường nào' : 'Không tìm thấy tuyến đường phù hợp'}
            </div>
            <p className="empty-state__body">
              {routes.length === 0
                ? 'Tạo tuyến đường đầu tiên để bắt đầu lên lịch chuyến xe.'
                : 'Thử từ khóa khác hoặc xóa bộ lọc.'}
            </p>
            {routes.length === 0 && (
              <Link className="btn btn--primary" to="/company/routes/new">
                Thêm tuyến đầu tiên
              </Link>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table" id="route-table">
              <thead>
                <tr>
                  <th>Tên tuyến</th>
                  <th>Điểm đi</th>
                  <th>Điểm đến</th>
                  <th>Thời gian dự kiến</th>
                  <th>Giá cơ sở</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} id={`route-row-${r.id}`}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{r.name}</div>
                      {r.description && (
                        <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 2 }}>
                          {r.description}
                        </div>
                      )}
                    </td>
                    <td>{r.origin}</td>
                    <td>{r.destination}</td>
                    <td>{formatDuration(r.estimatedMinutes)}</td>
                    <td style={{ fontWeight: 600 }}>{formatVND(r.baseFare)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Link
                          id={`edit-route-${r.id}`}
                          className="btn btn--ghost btn--sm"
                          style={{ color: 'var(--primary)' }}
                          to={`/company/routes/${r.id}/edit`}
                        >
                          Chỉnh sửa
                        </Link>
                        <button
                          id={`delete-route-${r.id}`}
                          type="button"
                          className="btn btn--danger-ghost btn--sm"
                          onClick={() => setDeleteTarget(r)}
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
      </section>

      <ConfirmModal
        open={!!deleteTarget}
        destructive
        title="Xoá tuyến đường?"
        message={`Bạn có chắc chắn muốn xoá tuyến "${deleteTarget?.name ?? ''}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xoá tuyến đường"
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </AppShell>
  );
}
