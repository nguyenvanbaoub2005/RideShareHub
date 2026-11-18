import React, { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { companyApi, type VehicleResponse } from '../api/client';
import { AppShell } from '../components/AppShell';
import { Badge } from '../components/Badge';
import { ErrorAlert, SuccessAlert } from '../components/Alert';
import { Icon } from '../components/Icon';
import { PageSpinner, Spinner } from '../components/Spinner';
import { useAuth } from '../auth/AuthContext';
import { buildCompanyNav, initialsOf } from './companyNav';

interface FormState {
  plateNumber: string;
  vehicleType: string;
  brand: string;
  model: string;
  seatCapacity: string;
  description: string;
}

const EMPTY: FormState = {
  plateNumber: '',
  vehicleType: '',
  brand: '',
  model: '',
  seatCapacity: '',
  description: '',
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
    if (!form.plateNumber.trim() || !form.vehicleType.trim()) {
      setError('Vui lòng nhập đầy đủ biển số và loại phương tiện.');
      return;
    }
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
        setSuccess(`Đã cập nhật thông tin xe ${result.plateNumber} thành công.`);
      } else {
        result = await companyApi.addVehicle(companyId, payload);
        setSuccess(`Đã thêm xe ${result.plateNumber} thành công.`);
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
      breadcrumbs={['Không gian nhà xe', 'Quản lý phương tiện', isEdit ? 'Chỉnh sửa xe' : 'Thêm xe mới']}
      eyebrow="Quản lý nguồn lực"
      title={isEdit ? 'Chỉnh sửa phương tiện' : 'Thêm phương tiện mới'}
      subtitle="Các trường có dấu * là bắt buộc."
      navItems={buildCompanyNav('vehicles', true)}
      profileName={companyName}
      profileSub="Đối tác đã xác minh"
      profileInitials={initialsOf(companyName)}
      topbarStatus={<Badge value="APPROVED" />}
      logoutId="vehicle-form-logout"
    >
      <button
        id="back-btn"
        type="button"
        className="back-link"
        onClick={() => navigate('/company/vehicles')}
      >
        <Icon name="left" size={16} />
        <span>Quay lại danh sách phương tiện</span>
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
                <h2 className="panel__title">Thông tin phương tiện</h2>
                <p className="panel__sub">Biển số duy nhất giúp nhận diện chính xác khi phân công chuyến</p>
              </div>
            </div>

            <form className="form" onSubmit={handleSubmit} id="vehicle-form">
              <div className="form__row">
                <div className="form__group">
                  <label className="form__label" htmlFor="plateNumber">Biển số xe *</label>
                  <input
                    id="plateNumber"
                    className="form__input"
                    required
                    placeholder="43A-123.45"
                    disabled={isEdit}
                    {...field('plateNumber')}
                  />
                  {isEdit && <span className="form__hint">Biển số không thay đổi sau khi tạo</span>}
                </div>
                <div className="form__group">
                  <label className="form__label" htmlFor="vehicleType">Loại xe *</label>
                  <input
                    id="vehicleType"
                    className="form__input"
                    required
                    placeholder="Limousine / Xe khách / Minibus"
                    {...field('vehicleType')}
                  />
                </div>
              </div>

              <div className="form__row">
                <div className="form__group">
                  <label className="form__label" htmlFor="brand">Hãng xe</label>
                  <input id="brand" className="form__input" placeholder="Ford / Hyundai" {...field('brand')} />
                </div>
                <div className="form__group">
                  <label className="form__label" htmlFor="model">Mẫu xe</label>
                  <input id="model" className="form__input" placeholder="Transit / Solati" {...field('model')} />
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
                <label className="form__label" htmlFor="description">Thông tin bổ sung</label>
                <textarea
                  id="description"
                  className="form__textarea"
                  rows={3}
                  placeholder="Trang bị, lịch bảo dưỡng hoặc ghi chú vận hành..."
                  {...field('description')}
                />
              </div>

              <div className="form__actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => navigate('/company/vehicles')}
                >
                  Huỷ
                </button>
                <button id="vehicle-submit" className="btn btn--primary" type="submit" disabled={saving}>
                  {saving ? <Spinner size="sm" /> : (
                    <>
                      <Icon name="check" size={16} />
                      <span>{isEdit ? 'Lưu thay đổi' : 'Thêm phương tiện'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          <aside className="stack">
            <section className="panel">
              <div className="metric-card__icon metric-card__icon--blue" style={{ width: 44, height: 44 }}>
                <Icon name="car" size={22} />
              </div>
              <h3 className="panel__title" style={{ marginTop: 14 }}>Hồ sơ phương tiện</h3>
              <p style={{ fontSize: 13, color: 'var(--slate-500)', lineHeight: 1.6, marginTop: 8 }}>
                Cập nhật đúng số ghế và trạng thái bảo dưỡng để hệ thống kiểm tra sức chứa và tránh phân công nhầm chuyến.
              </p>
            </section>
            <div className="guidance-box">
              <Icon name="info" size={18} />
              <span>Số ghế của phương tiện là giới hạn tối đa cho số chỗ mở bán trên mỗi chuyến đi.</span>
            </div>
          </aside>
        </div>
      )}
    </AppShell>
  );
}
