import React, { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { driverApi, type DriverResponse } from '../api/client';
import { AppShell } from '../components/AppShell';
import { Badge } from '../components/Badge';
import { ErrorAlert, SuccessAlert } from '../components/Alert';
import { Icon } from '../components/Icon';
import { PageSpinner, Spinner } from '../components/Spinner';
import { useAuth } from '../auth/AuthContext';
import { buildCompanyNav, initialsOf } from './companyNav';

interface FormState {
  fullName: string;
  phone: string;
  licenseNumber: string;
  email: string;
  password: string;
}

const EMPTY: FormState = {
  fullName: '',
  phone: '',
  licenseNumber: '',
  email: '',
  password: '',
};

export function DriverFormPage() {
  const { driverId } = useParams<{ driverId?: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  const isEdit = driverId != null;
  const companyId = session?.companyId;

  const [form, setForm] = useState<FormState>(EMPTY);
  const [loadingInitial, setLoadingInitial] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || !companyId) return;
    driverApi
      .listDrivers(companyId)
      .then(ds => {
        const d = ds.find(x => x.id === Number(driverId));
        if (d) {
          setForm({
            fullName: d.fullName,
            phone: d.phone,
            licenseNumber: d.licenseNumber,
            email: '',
            password: '',
          });
        }
      })
      .catch(() => setError('Không tải được thông tin tài xế.'))
      .finally(() => setLoadingInitial(false));
  }, [isEdit, driverId, companyId]);

  function field(key: keyof FormState) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(f => ({ ...f, [key]: e.target.value })),
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!companyId) return;
    if (!form.fullName.trim() || !form.phone.trim() || !form.licenseNumber.trim()) {
      setError('Vui lòng nhập đầy đủ họ tên, số điện thoại và số bằng lái.');
      return;
    }

    const emailVal = form.email.trim();
    const passVal = form.password;
    if (!isEdit && (Boolean(emailVal) !== Boolean(passVal))) {
      setError('Vui lòng nhập cả Email và Mật khẩu nếu muốn cấp tài khoản đăng nhập app cho tài xế.');
      return;
    }
    if (!isEdit && passVal && passVal.length < 8) {
      setError('Mật khẩu tài khoản tài xế phải có ít nhất 8 ký tự.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      let result: DriverResponse;
      if (isEdit) {
        result = await driverApi.updateDriver(companyId, Number(driverId), {
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          licenseNumber: form.licenseNumber.trim(),
        });
        setSuccess(`Đã cập nhật thông tin tài xế ${result.fullName} thành công.`);
      } else {
        result = await driverApi.addDriver(companyId, {
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          licenseNumber: form.licenseNumber.trim(),
          ...(emailVal ? { email: emailVal, password: passVal } : {}),
        });
        setSuccess(
          emailVal
            ? `Đã thêm tài xế ${result.fullName} và tạo tài khoản đăng nhập (${emailVal}) thành công.`
            : `Đã thêm tài xế ${result.fullName} thành công.`,
        );
        setForm(EMPTY);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra.');
    } finally {
      setSaving(false);
    }
  }

  const companyName = session?.companyName ?? 'Nhà xe';

  return (
    <AppShell
      role="COMPANY"
      breadcrumbs={['Không gian nhà xe', 'Quản lý tài xế', isEdit ? 'Chỉnh sửa tài xế' : 'Thêm tài xế mới']}
      eyebrow="Quản lý nguồn lực"
      title={isEdit ? 'Chỉnh sửa thông tin tài xế' : 'Thêm tài xế mới'}
      subtitle="Các trường có dấu * là bắt buộc."
      navItems={buildCompanyNav('drivers', true)}
      profileName={companyName}
      profileSub="Đối tác đã xác minh"
      profileInitials={initialsOf(companyName)}
      topbarStatus={<Badge value="APPROVED" />}
      logoutId="driver-form-logout"
    >
      <button
        id="back-btn"
        type="button"
        className="back-link"
        onClick={() => navigate('/company/drivers')}
      >
        <Icon name="left" size={16} />
        <span>Quay lại danh sách tài xế</span>
      </button>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
      {success && <SuccessAlert message={success} onDismiss={() => setSuccess(null)} />}

      {loadingInitial ? (
        <PageSpinner />
      ) : (
        <div className="two-col two-col--aside">
          <section className="panel">
            <div className="panel__head">
              <div>
                <h2 className="panel__title">Hồ sơ tài xế</h2>
                <p className="panel__sub">Thông tin liên hệ và giấy phép lái xe</p>
              </div>
            </div>

            <form className="form" onSubmit={handleSubmit} id="driver-form" noValidate>
              <div className="form__group">
                <label className="form__label" htmlFor="fullName">Họ và tên *</label>
                <input
                  id="fullName"
                  className="form__input"
                  required
                  placeholder="Nguyễn Văn Hải"
                  {...field('fullName')}
                />
              </div>

              <div className="form__row">
                <div className="form__group">
                  <label className="form__label" htmlFor="phone">Số điện thoại *</label>
                  <input
                    id="phone"
                    className="form__input"
                    type="tel"
                    required
                    placeholder="0905 111 222"
                    {...field('phone')}
                  />
                </div>
                <div className="form__group">
                  <label className="form__label" htmlFor="licenseNumber">Số bằng lái *</label>
                  <input
                    id="licenseNumber"
                    className="form__input"
                    required
                    placeholder="B2-12345678"
                    {...field('licenseNumber')}
                  />
                </div>
              </div>

              {!isEdit && (
                <div
                  style={{
                    borderTop: '1px solid var(--line)',
                    paddingTop: 18,
                    marginTop: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                  }}
                >
                  <div>
                    <div className="form__label" style={{ fontWeight: 700 }}>
                      Tài khoản đăng nhập ứng dụng Tài xế (tuỳ chọn)
                    </div>
                    <div className="form__hint" style={{ marginTop: 2 }}>
                      Cấp email và mật khẩu để tài xế có thể đăng nhập trên ứng dụng di động xem chuyến được giao.
                    </div>
                  </div>
                  <div className="form__row">
                    <div className="form__group">
                      <label className="form__label" htmlFor="driver-email">Email tài xế</label>
                      <input
                        id="driver-email"
                        className="form__input"
                        type="email"
                        placeholder="taixe@nhaxe.vn"
                        {...field('email')}
                      />
                    </div>
                    <div className="form__group">
                      <label className="form__label" htmlFor="driver-password">Mật khẩu (tối thiểu 8 ký tự)</label>
                      <input
                        id="driver-password"
                        className="form__input"
                        type="password"
                        placeholder="••••••••"
                        {...field('password')}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="form__actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => navigate('/company/drivers')}
                >
                  Huỷ
                </button>
                <button id="driver-submit" className="btn btn--primary" type="submit" disabled={saving}>
                  {saving ? <Spinner size="sm" /> : (
                    <>
                      <Icon name="check" size={16} />
                      <span>{isEdit ? 'Lưu thay đổi' : 'Thêm tài xế'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          <aside className="stack">
            <section className="panel">
              <div className="metric-card__icon metric-card__icon--teal" style={{ width: 44, height: 44 }}>
                <Icon name="shield" size={22} />
              </div>
              <h3 className="panel__title" style={{ marginTop: 14 }}>An toàn mỗi hành trình</h3>
              <p style={{ fontSize: 13, color: 'var(--slate-500)', lineHeight: 1.6, marginTop: 8 }}>
                Thông tin liên hệ và số bằng lái giúp điều phối viên xác minh nhanh và tránh trùng lịch phân công tài xế.
              </p>
            </section>
            <div className="guidance-box">
              <Icon name="info" size={18} />
              <span>Khi tạo tài xế kèm Email &amp; Mật khẩu, tài xế có thể đăng nhập app di động để xem danh sách chuyến được phân công.</span>
            </div>
          </aside>
        </div>
      )}
    </AppShell>
  );
}
