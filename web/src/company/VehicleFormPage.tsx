import React, { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { companyApi, type VehicleResponse } from '../api/client';
import { ErrorAlert, SuccessAlert } from '../components/Alert';
import { PageSpinner, Spinner } from '../components/Spinner';
import { useAuth } from '../auth/AuthContext';

interface FormState {
  plateNumber: string;
  vehicleType: string;
  brand: string;
  model: string;
  seatCapacity: string;
  description: string;
}

const EMPTY: FormState = {
  plateNumber: '', vehicleType: '', brand: '', model: '', seatCapacity: '', description: '',
};

export function VehicleFormPage() {
  const { vehicleId } = useParams<{ vehicleId?: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  const isEdit = vehicleId != null;
  const companyId = session?.companyId;

  const [form, setForm] = useState<FormState>(EMPTY);
  const [loadingInitial, setLoadingInitial] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || !companyId) return;
    companyApi
      .listVehicles(companyId)
      .then(vs => {
        const v = vs.find(x => x.id === Number(vehicleId));
        if (v) {
          setForm({
            plateNumber: v.plateNumber,
            vehicleType: v.vehicleType,
            brand: v.brand ?? '',
            model: v.model ?? '',
            seatCapacity: String(v.seatCapacity),
            description: v.description ?? '',
          });
        }
      })
      .catch(() => setError('Không tải được thông tin xe.'))
      .finally(() => setLoadingInitial(false));
  }, [isEdit, vehicleId, companyId]);

  function field(key: keyof FormState) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(f => ({ ...f, [key]: e.target.value })),
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!companyId) return;
    const capacity = Number(form.seatCapacity);
    if (!Number.isInteger(capacity) || capacity < 1) {
      setError('Số ghế phải là số nguyên lớn hơn 0.');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    const payload = {
      plateNumber: form.plateNumber.trim().toUpperCase(),
      vehicleType: form.vehicleType.trim(),
      brand: form.brand.trim() || undefined,
      model: form.model.trim() || undefined,
      seatCapacity: capacity,
      description: form.description.trim() || undefined,
    };
    try {
      let result: VehicleResponse;
      if (isEdit) {
        result = await companyApi.updateVehicle(companyId, Number(vehicleId), payload);
        setSuccess('Đã cập nhật thông tin xe thành công.');
      } else {
        result = await companyApi.addVehicle(companyId, payload);
        setSuccess(`Đã thêm xe ${result.plateNumber} thành công.`);
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
        <button id="back-btn" className="btn btn--ghost btn--sm" onClick={() => navigate('/company/vehicles')}>
          ← Đội xe
        </button>
        <div className="topbar__brand">
          <span className="logo-icon">🚌</span>
          <span className="logo-text">RideShareHub</span>
          <span className="topbar__role-badge">Nhà xe</span>
        </div>
      </header>

      <main className="page-content page-content--narrow">
        <div className="page-header">
          <h1 className="page-title">{isEdit ? 'Chỉnh sửa xe' : 'Thêm xe mới'}</h1>
        </div>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
        {success && <SuccessAlert message={success} />}

        <form className="form form--card" onSubmit={handleSubmit} id="vehicle-form">
          <div className="form__row">
            <div className="form__group">
              <label className="form__label" htmlFor="plateNumber">Biển số xe *</label>
              <input id="plateNumber" className="form__input" required placeholder="51A-12345" {...field('plateNumber')} />
            </div>
            <div className="form__group">
              <label className="form__label" htmlFor="vehicleType">Loại xe *</label>
              <input id="vehicleType" className="form__input" required placeholder="BUS / MINIBUS / VAN" {...field('vehicleType')} />
            </div>
          </div>

          <div className="form__row">
            <div className="form__group">
              <label className="form__label" htmlFor="brand">Hãng xe</label>
              <input id="brand" className="form__input" placeholder="Toyota" {...field('brand')} />
            </div>
            <div className="form__group">
              <label className="form__label" htmlFor="model">Mẫu xe</label>
              <input id="model" className="form__input" placeholder="Hiace" {...field('model')} />
            </div>
          </div>

          <div className="form__group">
            <label className="form__label" htmlFor="seatCapacity">Số ghế *</label>
            <input
              id="seatCapacity"
              className="form__input form__input--narrow"
              type="number"
              min={1}
              required
              placeholder="16"
              {...field('seatCapacity')}
            />
          </div>

          <div className="form__group">
            <label className="form__label" htmlFor="description">Mô tả</label>
            <textarea
              id="description"
              className="form__textarea"
              rows={3}
              placeholder="Ghi chú thêm về phương tiện..."
              {...field('description')}
            />
          </div>

          <div className="form__actions">
            <button id="vehicle-submit" className="btn btn--primary" type="submit" disabled={saving}>
              {saving ? <Spinner size="sm" /> : isEdit ? 'Lưu thay đổi' : 'Thêm xe'}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => navigate('/company/vehicles')}>
              Huỷ
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
