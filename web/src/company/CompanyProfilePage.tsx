import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { companyApi, type CompanyResponse } from '../api/client';
import { Badge } from '../components/Badge';
import { ErrorAlert } from '../components/Alert';
import { PageSpinner } from '../components/Spinner';
import { useAuth } from '../auth/AuthContext';

export function CompanyProfilePage() {
  const { session, logout, setCompanyId } = useAuth();
  const navigate = useNavigate();
  const [company, setCompany] = useState<CompanyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.companyId) {
      // Company ID not cached — ideally resolved from /me endpoint.
      // For now, signal that registration lookup is needed.
      setError('Chưa có hồ sơ công ty. Vui lòng liên hệ Admin.');
      setLoading(false);
      return;
    }
    companyApi
      .getMyCompany(session.companyId)
      .then(c => { setCompany(c); setCompanyId(c.id); })
      .catch(() => setError('Không tải được thông tin công ty.'))
      .finally(() => setLoading(false));
  }, [session?.companyId, setCompanyId]);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

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
          <Link id="nav-profile-active" className="topbar__link topbar__link--active" to="/company/profile">
            Hồ sơ
          </Link>
          {company?.status === 'APPROVED' && (
            <>
              <Link id="nav-vehicles" className="topbar__link" to="/company/vehicles">
                Đội xe
              </Link>
              <Link id="nav-drivers" className="topbar__link" to="/company/drivers">
                Tài xế
              </Link>
              <Link id="nav-routes" className="topbar__link" to="/company/routes">
                Tuyến đường
              </Link>
              <Link id="nav-trips" className="topbar__link" to="/company/trips">
                Chuyến xe
              </Link>
            </>
          )}
        </nav>
        <button id="company-logout" className="btn btn--ghost btn--sm" onClick={handleLogout}>
          Đăng xuất
        </button>
      </header>

      <main className="page-content page-content--narrow">
        {error && <ErrorAlert message={error} />}

        {company ? (
          <div className="detail-card">
            <div className="detail-card__header">
              <div>
                <h1 className="detail-card__title">{company.name}</h1>
                <p className="detail-card__sub">Hồ sơ công ty</p>
              </div>
              <Badge value={company.status} />
            </div>

            {company.status === 'PENDING' && (
              <div className="info-banner info-banner--warning">
                ⏳ Hồ sơ đang chờ Admin xem xét. Chức năng quản lý sẽ mở khi được duyệt.
              </div>
            )}
            {company.status === 'REJECTED' && (
              <div className="info-banner info-banner--error">
                ✕ Hồ sơ bị từ chối. Lý do: {company.rejectReason ?? 'Không có lý do cụ thể.'}
              </div>
            )}
            {company.status === 'APPROVED' && (
              <div className="info-banner info-banner--success">
                ✓ Hồ sơ đã được duyệt. Bạn có thể quản lý đội xe.
              </div>
            )}

            <div className="detail-grid">
              <InfoRow label="Địa chỉ" value={company.address} />
              <InfoRow label="Điện thoại" value={company.contactPhone} />
              <InfoRow label="Email" value={company.contactEmail ?? '—'} />
              <InfoRow label="Người đại diện" value={company.representativeName} />
              <InfoRow label="Đánh giá TB" value={`${company.avgRating.toFixed(1)} ⭐ (${company.ratingCount} đánh giá)`} />
            </div>

            {company.status === 'APPROVED' && (
              <div className="card-actions">
                <Link id="go-vehicles" className="btn btn--primary" to="/company/vehicles">
                  Quản lý đội xe →
                </Link>
              </div>
            )}
          </div>
        ) : (
          !error && (
            <div className="empty-state">
              <span className="empty-state__icon">🏢</span>
              <p>Không tìm thấy hồ sơ công ty.</p>
            </div>
          )
        )}
      </main>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-row">
      <dt className="info-row__label">{label}</dt>
      <dd className="info-row__value">{value}</dd>
    </div>
  );
}
