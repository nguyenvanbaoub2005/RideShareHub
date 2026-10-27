import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminApi, type CompanyResponse } from '../api/client';
import { Badge } from '../components/Badge';
import { ErrorAlert } from '../components/Alert';
import { PageSpinner } from '../components/Spinner';
import { useAuth } from '../auth/AuthContext';

export function AdminCompanyListPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .listRegistrations()
      .then(setCompanies)
      .catch(() => setError('Không tải được danh sách nhà xe.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'ALL' ? companies : companies.filter(c => c.status === filter);

  const counts = {
    ALL: companies.length,
    PENDING: companies.filter(c => c.status === 'PENDING').length,
    APPROVED: companies.filter(c => c.status === 'APPROVED').length,
    REJECTED: companies.filter(c => c.status === 'REJECTED').length,
  };

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar__brand">
          <span className="logo-icon">🚌</span>
          <span className="logo-text">RideShareHub</span>
          <span className="topbar__role-badge">Admin</span>
        </div>
        <button id="admin-logout" className="btn btn--ghost btn--sm" onClick={handleLogout}>
          Đăng xuất
        </button>
      </header>

      <main className="page-content">
        <div className="page-header">
          <h1 className="page-title">Hồ sơ nhà xe</h1>
          <p className="page-sub">Duyệt và quản lý đăng ký của các nhà xe</p>
        </div>

        {error && <ErrorAlert message={error} />}

        {/* Filter tabs */}
        <div className="tab-bar" role="tablist">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(tab => (
            <button
              key={tab}
              id={`tab-${tab.toLowerCase()}`}
              role="tab"
              aria-selected={filter === tab}
              className={`tab-bar__tab ${filter === tab ? 'tab-bar__tab--active' : ''}`}
              onClick={() => setFilter(tab)}
            >
              {tab === 'ALL' ? 'Tất cả' : tab === 'PENDING' ? 'Chờ duyệt' : tab === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}
              <span className="tab-bar__count">{counts[tab]}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <PageSpinner />
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">📋</span>
            <p>Không có hồ sơ nào.</p>
          </div>
        ) : (
          <div className="card-grid">
            {filtered.map(company => (
              <Link
                key={company.id}
                id={`company-card-${company.id}`}
                className="company-card"
                to={`/admin/companies/${company.id}`}
              >
                <div className="company-card__header">
                  <span className="company-card__name">{company.name}</span>
                  <Badge value={company.status} />
                </div>
                <div className="company-card__meta">
                  <span>📞 {company.contactPhone}</span>
                  <span>👤 {company.representativeName}</span>
                </div>
                <div className="company-card__footer">
                  <span className="company-card__date">
                    {new Date(company.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                  <span className="company-card__cta">Xem chi tiết →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
