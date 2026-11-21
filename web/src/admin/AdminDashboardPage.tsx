/**
 * SP4-P1-02: Admin Operational Overview Dashboard (AD-02).
 * Route: /admin/dashboard
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminDirectoryApi, type AdminOverviewResponse } from '../api/client';
import { AppShell } from '../components/AppShell';
import { ErrorAlert } from '../components/Alert';
import { Icon } from '../components/Icon';
import { PageSpinner } from '../components/Spinner';
import { buildAdminNav } from './adminNav';

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN');
}

export function AdminDashboardPage() {
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminDirectoryApi.getOverview();
      setOverview(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải tổng quan vận hành hệ thống.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const navItems = buildAdminNav('dashboard', {
    pendingCompanies: overview?.pendingCompanies,
    openIncidents: overview?.openIncidentsCount,
  });

  const completionPct =
    overview && overview.totalTrips > 0
      ? Math.round((overview.completedTrips / overview.totalTrips) * 100)
      : 0;

  return (
    <AppShell
      role="ADMIN"
      breadcrumbs={['Quản trị', 'Tổng quan vận hành']}
      eyebrow="Trung tâm điều hành · AD-02"
      title="Tổng quan nền tảng RideShareHub"
      subtitle="Theo dõi KPIs vận hành, hồ sơ nhà xe chờ duyệt, tình trạng chuyến đi và đánh giá hành khách."
      navItems={navItems}
      profileName="Quản trị viên"
      profileSub="Quyền quản lý hệ thống"
      profileInitials="AD"
      topbarStatus={
        overview ? (
          <Link to="/admin/companies" className="topbar__chip">
            <Icon name="clock" size={14} />
            <span>{overview.pendingCompanies} hồ sơ chờ duyệt</span>
          </Link>
        ) : undefined
      }
      headerAction={
        <button type="button" className="btn btn--primary" onClick={() => void loadOverview()}>
          Làm mới dữ liệu
        </button>
      }
      logoutId="admin-dashboard-logout"
    >
      {error && (
        <ErrorAlert
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {loading ? (
        <PageSpinner />
      ) : overview ? (
        <>
          {/* 8 KPI Cards matching Figma AD-02 */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-card__top">
                <span className="metric-card__label">Tổng nhà xe</span>
                <span className="metric-card__icon metric-card__icon--blue">
                  <Icon name="building" size={18} />
                </span>
              </div>
              <div className="metric-card__value">{overview.totalCompanies}</div>
              <div className="metric-card__note">
                {overview.approvedCompanies} đã duyệt · {overview.rejectedCompanies} từ chối
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-card__top">
                <span className="metric-card__label">Chờ phê duyệt</span>
                <span className="metric-card__icon metric-card__icon--amber">
                  <Icon name="clock" size={18} />
                </span>
              </div>
              <div className="metric-card__value">{overview.pendingCompanies}</div>
              <div className="metric-card__note">Hồ sơ cần quản trị viên xem xét</div>
            </div>

            <div className="metric-card">
              <div className="metric-card__top">
                <span className="metric-card__label">Tổng người dùng</span>
                <span className="metric-card__icon metric-card__icon--blue">
                  <Icon name="users" size={18} />
                </span>
              </div>
              <div className="metric-card__value">{overview.totalUsers}</div>
              <div className="metric-card__note">
                {overview.passengerCount} hành khách · {overview.lockedUsersCount} bị khóa
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-card__top">
                <span className="metric-card__label">Tổng tài xế</span>
                <span className="metric-card__icon metric-card__icon--teal">
                  <Icon name="car" size={18} />
                </span>
              </div>
              <div className="metric-card__value">{overview.totalDrivers}</div>
              <div className="metric-card__note">
                {overview.availableDrivers} sẵn sàng · {overview.onTripDrivers} đang chạy
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-card__top">
                <span className="metric-card__label">Tổng chuyến đi</span>
                <span className="metric-card__icon metric-card__icon--blue">
                  <Icon name="bus" size={18} />
                </span>
              </div>
              <div className="metric-card__value">{overview.totalTrips}</div>
              <div className="metric-card__note">
                {overview.upcomingTrips} sắp chạy · {overview.draftTrips} nháp
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-card__top">
                <span className="metric-card__label">Chuyến đang chạy</span>
                <span className="metric-card__icon metric-card__icon--teal">
                  <Icon name="route" size={18} />
                </span>
              </div>
              <div className="metric-card__value">{overview.activeTrips}</div>
              <div className="metric-card__note">
                {overview.openIncidentsCount} sự cố đang chờ xử lý
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-card__top">
                <span className="metric-card__label">Chuyến hoàn thành</span>
                <span className="metric-card__icon metric-card__icon--teal">
                  <Icon name="check" size={18} />
                </span>
              </div>
              <div className="metric-card__value">{overview.completedTrips}</div>
              <div className="metric-card__note">
                {completionPct}% tổng số chuyến · {overview.cancelledTrips} đã hủy
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-card__top">
                <span className="metric-card__label">Đặt chỗ & Đánh giá</span>
                <span className="metric-card__icon metric-card__icon--amber">
                  <Icon name="star" size={18} />
                </span>
              </div>
              <div className="metric-card__value">{overview.totalBookings}</div>
              <div className="metric-card__note">
                ★ {Number(overview.averageRating ?? 0).toFixed(2)} ({overview.totalRatings} đánh giá)
              </div>
            </div>
          </div>

          {/* 4 Quick Shortcuts matching Figma AD-02 */}
          <div className="metrics-grid" style={{ marginBottom: 24 }}>
            <Link to="/admin/users" className="panel" style={{ padding: 18, display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: 'var(--navy)' }}>Danh sách người dùng</span>
                <Icon name="users" size={18} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--slate-500)', marginTop: 6 }}>
                {overview.totalUsers} tài khoản trên toàn nền tảng →
              </div>
            </Link>

            <Link to="/admin/drivers" className="panel" style={{ padding: 18, display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: 'var(--navy)' }}>Danh sách tài xế</span>
                <Icon name="car" size={18} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--slate-500)', marginTop: 6 }}>
                {overview.totalDrivers} tài xế thuộc các nhà xe →
              </div>
            </Link>

            <Link to="/admin/trips" className="panel" style={{ padding: 18, display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: 'var(--navy)' }}>Danh sách chuyến đi</span>
                <Icon name="bus" size={18} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--slate-500)', marginTop: 6 }}>
                {overview.totalTrips} chuyến đi & tình trạng ghế →
              </div>
            </Link>

            <Link to="/admin/monitoring" className="panel" style={{ padding: 18, display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: 'var(--navy)' }}>Giám sát vận hành</span>
                <Icon name="route" size={18} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--slate-500)', marginTop: 6 }}>
                {overview.activeTrips} đang chạy · {overview.openIncidentsCount} sự cố mở →
              </div>
            </Link>
          </div>

          <div className="two-col">
            <section className="panel">
              <div className="panel__head">
                <div>
                  <h2 className="panel__title">Nhà xe chờ phê duyệt</h2>
                  <p className="panel__sub">
                    Hồ sơ đối tác mới cần xác minh trước khi công bố chuyến
                  </p>
                </div>
                <Link to="/admin/companies" className="btn btn--ghost btn--sm">
                  Xem tất cả →
                </Link>
              </div>

              {overview.pendingCompanyList.length === 0 ? (
                <div className="empty-state" style={{ padding: '28px 16px' }}>
                  <span className="empty-state__icon">
                    <Icon name="check" size={24} />
                  </span>
                  <div className="empty-state__title">Không có hồ sơ tồn đọng</div>
                  <p className="empty-state__body">Tất cả đăng ký nhà xe hiện tại đã được xử lý.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Nhà xe</th>
                        <th>Liên hệ</th>
                        <th>Ngày gửi</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.pendingCompanyList.map(c => (
                        <tr key={c.id}>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{c.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>{c.address}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: 13 }}>{c.representativeName}</div>
                            <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>{c.contactPhone}</div>
                          </td>
                          <td style={{ fontSize: 13 }}>{formatDate(c.createdAt)}</td>
                          <td>
                            <Link
                              to={`/admin/companies/${c.id}`}
                              className="btn btn--ghost btn--sm"
                              style={{ color: 'var(--primary)' }}
                            >
                              Duyệt hồ sơ →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="panel">
              <div className="panel__head">
                <div>
                  <h2 className="panel__title">Đánh giá gần đây & Đặt chỗ</h2>
                  <p className="panel__sub">
                    {overview.completedBookings} lượt hoàn thành · {overview.confirmedBookings} đang giữ chỗ · {overview.cancelledBookings} đã hủy
                  </p>
                </div>
              </div>

              {overview.recentRatings.length === 0 ? (
                <div className="empty-state" style={{ padding: '28px 16px' }}>
                  <span className="empty-state__icon">
                    <Icon name="star" size={24} />
                  </span>
                  <div className="empty-state__title">Chưa có đánh giá nào</div>
                  <p className="empty-state__body">
                    Đánh giá của hành khách sau chuyến hoàn thành sẽ hiển thị tại đây.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {overview.recentRatings.map(r => (
                    <div
                      key={r.id}
                      style={{
                        border: '1px solid var(--line)',
                        borderRadius: 12,
                        padding: 12,
                        background: 'var(--canvas)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <strong style={{ fontSize: 13, color: 'var(--navy)' }}>
                          {r.companyName} · ★ {r.score}/5
                        </strong>
                        <span style={{ fontSize: 11, color: 'var(--slate-400)' }}>
                          {r.bookingCode} · {formatDate(r.createdAt)}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--slate-600)', marginTop: 4 }}>
                        Khách: {r.passengerName} · Tài xế: {r.driverName}
                      </div>
                      {r.comment && (
                        <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 6 }}>
                          “{r.comment}”
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      ) : null}
    </AppShell>
  );
}
