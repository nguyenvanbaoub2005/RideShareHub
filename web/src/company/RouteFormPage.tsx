import React, { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { routeApi, type RouteResponse } from '../api/client';
import { ErrorAlert, SuccessAlert } from '../components/Alert';
import { PageSpinner, Spinner } from '../components/Spinner';
import { useAuth } from '../auth/AuthContext';

interface FormState {
  name: string;
  origin: string;
  destination: string;
  estimatedMinutes: string;
  baseFare: string;
  description: string;
}

const EMPTY: FormState = {
  name: '',
  origin: '',
  destination: '',
  estimatedMinutes: '',
  baseFare: '',
  description: '',
};

export function RouteFormPage() {
  const { routeId } = useParams<{ routeId?: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  const isEdit = routeId != null;
  const companyId = session?.companyId;

  const [form, setForm] = useState<FormState>(EMPTY);
  const [loadingInitial, setLoadingInitial] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || !companyId) return;
    routeApi
      .listRoutes(companyId)
      .then(rs => {
        const r = rs.find(x => x.id === Number(routeId));
        if (r) {
          setForm({
            name: r.name,
            origin: r.origin,
            destination: r.destination,
            estimatedMinutes: String(r.estimatedMinutes),
            baseFare: String(r.baseFare),
            description: r.description ?? '',
          });
        }
      })
      .catch(() => setError('Không tải được thông tin tuyến đường.'))
      .finally(() => setLoadingInitial(false));
  }, [isEdit, routeId, companyId]);

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
    const minutes = Number(form.estimatedMinutes);
    if (!Number.isInteger(minutes) || minutes < 1) {
      setError('Thời gian ước tính phải là số nguyên dương (phút).');
      return;
    }
    const fare = Number(form.baseFare);
    if (isNaN(fare) || fare < 0) {
      setError('Giá cước cơ sở phải là số không âm.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    const payload = {
      name: form.name.trim(),
      origin: form.origin.trim(),
      destination: form.destination.trim(),
      estimatedMinutes: minutes,
      baseFare: fare,
      description: form.description.trim() || undefined,
    };
    try {
      let result: RouteResponse;
      if (isEdit) {
        result = await routeApi.updateRoute(companyId, Number(routeId), payload);
        setSuccess('Đã cập nhật thông tin tuyến đường thành công.');
      } else {
        result = await routeApi.addRoute(companyId, payload);
        setSuccess(`Đã thêm tuyến ${result.name} thành công.`);
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
        <button id="back-btn" className="btn btn--ghost btn--sm" onClick={() => navigate('/company/routes')}>
          ← Tuyến đường
        </button>
        <div className="topbar__brand">
          <span className="logo-icon">🚌</span>
          <span className="logo-text">RideShareHub</span>
          <span className="topbar__role-badge">Nhà xe</span>
        </div>
      </header>

      <main className="page-content page-content--narrow">
        <div className="page-header">
          <h1 className="page-title">{isEdit ? 'Chỉnh sửa tuyến đường' : 'Thêm tuyến mới'}</h1>
        </div>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
        {success && <SuccessAlert message={success} />}

        <form className="form form--card" onSubmit={handleSubmit} id="route-form">
          <div className="form__group">
            <label className="form__label" htmlFor="name">Tên tuyến *</label>
            <input id="name" className="form__input" required placeholder="Đà Nẵng - Huế" {...field('name')} />
          </div>

          <div className="form__row">
            <div className="form__group">
              <label className="form__label" htmlFor="origin">Điểm đi (Origin) *</label>
              <input id="origin" className="form__input" required placeholder="Bến xe Đà Nẵng" {...field('origin')} />
            </div>
            <div className="form__group">
              <label className="form__label" htmlFor="destination">Điểm đến (Destination) *</label>
              <input id="destination" className="form__input" required placeholder="Bến xe phía Nam Huế" {...field('destination')} />
            </div>
          </div>

          <div className="form__row">
            <div className="form__group">
              <label className="form__label" htmlFor="estimatedMinutes">Thời gian ước tính (phút) *</label>
              <input
                id="estimatedMinutes"
                className="form__input"
                type="number"
                min={1}
                required
                placeholder="120"
                {...field('estimatedMinutes')}
              />
            </div>
            <div className="form__group">
              <label className="form__label" htmlFor="baseFare">Giá cơ sở (VNĐ) *</label>
              <input
                id="baseFare"
                className="form__input"
                type="number"
                min={0}
                step={1000}
                required
                placeholder="150000"
                {...field('baseFare')}
              />
            </div>
          </div>

          <div className="form__group">
            <label className="form__label" htmlFor="description">Mô tả lộ trình</label>
            <textarea
              id="description"
              className="form__textarea"
              rows={3}
              placeholder="Mô tả các điểm dừng chính hoặc thông tin lộ trình..."
              {...field('description')}
            />
          </div>

          <div className="form__actions">
            <button id="route-submit" className="btn btn--primary" type="submit" disabled={saving}>
              {saving ? <Spinner size="sm" /> : isEdit ? 'Lưu thay đổi' : 'Thêm tuyến'}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => navigate('/company/routes')}>
              Huỷ
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
