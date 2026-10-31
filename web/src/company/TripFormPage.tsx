import React, { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  companyApi,
  driverApi,
  routeApi,
  tripApi,
  type DriverResponse,
  type RouteResponse,
  type TripResponse,
  type VehicleResponse,
} from '../api/client';
import { ErrorAlert, SuccessAlert } from '../components/Alert';
import { PageSpinner, Spinner } from '../components/Spinner';
import { useAuth } from '../auth/AuthContext';

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
            // Convert ISO string to format suitable for datetime-local (YYYY-MM-DDTHH:mm)
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
        <button id="back-btn" className="btn btn--ghost btn--sm" onClick={() => navigate('/company/trips')}>
          ← Danh sách chuyến xe
        </button>
        <div className="topbar__brand">
          <span className="logo-icon">🚌</span>
          <span className="logo-text">RideShareHub</span>
          <span className="topbar__role-badge">Nhà xe</span>
        </div>
      </header>

      <main className="page-content page-content--narrow">
        <div className="page-header">
          <h1 className="page-title">{isEdit ? 'Chỉnh sửa chuyến xe' : 'Tạo chuyến xe mới'}</h1>
        </div>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
        {success && <SuccessAlert message={success} />}

        <form className="form form--card" onSubmit={handleSubmit} id="trip-form">
          <div className="form__group">
            <label className="form__label" htmlFor="routeId">Tuyến đường *</label>
            <select
              id="routeId"
              className="form__input"
              required
              value={form.routeId}
              onChange={e => handleRouteChange(e.target.value)}
            >
              <option value="">-- Chọn tuyến đường --</option>
              {routes.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.origin} → {r.destination} - ~{r.estimatedMinutes}p)
                </option>
              ))}
            </select>
          </div>

          <div className="form__row">
            <div className="form__group">
              <label className="form__label" htmlFor="vehicleId">Phương tiện *</label>
              <select
                id="vehicleId"
                className="form__input"
                required
                value={form.vehicleId}
                onChange={e => setForm(f => ({ ...f, vehicleId: e.target.value }))}
              >
                <option value="">-- Chọn xe --</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.plateNumber} ({v.brand} {v.model} - {v.seatCapacity} chỗ - {v.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="form__group">
              <label className="form__label" htmlFor="driverId">Tài xế *</label>
              <select
                id="driverId"
                className="form__input"
                required
                value={form.driverId}
                onChange={e => setForm(f => ({ ...f, driverId: e.target.value }))}
              >
                <option value="">-- Chọn tài xế --</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} ({d.phone} - {d.status})
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
              <label className="form__label" htmlFor="fare">Giá vé (VNĐ) *</label>
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
              placeholder="Ghi chú về điểm đón chung, lưu ý hành lý, v.v..."
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            />
          </div>

          <div className="form__actions">
            <button id="trip-submit" className="btn btn--primary" type="submit" disabled={saving}>
              {saving ? <Spinner size="sm" /> : isEdit ? 'Lưu thay đổi' : 'Tạo chuyến (Bản nháp)'}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => navigate('/company/trips')}>
              Huỷ
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
