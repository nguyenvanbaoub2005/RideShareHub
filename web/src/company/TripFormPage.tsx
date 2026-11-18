import React, { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  companyApi,
  driverApi,
  routeApi,
  tripApi,
  type DriverResponse,
  type RouteResponse,
  type VehicleResponse,
} from '../api/client';
import { AppShell } from '../components/AppShell';
import { Badge } from '../components/Badge';
import { ErrorAlert, SuccessAlert } from '../components/Alert';
import { Icon } from '../components/Icon';
import { PageSpinner, Spinner } from '../components/Spinner';
import { useAuth } from '../auth/AuthContext';
import { buildCompanyNav, initialsOf } from './companyNav';

interface FormState {
  routeId: string;
  vehicleId: string;
  driverId: string;
  departureTime: string;
  fare: string;
  note: string;
}

const EMPTY: FormState = {
  routeId: '',
  vehicleId: '',
  driverId: '',
  departureTime: '',
  fare: '',
  note: '',
};

export function TripFormPage() {
  const { tripId } = useParams<{ tripId?: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  const isEdit = tripId != null;
  const companyId = session?.companyId;

  const [form, setForm] = useState<FormState>(EMPTY);
  const [routes, setRoutes] = useState<RouteResponse[]>([]);
  const [vehicles, setVehicles] = useState<VehicleResponse[]>([]);
  const [drivers, setDrivers] = useState<DriverResponse[]>([]);

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;

    Promise.all([
      routeApi.listRoutes(companyId),
      companyApi.listVehicles(companyId),
      driverApi.listDrivers(companyId),
      isEdit ? tripApi.listTrips(companyId) : Promise.resolve([]),
    ])
      .then(([rs, vs, ds, ts]) => {
        setRoutes(rs);
        setVehicles(vs);
        setDrivers(ds);

        if (isEdit) {
          const trip = ts.find(x => x.id === Number(tripId));
          if (trip) {
            const date = new Date(trip.departureTime);
            const pad = (n: number) => String(n).padStart(2, '0');
            const localDt = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

            setForm({
              routeId: String(trip.routeId),
              vehicleId: String(trip.vehicleId),
              driverId: String(trip.driverId),
              departureTime: localDt,
              fare: String(trip.fare),
              note: trip.note ?? '',
            });
          }
        }
      })
      .catch(() => setError('Không thể tải dữ liệu ban đầu.'))
      .finally(() => setLoadingInitial(false));
  }, [isEdit, tripId, companyId]);

  function handleRouteChange(routeIdVal: string) {
    const selectedRoute = routes.find(r => String(r.id) === routeIdVal);
    setForm(f => ({
      ...f,
      routeId: routeIdVal,
      fare: selectedRoute && !f.fare ? String(selectedRoute.baseFare) : f.fare,
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!companyId) return;

    if (!form.routeId || !form.vehicleId || !form.driverId || !form.departureTime) {
      setError('Vui lòng điền đầy đủ các trường bắt buộc.');
      return;
    }

    const fareNum = Number(form.fare);
    if (isNaN(fareNum) || fareNum < 0) {
      setError('Giá vé phải là số không âm.');
      return;
    }

    const depDate = new Date(form.departureTime);
    if (isNaN(depDate.getTime())) {
      setError('Thời gian khởi hành không hợp lệ.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      routeId: Number(form.routeId),
      vehicleId: Number(form.vehicleId),
      driverId: Number(form.driverId),
      departureTime: depDate.toISOString(),
      fare: fareNum,
      note: form.note.trim() || undefined,
    };

    try {
      if (isEdit) {
        await tripApi.updateTrip(companyId, Number(tripId), payload);
        setSuccess('Đã cập nhật chuyến xe thành công.');
      } else {
        await tripApi.createTrip(companyId, payload);
        setSuccess('Đã tạo chuyến xe mới ở trạng thái Bản nháp (DRAFT).');
        setForm(EMPTY);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra.');
    } finally {
      setSaving(false);
    }
  }

  const companyName = session?.companyName ?? 'Nhà xe';
  const selectedRoute = routes.find(r => String(r.id) === form.routeId);
  const selectedVehicle = vehicles.find(v => String(v.id) === form.vehicleId);
  const selectedDriver = drivers.find(d => String(d.id) === form.driverId);

  return (
    <AppShell
      role="COMPANY"
      breadcrumbs={['Không gian nhà xe', 'Quản lý chuyến đi', isEdit ? 'Chỉnh sửa chuyến' : 'Tạo chuyến mới']}
      eyebrow="Điều hành vận tải"
      title={isEdit ? 'Chỉnh sửa chuyến xe' : 'Tạo chuyến xe mới'}
      subtitle="Các trường có dấu * là bắt buộc · Giờ khởi hành tính theo múi giờ địa phương."
      navItems={buildCompanyNav('trips', true)}
      profileName={companyName}
      profileSub="Đối tác đã xác minh"
      profileInitials={initialsOf(companyName)}
      topbarStatus={<Badge value="APPROVED" />}
      logoutId="trip-form-logout"
    >
      <button
        id="back-btn"
        type="button"
        className="back-link"
        onClick={() => navigate('/company/trips')}
      >
        <Icon name="left" size={16} />
        <span>Quay lại danh sách chuyến xe</span>
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
                <h2 className="panel__title">{isEdit ? `Chỉnh sửa chuyến #${tripId}` : 'Thông tin chuyến mới'}</h2>
                <p className="panel__sub">Hệ thống tự động kiểm tra xung đột lịch xe và tài xế</p>
              </div>
            </div>

            <form className="form" onSubmit={handleSubmit} id="trip-form" noValidate>
              <div className="form__group">
                <label className="form__label" htmlFor="routeId">Tuyến đường *</label>
                <select
                  id="routeId"
                  className="form__select"
                  required
                  value={form.routeId}
                  onChange={e => handleRouteChange(e.target.value)}
                >
                  <option value="">-- Chọn tuyến đường --</option>
                  {routes.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.origin} → {r.destination} · ~{r.estimatedMinutes} phút)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form__row">
                <div className="form__group">
                  <label className="form__label" htmlFor="vehicleId">Phương tiện *</label>
                  <select
                    id="vehicleId"
                    className="form__select"
                    required
                    value={form.vehicleId}
                    onChange={e => setForm(f => ({ ...f, vehicleId: e.target.value }))}
                  >
                    <option value="">-- Chọn xe --</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.plateNumber} ({v.seatCapacity} chỗ · {v.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form__group">
                  <label className="form__label" htmlFor="driverId">Tài xế *</label>
                  <select
                    id="driverId"
                    className="form__select"
                    required
                    value={form.driverId}
                    onChange={e => setForm(f => ({ ...f, driverId: e.target.value }))}
                  >
                    <option value="">-- Chọn tài xế --</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.fullName} ({d.phone} · {d.status})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form__row">
                <div className="form__group">
                  <label className="form__label" htmlFor="departureTime">Thời gian khởi hành *</label>
                  <input
                    id="departureTime"
                    className="form__input"
                    type="datetime-local"
                    required
                    value={form.departureTime}
                    onChange={e => setForm(f => ({ ...f, departureTime: e.target.value }))}
                  />
                </div>

                <div className="form__group">
                  <label className="form__label" htmlFor="fare">Giá vé mỗi chỗ (VNĐ) *</label>
                  <input
                    id="fare"
                    className="form__input"
                    type="number"
                    min={0}
                    step={1000}
                    required
                    placeholder="150000"
                    value={form.fare}
                    onChange={e => setForm(f => ({ ...f, fare: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form__group">
                <label className="form__label" htmlFor="note">Ghi chú chuyến xe</label>
                <textarea
                  id="note"
                  className="form__textarea"
                  rows={3}
                  placeholder="Ghi chú về điểm đón chung, lưu ý hành lý..."
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                />
              </div>

              <div className="form__actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => navigate('/company/trips')}
                >
                  Huỷ
                </button>
                <button id="trip-submit" className="btn btn--primary" type="submit" disabled={saving}>
                  {saving ? <Spinner size="sm" /> : (
                    <>
                      <Icon name="check" size={16} />
                      <span>{isEdit ? 'Lưu thay đổi' : 'Lưu bản nháp'}</span>
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
              <h3 className="panel__title" style={{ marginTop: 14 }}>Tóm tắt lịch trình</h3>
              <dl className="stack" style={{ marginTop: 16, gap: 12 }}>
                <div>
                  <dt className="detail-item__label">Tuyến đường</dt>
                  <dd className="detail-item__value">
                    {selectedRoute ? `${selectedRoute.origin} → ${selectedRoute.destination}` : 'Chưa chọn'}
                  </dd>
                </div>
                <div>
                  <dt className="detail-item__label">Phương tiện &amp; Sức chứa</dt>
                  <dd className="detail-item__value">
                    {selectedVehicle ? `${selectedVehicle.plateNumber} · ${selectedVehicle.seatCapacity} chỗ` : 'Chưa chọn'}
                  </dd>
                </div>
                <div>
                  <dt className="detail-item__label">Tài xế</dt>
                  <dd className="detail-item__value">{selectedDriver?.fullName ?? 'Chưa chọn'}</dd>
                </div>
                <div>
                  <dt className="detail-item__label">Khởi hành</dt>
                  <dd className="detail-item__value">
                    {form.departureTime ? new Date(form.departureTime).toLocaleString('vi-VN') : 'Chưa chọn'}
                  </dd>
                </div>
                <div>
                  <dt className="detail-item__label">Giá vé mỗi chỗ</dt>
                  <dd className="detail-item__value" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                    {form.fare
                      ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(form.fare))
                      : '—'}
                  </dd>
                </div>
              </dl>
            </section>

            <div className="guidance-box">
              <Icon name="shield" size={18} />
              <span>Chuyến mới tạo ở trạng thái Bản nháp (DRAFT). Sau khi kiểm tra kỹ, nhấn &ldquo;Xuất bản&rdquo; ở danh sách chuyến để mở bán cho hành khách.</span>
            </div>
          </aside>
        </div>
      )}
    </AppShell>
  );
}
