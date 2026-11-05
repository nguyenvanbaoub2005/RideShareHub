import React, { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { driverApi, type DriverResponse } from '../api/client';
import { ErrorAlert, SuccessAlert } from '../components/Alert';
import { PageSpinner, Spinner } from '../components/Spinner';
import { useAuth } from '../auth/AuthContext';

interface FormState {
  fullName: string;
  phone: string;
  licenseNumber: string;
}

const EMPTY: FormState = {
  fullName: '',
  phone: '',
  licenseNumber: '',
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
    setSaving(true);
    setError(null);
    setSuccess(null);
    const payload = {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      licenseNumber: form.licenseNumber.trim(),
    };
    try {
      let result: DriverResponse;
      if (isEdit) {
        result = await driverApi.updateDriver(companyId, Number(driverId), payload);
        setSuccess('Đã cập nhật thông tin tài xế thành công.');
      } else {
        result = await driverApi.addDriver(companyId, payload);
        setSuccess(`Đã thêm tài xế ${result.fullName} thành công.`);
        setForm(EMPTY);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loadingInitial) return <PageSpinner />;

  return (
    <div className="shell">
      <header className="topbar">
        <button id="back-btn" className="btn btn--ghost btn--sm" onClick={() => navigate('/company/drivers')}>
          ← Danh sách tài xế
        </button>
        <div className="topbar__brand">
          <span className="logo-icon">🚌</span>
          <span className="logo-text">RideShareHub</span>
          <span className="topbar__role-badge">Nhà xe</span>
        </div>
      </header>

      <main className="page-content page-content--narrow">
        <div className="page-header">
          <h1 className="page-title">{isEdit ? 'Chỉnh sửa tài xế' : 'Thêm tài xế mới'}</h1>
        </div>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
        {success && <SuccessAlert message={success} />}

        <form className="form form--card" onSubmit={handleSubmit} id="driver-form">
          <div className="form__group">
            <label className="form__label" htmlFor="fullName">Họ và tên *</label>
            <input id="fullName" className="form__input" required placeholder="Nguyễn Văn A" {...field('fullName')} />
          </div>

          <div className="form__row">
            <div className="form__group">
              <label className="form__label" htmlFor="phone">Số điện thoại *</label>
              <input id="phone" className="form__input" required placeholder="0901234567" {...field('phone')} />
            </div>
            <div className="form__group">
              <label className="form__label" htmlFor="licenseNumber">Số bằng lái *</label>
              <input id="licenseNumber" className="form__input" required placeholder="B2-12345678" {...field('licenseNumber')} />
            </div>
          </div>

          <div className="form__actions">
            <button id="driver-submit" className="btn btn--primary" type="submit" disabled={saving}>
              {saving ? <Spinner size="sm" /> : isEdit ? 'Lưu thay đổi' : 'Thêm tài xế'}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => navigate('/company/drivers')}>
              Huỷ
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
