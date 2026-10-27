import React, { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi, type CompanyResponse } from '../api/client';
import { Badge } from '../components/Badge';
import { ErrorAlert, SuccessAlert } from '../components/Alert';
import { PageSpinner } from '../components/Spinner';

export function AdminCompanyDetailPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<CompanyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deciding, setDeciding] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const id = Number(companyId);

  useEffect(() => {
    adminApi
      .getCompany(id)
      .then(setCompany)
      .catch(() => setError('Không tải được thông tin nhà xe.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleApprove() {
    if (!window.confirm(`Xác nhận DUYỆT nhà xe "${company?.name}"?`)) return;
    setDeciding(true);
    setError(null);
    try {
      const updated = await adminApi.decide(id, 'APPROVE');
      setCompany(updated);
      setSuccess('Đã duyệt nhà xe thành công.');
    } catch {
      setError('Không thể thực hiện thao tác. Vui lòng thử lại.');
    } finally {
      setDeciding(false);
    }
  }

  async function handleReject(e: FormEvent) {
    e.preventDefault();
    if (!rejectReason.trim()) { setError('Vui lòng nhập lý do từ chối.'); return; }
    setDeciding(true);
    setError(null);
    try {
      const updated = await adminApi.decide(id, 'REJECT', rejectReason.trim());
      setCompany(updated);
      setSuccess('Đã từ chối hồ sơ nhà xe.');
      setShowRejectForm(false);
    } catch {
      setError('Không thể thực hiện thao tác. Vui lòng thử lại.');
    } finally {
      setDeciding(false);
    }
  }

  if (loading) return <PageSpinner />;

  return (
    <div className="shell">
      <header className="topbar">
        <button id="back-btn" className="btn btn--ghost btn--sm" onClick={() => navigate(-1)}>
          ← Quay lại
        </button>
        <div className="topbar__brand">
          <span className="logo-icon">🚌</span>
          <span className="logo-text">RideShareHub</span>
          <span className="topbar__role-badge">Admin</span>
        </div>
      </header>

      <main className="page-content page-content--narrow">
        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
        {success && <SuccessAlert message={success} />}

        {company && (
          <div className="detail-card">
            <div className="detail-card__header">
              <div>
                <h1 className="detail-card__title">{company.name}</h1>
                <p className="detail-card__sub">Đăng ký ngày {new Date(company.createdAt).toLocaleDateString('vi-VN')}</p>
              </div>
              <Badge value={company.status} />
            </div>

            <div className="detail-grid">
              <InfoRow label="Địa chỉ" value={company.address} />
              <InfoRow label="Điện thoại" value={company.contactPhone} />
              <InfoRow label="Email liên hệ" value={company.contactEmail ?? '—'} />
              <InfoRow label="Người đại diện" value={company.representativeName} />
              <InfoRow label="Đánh giá" value={`${company.avgRating} ⭐ (${company.ratingCount} lượt)`} />
              {company.rejectReason && (
                <InfoRow label="Lý do từ chối" value={company.rejectReason} wide highlight="danger" />
              )}
            </div>

            {company.status === 'PENDING' && (
              <div className="decision-bar">
                <button
                  id="approve-btn"
                  className="btn btn--success"
                  onClick={handleApprove}
                  disabled={deciding}
                >
                  ✓ Duyệt
                </button>
                <button
                  id="reject-btn"
                  className="btn btn--danger"
                  onClick={() => setShowRejectForm(v => !v)}
                  disabled={deciding}
                >
                  ✕ Từ chối
                </button>
              </div>
            )}

            {showRejectForm && company.status === 'PENDING' && (
              <form className="reject-form" onSubmit={handleReject} id="reject-form">
                <label className="form__label" htmlFor="reject-reason">Lý do từ chối *</label>
                <textarea
                  id="reject-reason"
                  className="form__textarea"
                  rows={3}
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Nhập lý do từ chối hồ sơ..."
                  required
                />
                <div className="form__actions">
                  <button id="reject-submit" className="btn btn--danger" type="submit" disabled={deciding}>
                    Xác nhận từ chối
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={() => setShowRejectForm(false)}>
                    Huỷ
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function InfoRow({
  label,
  value,
  wide,
  highlight,
}: {
  label: string;
  value: string;
  wide?: boolean;
  highlight?: 'danger';
}) {
  return (
    <div className={`info-row ${wide ? 'info-row--wide' : ''} ${highlight ? `info-row--${highlight}` : ''}`}>
      <dt className="info-row__label">{label}</dt>
      <dd className="info-row__value">{value}</dd>
    </div>
  );
}
