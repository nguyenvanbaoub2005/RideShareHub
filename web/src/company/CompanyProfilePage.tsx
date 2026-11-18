import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ApiError,
  companyApi,
  type BookingRecord,
  type CompanyResponse,
} from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { AppShell } from '../components/AppShell';
import { Badge } from '../components/Badge';
import { ErrorAlert, SuccessAlert } from '../components/Alert';
import { Icon } from '../components/Icon';
import { PageSpinner, Spinner } from '../components/Spinner';
import { buildCompanyNav, initialsOf } from './companyNav';

interface RegistrationForm {
  name: string;
  phone: string;
  representativeName: string;
  address: string;
  businessInformation: string;
}

const EMPTY_REG: RegistrationForm = {
  name: '',
  phone: '',
  representativeName: '',
  address: '',
  businessInformation: '',
};

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export function CompanyProfilePage() {
  const { session, setCompanyMeta } = useAuth();
  const [company, setCompany] = useState<CompanyResponse | null>(null);
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [recentBookings, setRecentBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<RegistrationForm>(EMPTY_REG);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const c = session?.companyId
        ? await companyApi.getMyCompany(session.companyId)
        : await companyApi.getMyCompanyProfile();
      setCompany(c);
      setNeedsRegistration(false);
      setCompanyMeta(c.id, c.name, c.status === 'APPROVED');

      if (c.status === 'APPROVED') {
        try {
          const recent = await companyApi.listRecentBookings(c.id);
          setRecentBookings(recent.slice(0, 5));
        } catch {
          // Non-fatal: keep profile accessible if recent bookings call fails
        }
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNeedsRegistration(true);
      } else {
        setError('Không tải được thông tin hồ sơ nhà xe.');
      }
    } finally {
      setLoading(false);
    }
  }, [session?.companyId, setCompanyMeta]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function handleRegisterSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (
      !form.name.trim() ||
      !form.phone.trim() ||
      !form.representativeName.trim() ||
      !form.address.trim() ||
      !form.businessInformation.trim()
    ) {
      setError('Vui lòng điền đầy đủ thông tin doanh nghiệp có dấu *.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await companyApi.registerCompany({
        name: form.name.trim(),
        phone: form.phone.trim(),
        representativeName: form.representativeName.trim(),
        address: form.address.trim(),
        businessInformation: form.businessInformation.trim(),
      });
      setCompany(created);
      setNeedsRegistration(false);
      setCompanyMeta(created.id, created.name, created.status === 'APPROVED');
      setSuccess('Đã gửi hồ sơ đăng ký nhà xe. Hồ sơ đang chờ quản trị viên phê duyệt.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gửi hồ sơ đăng ký.');
    } finally {
      setSubmitting(false);
    }
  }

  const approved = company?.status === 'APPROVED';
  const navItems = buildCompanyNav('profile', approved);
  const displayName = company?.name ?? session?.companyName ?? 'Đối tác mới';
  const initials = initialsOf(displayName);

  const topbarStatus = company ? <Badge value={company.status} /> : <Badge value="PENDING" />;

  return (
    <AppShell
      role="COMPANY"
      breadcrumbs={['Không gian nhà xe', needsRegistration ? 'Đăng ký hồ sơ nhà xe' : 'Hồ sơ nhà xe']}
      eyebrow="Thông tin đối tác"
      title={
        needsRegistration
          ? 'Đăng ký hồ sơ nhà xe'
          : company?.status === 'APPROVED'
            ? company.name
            : 'Trạng thái hồ sơ đăng ký'
      }
      subtitle={
        needsRegistration
          ? 'Cung cấp thông tin doanh nghiệp để Admin xác minh và cấp quyền vận hành.'
          : company?.status === 'APPROVED'
            ? 'Quản lý thông tin pháp lý, trạng thái vận hành và đặt chỗ mới nhất.'
            : 'Theo dõi tiến trình xác minh hồ sơ doanh nghiệp của bạn.'
      }
      navItems={navItems}
      profileName={displayName}
      profileSub={
        approved
          ? 'Đối tác đã xác minh'
          : needsRegistration
            ? 'Chưa gửi hồ sơ'
            : 'Đang chờ phê duyệt'
      }
      profileInitials={initials}
      topbarStatus={topbarStatus}
      logoutId="company-logout"
      headerAction={
        approved ? (
          <div style={{ display: 'flex', gap: 10 }}>
            <Link id="go-vehicles" className="btn btn--secondary" to="/company/vehicles">
              <Icon name="car" size={16} />
              <span>Quản lý đội xe</span>
            </Link>
            <Link className="btn btn--primary" to="/company/trips/new">
              <Icon name="plus" size={16} />
              <span>Đăng chuyến mới</span>
            </Link>
          </div>
        ) : !needsRegistration ? (
          <button type="button" className="btn btn--secondary" onClick={loadProfile}>
            Kiểm tra lại trạng thái
          </button>
        ) : undefined
      }
    >
      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
      {success && <SuccessAlert message={success} onDismiss={() => setSuccess(null)} />}

      {loading ? (
        <PageSpinner />
      ) : needsRegistration ? (
        <div className="two-col two-col--aside">
          <section className="panel">
            <div className="panel__head">
              <div>
                <h2 className="panel__title">Thông tin đăng ký doanh nghiệp</h2>
                <p className="panel__sub">Các trường có dấu * là bắt buộc</p>
              </div>
            </div>

            <form className="form" onSubmit={handleRegisterSubmit} noValidate>
              <div className="form__row">
                <div className="form__group">
                  <label className="form__label" htmlFor="company-name">Tên nhà xe *</label>
                  <input
                    id="company-name"
                    className="form__input"
                    required
                    placeholder="Nhà xe Minh Tâm"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="form__group">
                  <label className="form__label" htmlFor="company-phone">Số điện thoại liên hệ *</label>
                  <input
                    id="company-phone"
                    className="form__input"
                    type="tel"
                    required
                    placeholder="0905 234 567"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form__group">
                <label className="form__label" htmlFor="company-rep">Người đại diện pháp luật *</label>
                <input
                  id="company-rep"
                  className="form__input"
                  required
                  placeholder="Nguyễn Minh Tâm"
                  value={form.representativeName}
                  onChange={e => setForm(f => ({ ...f, representativeName: e.target.value }))}
                />
              </div>

              <div className="form__group">
                <label className="form__label" htmlFor="company-address">Địa chỉ trụ sở *</label>
                <input
                  id="company-address"
                  className="form__input"
                  required
                  placeholder="Số nhà, đường, phường/xã, tỉnh/thành phố"
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                />
              </div>

              <div className="form__group">
                <label className="form__label" htmlFor="company-biz">
                  Thông tin đăng ký kinh doanh / Giấy phép vận tải *
                </label>
                <textarea
                  id="company-biz"
                  className="form__textarea"
                  rows={4}
                  required
                  placeholder="Mã số doanh nghiệp, số giấy phép kinh doanh vận tải và mô tả tuyến hoạt động..."
                  value={form.businessInformation}
                  onChange={e => setForm(f => ({ ...f, businessInformation: e.target.value }))}
                />
              </div>

              <div className="form__actions">
                <button className="btn btn--primary btn--lg" type="submit" disabled={submitting}>
                  {submitting ? <Spinner size="sm" /> : (
                    <>
                      <span>Gửi hồ sơ đăng ký</span>
                      <Icon name="right" size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          <aside className="stack">
            <section className="panel">
              <h3 className="panel__title" style={{ marginBottom: 18 }}>Tiến trình xét duyệt</h3>
              <ol className="timeline">
                {[
                  ['1. Gửi thông tin nhà xe', 'Điền đầy đủ hồ sơ doanh nghiệp', true, 'building'],
                  ['2. Admin xác minh hồ sơ', 'Kiểm tra thông tin và giấy phép', false, 'search'],
                  ['3. Bắt đầu vận hành', 'Mở khóa quản lý xe, tài xế và đăng chuyến', false, 'shield'],
                ].map(([t, sub, active, icon], i) => (
                  <li key={String(t)} className="timeline__item">
                    <div className="timeline__rail">
                      <span className={`timeline__dot ${active ? 'timeline__dot--done' : 'timeline__dot--idle'}`}>
                        <Icon name={String(icon)} size={16} />
                      </span>
                      {i < 2 && <span className="timeline__line" />}
                    </div>
                    <div className="timeline__body">
                      <div className="timeline__title">{t}</div>
                      <div className="timeline__sub">{sub}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
            <div className="guidance-box">
              <Icon name="shield" size={20} />
              <span>Hồ sơ cần được quản trị viên phê duyệt trước khi bạn có thể đăng chuyến trên nền tảng.</span>
            </div>
          </aside>
        </div>
      ) : company ? (
        <>
          <div
            className={`status-hero ${
              company.status === 'APPROVED'
                ? 'status-hero--approved'
                : company.status === 'REJECTED'
                  ? 'status-hero--rejected'
                  : 'status-hero--pending'
            }`}
          >
            <div
              className="status-hero__icon"
              style={{
                background:
                  company.status === 'APPROVED'
                    ? 'var(--navy)'
                    : company.status === 'REJECTED'
                      ? 'var(--red-100)'
                      : 'var(--amber-100)',
                color:
                  company.status === 'APPROVED'
                    ? '#ffffff'
                    : company.status === 'REJECTED'
                      ? 'var(--danger)'
                      : 'var(--amber-700)',
              }}
            >
              <Icon
                name={company.status === 'APPROVED' ? 'building' : company.status === 'REJECTED' ? 'x' : 'clock'}
                size={30}
              />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 6 }}>
                <Badge value={company.status} />
              </div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>
                {company.status === 'APPROVED'
                  ? 'Nhà xe đã được phê duyệt'
                  : company.status === 'REJECTED'
                    ? 'Hồ sơ cần được bổ sung'
                    : 'Hồ sơ của bạn đang được xét duyệt'}
              </h2>
              <p style={{ fontSize: 14, color: 'var(--slate-600)', marginTop: 6, lineHeight: 1.55 }}>
                {company.status === 'APPROVED'
                  ? 'Bạn đã có toàn quyền quản lý phương tiện, tài xế, tuyến đường và công bố chuyến đi.'
                  : company.status === 'REJECTED'
                    ? `Lý do từ chối: ${company.rejectReason ?? 'Không có lý do cụ thể.'}`
                    : 'Các tính năng vận hành sẽ tự động mở khóa ngay sau khi quản trị viên phê duyệt hồ sơ.'}
              </p>
            </div>
          </div>

          <div className="two-col">
            <div className="stack">
              <section className="panel">
                <div className="panel__head">
                  <div>
                    <h2 className="panel__title">Thông tin doanh nghiệp &amp; liên hệ</h2>
                    <p className="panel__sub">
                      Mã đối tác #{company.id} · Đăng ký ngày {new Date(company.createdAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>
                <dl className="detail-grid">
                  <div className="detail-item">
                    <dt className="detail-item__label">Tên nhà xe</dt>
                    <dd className="detail-item__value">{company.name}</dd>
                  </div>
                  <div className="detail-item">
                    <dt className="detail-item__label">Người đại diện</dt>
                    <dd className="detail-item__value">{company.representativeName}</dd>
                  </div>
                  <div className="detail-item">
                    <dt className="detail-item__label">Số điện thoại</dt>
                    <dd className="detail-item__value">{company.contactPhone}</dd>
                  </div>
                  <div className="detail-item">
                    <dt className="detail-item__label">Email doanh nghiệp</dt>
                    <dd className="detail-item__value">{company.contactEmail ?? '—'}</dd>
                  </div>
                  <div className="detail-item detail-item--full">
                    <dt className="detail-item__label">Địa chỉ trụ sở</dt>
                    <dd className="detail-item__value">{company.address}</dd>
                  </div>
                  <div className="detail-item">
                    <dt className="detail-item__label">Đánh giá trung bình</dt>
                    <dd className="detail-item__value">
                      {company.avgRating.toFixed(1)} / 5 ({company.ratingCount} đánh giá)
                    </dd>
                  </div>
                </dl>
              </section>

              {approved && (
                <section className="panel">
                  <div className="panel__head">
                    <div>
                      <h2 className="panel__title">Đặt chỗ gần đây</h2>
                      <p className="panel__sub">Cập nhật đặt chỗ mới nhất trên các chuyến của nhà xe</p>
                    </div>
                    <Link to="/company/trips" className="btn btn--ghost btn--sm" style={{ color: 'var(--primary)' }}>
                      Xem theo chuyến →
                    </Link>
                  </div>

                  {recentBookings.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--slate-500)', padding: '12px 0' }}>
                      Chưa có đặt chỗ nào gần đây.
                    </p>
                  ) : (
                    <div className="table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Mã vé</th>
                            <th>Hành khách</th>
                            <th>Tuyến</th>
                            <th>Số chỗ</th>
                            <th>Giá ước tính</th>
                            <th>Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentBookings.map(b => (
                            <tr key={b.id}>
                              <td className="data-table__plate" style={{ color: 'var(--primary)' }}>
                                {b.bookingCode}
                              </td>
                              <td style={{ fontWeight: 600 }}>{b.passengerName}</td>
                              <td style={{ fontSize: 13 }}>
                                {b.origin && b.destination ? `${b.origin} → ${b.destination}` : `Chuyến #${b.tripId}`}
                              </td>
                              <td>{b.seatCount} chỗ</td>
                              <td style={{ fontWeight: 600 }}>{formatVND(b.fareEstimate)}</td>
                              <td><Badge value={b.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}
            </div>

            <aside className="stack">
              <section className="panel">
                <h3 className="panel__title" style={{ marginBottom: 18 }}>Tiến trình phê duyệt</h3>
                <ol className="timeline">
                  {[
                    ['Đã tiếp nhận hồ sơ', new Date(company.createdAt).toLocaleString('vi-VN'), true, 'check'],
                    [
                      'Xác minh thông tin',
                      approved ? 'Đã đối chiếu thông tin doanh nghiệp' : 'Đối chiếu thông tin doanh nghiệp',
                      approved,
                      approved ? 'check' : 'clock',
                    ],
                    [
                      approved
                        ? 'Đã phê duyệt'
                        : company.status === 'REJECTED'
                          ? 'Hồ sơ bị từ chối'
                          : 'Chờ quyết định phê duyệt',
                      approved
                        ? 'Đã mở khóa toàn bộ chức năng vận hành'
                        : company.status === 'REJECTED'
                          ? 'Vui lòng kiểm tra lý do từ chối'
                          : 'Quản trị viên đang xem xét hồ sơ',
                      approved,
                      approved ? 'check' : company.status === 'REJECTED' ? 'x' : 'shield',
                    ],
                  ].map(([t, sub, done, icon], i) => (
                    <li key={String(t)} className="timeline__item">
                      <div className="timeline__rail">
                        <span className={`timeline__dot ${done ? 'timeline__dot--done' : 'timeline__dot--idle'}`}>
                          <Icon name={String(icon)} size={16} />
                        </span>
                        {i < 2 && <span className="timeline__line" />}
                      </div>
                      <div className="timeline__body">
                        <div className="timeline__title">{t}</div>
                        <div className="timeline__sub">{sub}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>

              <div className="navy-card">
                <Icon name="shield" size={24} />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: 12 }}>
                  Đảm bảo chất lượng mỗi hành trình
                </h3>
                <p>
                  Chỉ nhà xe đã được phê duyệt mới được phép quản lý phương tiện, tài xế, tuyến đường và công bố chuyến trên nền tảng.
                </p>
              </div>
            </aside>
          </div>
        </>
      ) : null}
    </AppShell>
  );
}
