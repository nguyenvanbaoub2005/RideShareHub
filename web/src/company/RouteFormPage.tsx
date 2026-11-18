import React, { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { routeApi, type RouteResponse } from '../api/client';
import { AppShell } from '../components/AppShell';
import { Badge } from '../components/Badge';
import { ErrorAlert, SuccessAlert } from '../components/Alert';
import { Icon } from '../components/Icon';
import { PageSpinner, Spinner } from '../components/Spinner';
import { useAuth } from '../auth/AuthContext';
import { buildCompanyNav, initialsOf } from './companyNav';

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
    if (!form.name.trim() || !form.origin.trim() || !form.destination.trim()) {
      setError('Vui lòng nhập đầy đủ tên tuyến, điểm đi và điểm đến.');
      return;
    }
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
        setSuccess(`Đã cập nhật tuyến ${result.name} thành công.`);
      } else {
        result = await routeApi.addRoute(companyId, payload);
        setSuccess(`Đã thêm tuyến ${result.name} thành công.`);
        setForm(EMPTY);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra.');
    } finally {
      setSaving(false);
    }
  }

  const companyName = session?.companyName ?? 'Nhà xe';
  const previewFare = Number(form.baseFare);

  return (
    <AppShell
      role="COMPANY"
      breadcrumbs={['Không gian nhà xe', 'Quản lý tuyến đường', isEdit ? 'Chỉnh sửa tuyến' : 'Tạo tuyến mới']}
      eyebrow="Quản lý nguồn lực"
      title={isEdit ? 'Chỉnh sửa tuyến đường' : 'Tạo tuyến đường mới'}
      subtitle="Các trường có dấu * là bắt buộc."
      navItems={buildCompanyNav('routes', true)}
      profileName={companyName}
      profileSub="Đối tác đã xác minh"
      profileInitials={initialsOf(companyName)}
      topbarStatus={<Badge value="APPROVED" />}
      logoutId="route-form-logout"
    >
      <button
        id="back-btn"
        type="button"
        className="back-link"
        onClick={() => navigate('/company/routes')}
      >
        <Icon name="left" size={16} />
        <span>Quay lại danh sách tuyến đường</span>
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
                <h2 className="panel__title">Thông tin tuyến đường</h2>
                <p className="panel__sub">Thiết lập điểm đi, điểm đến, thời gian và giá cước cơ sở</p>
              </div>
            </div>

            <form className="form" onSubmit={handleSubmit} id="route-form" noValidate>
              <div className="form__group">
                <label className="form__label" htmlFor="name">Tên tuyến *</label>
                <input
                  id="name"
                  className="form__input"
                  required
                  placeholder="Đà Nẵng - Huế"
                  {...field('name')}
                />
              </div>

              <div className="form__row">
                <div className="form__group">
                  <label className="form__label" htmlFor="origin">Điểm đi *</label>
                  <input
                    id="origin"
                    className="form__input"
                    required
                    placeholder="Đà Nẵng"
                    {...field('origin')}
                  />
                </div>
                <div className="form__group">
                  <label className="form__label" htmlFor="destination">Điểm đến *</label>
                  <input
                    id="destination"
                    className="form__input"
                    required
                    placeholder="Huế"
                    {...field('destination')}
                  />
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
                <label className="form__label" htmlFor="description">Mô tả lộ trình / Điểm dừng chính</label>
                <textarea
                  id="description"
                  className="form__textarea"
                  rows={3}
                  placeholder="Mô tả các điểm dừng chính hoặc lưu ý lộ trình..."
                  {...field('description')}
                />
              </div>

              <div className="form__actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => navigate('/company/routes')}
                >
                  Huỷ
                </button>
                <button id="route-submit" className="btn btn--primary" type="submit" disabled={saving}>
                  {saving ? <Spinner size="sm" /> : (
                    <>
                      <Icon name="check" size={16} />
                      <span>{isEdit ? 'Lưu thay đổi' : 'Lưu tuyến đường'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          <aside className="stack">
            <section className="panel">
              <div className="metric-card__icon metric-card__icon--blue" style={{ width: 44, height: 44 }}>
                <Icon name="route" size={22} />
              </div>
              <h3 className="panel__title" style={{ marginTop: 14 }}>Xem trước tuyến đường</h3>
              <ol className="timeline" style={{ marginTop: 18 }}>
                <li className="timeline__item">
                  <div className="timeline__rail">
                    <span className="timeline__dot timeline__dot--done" style={{ width: 28, height: 28, fontSize: 12, fontWeight: 700 }}>1</span>
                    <span className="timeline__line" style={{ height: 28 }} />
                  </div>
                  <div className="timeline__body" style={{ paddingBottom: 8 }}>
                    <div className="timeline__title">{form.origin.trim() || 'Điểm đi'}</div>
                    <div className="timeline__sub">Khởi hành</div>
                  </div>
                </li>
                <li className="timeline__item">
                  <div className="timeline__rail">
                    <span className="timeline__dot timeline__dot--done" style={{ width: 28, height: 28, fontSize: 12, fontWeight: 700 }}>2</span>
                  </div>
                  <div className="timeline__body" style={{ paddingBottom: 0 }}>
                    <div className="timeline__title">{form.destination.trim() || 'Điểm đến'}</div>
                    <div className="timeline__sub">
                      {form.estimatedMinutes ? `~${form.estimatedMinutes} phút` : 'Chưa nhập thời gian'} ·{' '}
                      {!isNaN(previewFare) && form.baseFare !== ''
                        ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(previewFare)
                        : 'Chưa nhập giá'}
                    </div>
                  </div>
                </li>
              </ol>
            </section>
            <div className="guidance-box">
              <Icon name="info" size={18} />
              <span>Khoảng cách và thời gian là ước tính do nhà xe thiết lập để hiển thị cho hành khách khi tìm chuyến.</span>
            </div>
          </aside>
        </div>
      )}
    </AppShell>
  );
}
