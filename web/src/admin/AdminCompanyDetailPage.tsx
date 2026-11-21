import React, { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi, type CompanyResponse } from '../api/client';
import { AppShell } from '../components/AppShell';
import { Badge } from '../components/Badge';
import { ErrorAlert, SuccessAlert } from '../components/Alert';
import { ConfirmModal } from '../components/ConfirmModal';
import { Icon } from '../components/Icon';
import { PageSpinner } from '../components/Spinner';
import { buildAdminNav } from './adminNav';

export function AdminCompanyDetailPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<CompanyResponse | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deciding, setDeciding] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmType, setConfirmType] = useState<'APPROVE' | 'REJECT' | null>(null);

  const id = Number(companyId);

  useEffect(() => {
    adminApi
      .getCompany(id)
      .then(setCompany)
      .catch(() => setError('Không tải được thông tin nhà xe.'))
      .finally(() => setLoading(false));
    adminApi
      .listRegistrations()
      .then(list => setPendingCount(list.filter(c => c.status === 'PENDING').length))
      .catch(() => {});
  }, [id]);

  async function confirmApprove() {
    setDeciding(true);
    setError(null);
    try {
      const updated = await adminApi.decide(id, 'APPROVE');
      setCompany(updated);
      setPendingCount(c => Math.max(0, c - 1));
      setSuccess(`Đã phê duyệt ${updated.name}. Nhà xe đủ điều kiện công bố chuyến.`);
      setConfirmType(null);
    } catch {
      setError('Không thể thực hiện thao tác. Vui lòng thử lại.');
    } finally {
      setDeciding(false);
    }
  }

  function handleRejectSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!rejectReason.trim()) {
      setError('Vui lòng nhập lý do từ chối để nhà xe có thể bổ sung hồ sơ.');
      return;
    }
    if (rejectReason.trim().length > 500) {
      setError('Lý do từ chối không được vượt quá 500 ký tự.');
      return;
    }
    setConfirmType('REJECT');
  }

  async function confirmReject() {
    setDeciding(true);
    setError(null);
    try {
      const updated = await adminApi.decide(id, 'REJECT', rejectReason.trim());
      setCompany(updated);
      setPendingCount(c => Math.max(0, c - 1));
      setSuccess('Đã từ chối hồ sơ nhà xe. Lý do đã được ghi nhận.');
      setRejectReason('');
      setConfirmType(null);
    } catch {
      setError('Không thể thực hiện thao tác. Vui lòng thử lại.');
    } finally {
      setDeciding(false);
    }
  }

  const navItems = buildAdminNav('companies', { pendingCompanies: pendingCount });

  const topbarStatus = pendingCount > 0 ? (
    <button
      type="button"
      className="topbar__chip"
      onClick={() => navigate('/admin/companies')}
    >
      <Icon name="clock" size={14} />
      <span>{pendingCount} hồ sơ chờ duyệt</span>
    </button>
  ) : undefined;

  return (
    <AppShell
      role="ADMIN"
      breadcrumbs={['Quản trị', 'Quản lý nhà xe', company?.name ?? `#${id}`]}
      eyebrow="Xác minh đối tác vận tải"
      title={company ? company.name : 'Chi tiết hồ sơ nhà xe'}
      subtitle="Kiểm tra thông tin doanh nghiệp, liên hệ và quyết định phê duyệt."
      navItems={navItems}
      profileName="Quản trị viên"
      profileSub="Quyền quản lý hệ thống"
      profileInitials="AD"
      topbarStatus={topbarStatus}
      logoutId="admin-detail-logout"
    >
      <button
        id="back-btn"
        type="button"
        className="back-link"
        onClick={() => navigate('/admin/companies')}
      >
        <Icon name="left" size={16} />
        <span>Quay lại danh sách nhà xe</span>
      </button>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
      {success && <SuccessAlert message={success} onDismiss={() => setSuccess(null)} />}

      {loading ? (
        <PageSpinner />
      ) : company ? (
        <>
          <section className="panel" style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
            <span
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                background: 'var(--navy)',
                color: '#ffffff',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <Icon name="building" size={30} />
            </span>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{company.name}</h2>
                <Badge value={company.status} />
              </div>
              <p style={{ fontSize: 13, color: 'var(--slate-500)', marginTop: 6 }}>
                Mã hồ sơ #{company.id} · Đăng ký ngày {new Date(company.createdAt).toLocaleDateString('vi-VN')}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>Quyền công bố chuyến</div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  justifyContent: 'flex-end',
                  color: company.status === 'APPROVED' ? 'var(--green-700)' : 'var(--slate-500)',
                }}
              >
                <Icon name="shield" size={16} />
                <span>{company.status === 'APPROVED' ? 'Đã được cấp quyền' : 'Chưa được cấp quyền'}</span>
              </div>
            </div>
          </section>

          <div className="two-col two-col--aside">
            <div className="stack">
              <section className="panel">
                <div className="panel__head">
                  <h3 className="panel__title">Thông tin đăng ký doanh nghiệp</h3>
                </div>
                <dl className="detail-grid">
                  <div className="detail-item">
                    <dt className="detail-item__label">Tên doanh nghiệp</dt>
                    <dd className="detail-item__value">{company.name}</dd>
                  </div>
                  <div className="detail-item">
                    <dt className="detail-item__label">Đánh giá nền tảng</dt>
                    <dd className="detail-item__value">
                      {company.avgRating.toFixed(1)} / 5 ({company.ratingCount} lượt)
                    </dd>
                  </div>
                  <div className="detail-item detail-item--full">
                    <dt className="detail-item__label">Địa chỉ trụ sở</dt>
                    <dd className="detail-item__value">{company.address}</dd>
                  </div>
                </dl>
              </section>

              <section className="panel">
                <div className="panel__head">
                  <h3 className="panel__title">Thông tin liên hệ</h3>
                </div>
                <dl className="detail-grid">
                  <div className="detail-item">
                    <dt className="detail-item__label">Người đại diện</dt>
                    <dd className="detail-item__value">{company.representativeName}</dd>
                  </div>
                  <div className="detail-item">
                    <dt className="detail-item__label">Số điện thoại</dt>
                    <dd className="detail-item__value">{company.contactPhone}</dd>
                  </div>
                  <div className="detail-item detail-item--full">
                    <dt className="detail-item__label">Email doanh nghiệp</dt>
                    <dd className="detail-item__value">{company.contactEmail ?? '—'}</dd>
                  </div>
                </dl>
              </section>
            </div>

            <aside className="stack">
              <section className="panel">
                <h3 className="panel__title">Xét duyệt hồ sơ</h3>
                <p className="panel__sub" style={{ lineHeight: 1.6, marginTop: 6 }}>
                  Kiểm tra tính hợp lệ của thông tin doanh nghiệp trước khi đưa ra quyết định.
                </p>

                {company.status === 'PENDING' ? (
                  <div className="stack" style={{ marginTop: 18 }}>
                    <div className="guidance-box" style={{ padding: 14, fontSize: 12 }}>
                      <Icon name="info" size={16} />
                      <span>Phê duyệt sẽ cấp quyền quản lý đội xe, tuyến đường và công bố chuyến cho nhà xe.</span>
                    </div>

                    <button
                      id="approve-btn"
                      type="button"
                      className="btn btn--primary btn--full"
                      disabled={deciding}
                      onClick={() => setConfirmType('APPROVE')}
                    >
                      <Icon name="check" size={16} />
                      <span>Phê duyệt nhà xe</span>
                    </button>

                    <form
                      id="reject-form"
                      onSubmit={handleRejectSubmit}
                      style={{ borderTop: '1px solid var(--line)', paddingTop: 18, marginTop: 4 }}
                    >
                      <div className="form__group">
                        <label className="form__label" htmlFor="reject-reason">
                          Lý do từ chối <span style={{ color: 'var(--danger)' }}>*</span>
                        </label>
                        <textarea
                          id="reject-reason"
                          className="form__textarea"
                          rows={4}
                          maxLength={500}
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          placeholder="Nêu rõ thông tin hoặc tài liệu cần nhà xe bổ sung..."
                        />
                        <div style={{ fontSize: 11, color: 'var(--slate-400)', textAlign: 'right' }}>
                          {rejectReason.length}/500
                        </div>
                      </div>
                      <button
                        id="reject-submit"
                        type="submit"
                        className="btn btn--danger btn--full"
                        style={{ marginTop: 12 }}
                        disabled={deciding}
                      >
                        <Icon name="x" size={16} />
                        <span>Từ chối hồ sơ</span>
                      </button>
                    </form>
                  </div>
                ) : (
                  <div style={{ marginTop: 18 }}>
                    <div style={{ marginBottom: 14 }}>
                      <Badge value={company.status} />
                    </div>
                    {company.status === 'REJECTED' ? (
                      <div className="alert alert--error" style={{ marginBottom: 0 }}>
                        <div>
                          <strong style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
                            Lý do từ chối
                          </strong>
                          {company.rejectReason ?? 'Không có lý do cụ thể.'}
                        </div>
                      </div>
                    ) : (
                      <div className="alert alert--success" style={{ marginBottom: 0 }}>
                        Nhà xe đã đủ điều kiện đăng chuyến. Mọi chuyến vẫn phải đáp ứng quy tắc phân công và sức chứa.
                      </div>
                    )}
                    <p style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 14, lineHeight: 1.5 }}>
                      Hồ sơ đã có quyết định, không thể thay đổi lại trong luồng xét duyệt này.
                    </p>
                  </div>
                )}
              </section>
            </aside>
          </div>
        </>
      ) : null}

      <ConfirmModal
        open={confirmType === 'APPROVE'}
        title="Xác nhận phê duyệt nhà xe?"
        message={`Xác nhận phê duyệt "${company?.name ?? ''}"? Nhà xe sẽ được cấp quyền quản lý phương tiện, tài xế, tuyến đường và công bố chuyến đi.`}
        confirmLabel="Xác nhận phê duyệt"
        loading={deciding}
        onCancel={() => setConfirmType(null)}
        onConfirm={confirmApprove}
      />

      <ConfirmModal
        open={confirmType === 'REJECT'}
        destructive
        title="Xác nhận từ chối hồ sơ?"
        message={`Từ chối hồ sơ "${company?.name ?? ''}" với lý do: ${rejectReason.trim()}`}
        confirmLabel="Xác nhận từ chối"
        loading={deciding}
        onCancel={() => setConfirmType(null)}
        onConfirm={confirmReject}
      />
    </AppShell>
  );
}
