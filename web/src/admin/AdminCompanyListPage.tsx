import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, type CompanyResponse } from '../api/client';
import { AppShell } from '../components/AppShell';
import { Badge } from '../components/Badge';
import { ErrorAlert } from '../components/Alert';
import { Icon } from '../components/Icon';
import { PageSpinner } from '../components/Spinner';

export function AdminCompanyListPage() {
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .listRegistrations()
      .then(setCompanies)
      .catch(() => setError('Không tải được danh sách nhà xe.'))
      .finally(() => setLoading(false));
  }, []);

  const counts = {
    ALL: companies.length,
    PENDING: companies.filter(c => c.status === 'PENDING').length,
    APPROVED: companies.filter(c => c.status === 'APPROVED').length,
    REJECTED: companies.filter(c => c.status === 'REJECTED').length,
  };

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = companies.filter(c => {
    const matchStatus = filter === 'ALL' || c.status === filter;
    if (!matchStatus) return false;
    if (!normalizedQuery) return true;
    return [c.name, c.representativeName, c.contactPhone, c.contactEmail ?? '', c.address]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery);
  });

  const navItems = [
    {
      id: 'nav-admin-companies',
      to: '/admin/companies',
      label: 'Quản lý nhà xe',
      icon: 'building',
      active: true,
      badge: counts.PENDING,
    },
  ];

  const topbarStatus = (
    <button
      type="button"
      className="topbar__chip"
      onClick={() => setFilter('PENDING')}
    >
      <Icon name="clock" size={14} />
      <span>{counts.PENDING} hồ sơ chờ duyệt</span>
    </button>
  );

  return (
    <AppShell
      role="ADMIN"
      breadcrumbs={['Quản trị', 'Quản lý nhà xe']}
      eyebrow="Quản lý đối tác vận tải"
      title="Danh sách nhà xe"
      subtitle="Theo dõi, xác minh hồ sơ doanh nghiệp và quản lý quyền công bố chuyến."
      navItems={navItems}
      profileName="Quản trị viên"
      profileSub="Quyền quản lý hệ thống"
      profileInitials="AD"
      topbarStatus={topbarStatus}
      logoutId="admin-logout"
      headerAction={
        counts.PENDING > 0 ? (
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => setFilter('PENDING')}
          >
            <Icon name="clock" size={16} />
            <span>Xem hồ sơ đang chờ ({counts.PENDING})</span>
          </button>
        ) : undefined
      }
    >
      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Tất cả nhà xe</span>
            <span className="metric-card__icon metric-card__icon--blue">
              <Icon name="building" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{counts.ALL}</div>
          <div className="metric-card__note">Đối tác đã đăng ký trên nền tảng</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Chờ phê duyệt</span>
            <span className="metric-card__icon metric-card__icon--amber">
              <Icon name="clock" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{counts.PENDING}</div>
          <div className="metric-card__note">Cần xác minh trước khi hoạt động</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Đã phê duyệt</span>
            <span className="metric-card__icon metric-card__icon--teal">
              <Icon name="check" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{counts.APPROVED}</div>
          <div className="metric-card__note">Đủ điều kiện công bố chuyến đi</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Đã từ chối</span>
            <span className="metric-card__icon metric-card__icon--red">
              <Icon name="x" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{counts.REJECTED}</div>
          <div className="metric-card__note">Cần bổ sung hồ sơ theo lý do</div>
        </div>
      </div>

      <section className="panel">
        <div className="panel__head" style={{ borderBottom: 'none', paddingBottom: 12, marginBottom: 0 }}>
          <div>
            <h2 className="panel__title">Hồ sơ nhà xe</h2>
            <p className="panel__sub">{filtered.length} kết quả phù hợp</p>
          </div>
        </div>

        <div className="filter-pills" role="tablist">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(tab => (
            <button
              key={tab}
              id={`tab-${tab.toLowerCase()}`}
              role="tab"
              aria-selected={filter === tab}
              className={`filter-pill ${filter === tab ? 'filter-pill--active' : ''}`}
              onClick={() => setFilter(tab)}
            >
              <span>
                {tab === 'ALL'
                  ? 'Tất cả'
                  : tab === 'PENDING'
                    ? 'Chờ duyệt'
                    : tab === 'APPROVED'
                      ? 'Đã duyệt'
                      : 'Từ chối'}
              </span>
              <span className="filter-pill__count">{counts[tab]}</span>
            </button>
          ))}
        </div>

        <div className="toolbar">
          <div className="search-box">
            <span className="search-box__icon">
              <Icon name="search" size={16} />
            </span>
            <input
              type="search"
              className="form__input"
              aria-label="Tìm nhà xe"
              placeholder="Tìm tên nhà xe, người đại diện, số điện thoại..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          {(query || filter !== 'ALL') && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => { setQuery(''); setFilter('ALL'); }}
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
              <Icon name="inbox" size={28} />
            </span>
            <div className="empty-state__title">Không có hồ sơ nào</div>
            <p className="empty-state__body">
              {query || filter !== 'ALL'
                ? 'Không tìm thấy nhà xe phù hợp. Thử đổi từ khóa hoặc bộ lọc.'
                : 'Chưa có nhà xe nào gửi hồ sơ đăng ký trên hệ thống.'}
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nhà xe / Địa chỉ</th>
                  <th>Liên hệ</th>
                  <th>Ngày đăng ký</th>
                  <th>Phê duyệt</th>
                  <th>Đăng chuyến</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(company => (
                  <tr key={company.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span className="row-icon-box">
                          <Icon name="building" size={18} />
                        </span>
                        <div>
                          <Link
                            id={`company-card-${company.id}`}
                            to={`/admin/companies/${company.id}`}
                            style={{ fontWeight: 600, color: 'var(--navy)' }}
                          >
                            {company.name}
                          </Link>
                          <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 2 }}>
                            {company.address}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{company.representativeName}</div>
                      <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 2 }}>
                        {company.contactPhone}
                        {company.contactEmail ? ` · ${company.contactEmail}` : ''}
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {new Date(company.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td>
                      <Badge value={company.status} />
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: company.status === 'APPROVED' ? 'var(--green-700)' : 'var(--slate-400)',
                        }}
                      >
                        {company.status === 'APPROVED' ? 'Được phép' : 'Chưa được phép'}
                      </span>
                    </td>
                    <td>
                      <Link
                        to={`/admin/companies/${company.id}`}
                        className="btn btn--ghost btn--sm"
                        style={{ color: 'var(--primary)' }}
                      >
                        {company.status === 'PENDING' ? 'Duyệt hồ sơ →' : 'Xem chi tiết →'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--slate-500)' }}>
        <Icon name="shield" size={16} />
        <span>Chỉ nhà xe được phê duyệt mới có quyền công bố chuyến trên RideShareHub.</span>
      </div>
    </AppShell>
  );
}
