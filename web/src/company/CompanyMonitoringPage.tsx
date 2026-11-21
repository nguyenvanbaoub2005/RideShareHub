/**
 * SP4-P2-02: Company Live Trip Monitoring & Incident Resolution Page
 * Faithful to Figma company/TripOperations.tsx (lines 1250-1368) + RouteMap SVG.
 * Route: /company/monitoring
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  monitoringApi,
  type TripIncidentResponse,
  type TripLiveSnapshotResponse,
  type TripMonitoringSummary,
  type TripStopResponse,
} from '../api/client';
import { AppShell } from '../components/AppShell';
import { Badge } from '../components/Badge';
import { ErrorAlert, SuccessAlert } from '../components/Alert';
import { Icon } from '../components/Icon';
import { PageSpinner, Spinner } from '../components/Spinner';
import { useAuth } from '../auth/AuthContext';
import { buildCompanyNav, initialsOf } from './companyNav';

function formatTime(iso?: string | null): string {
  if (!iso) return 'Chưa có tín hiệu';
  return new Date(iso).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}

function fitStopsToSvg(stops: TripStopResponse[]) {
  if (stops.length === 0) return [];
  const withCoords = stops.filter(s => s.latitude != null && s.longitude != null);
  if (withCoords.length === 0) {
    return stops.map((_, idx) => ({
      x: 90 + ((620 / Math.max(1, stops.length)) * idx),
      y: 290 - ((200 / Math.max(1, stops.length)) * idx),
    }));
  }
  const lats = withCoords.map(s => Number(s.latitude));
  const lngs = withCoords.map(s => Number(s.longitude));
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = Math.max(0.02, maxLat - minLat);
  const lngSpan = Math.max(0.02, maxLng - minLng);

  return stops.map((s, idx) => {
    if (s.latitude == null || s.longitude == null) {
      return {
        x: 110 + ((580 / Math.max(1, stops.length)) * idx),
        y: 270 - ((170 / Math.max(1, stops.length)) * idx),
      };
    }
    const nx = (Number(s.longitude) - minLng) / lngSpan;
    const ny = (Number(s.latitude) - minLat) / latSpan;
    return {
      x: 100 + nx * 600,
      y: 315 - ny * 235,
    };
  });
}

function RouteMapSvg({
  origin,
  destination,
  stops,
  tripStatus,
}: {
  origin: string;
  destination: string;
  stops: TripStopResponse[];
  tripStatus: string;
}) {
  const points = useMemo(() => fitStopsToSvg(stops), [stops]);
  const nextIndex = stops.findIndex(s => s.status !== 'COMPLETED' && s.status !== 'SKIPPED');
  const currentIndex = Math.max(0, nextIndex < 0 ? stops.length - 1 : nextIndex);
  const vehiclePoint =
    tripStatus === 'COMPLETED'
      ? (points[points.length - 1] ?? { x: 640, y: 120 })
      : (points[currentIndex] ?? { x: 180, y: 240 });

  return (
    <div
      style={{
        position: 'relative',
        height: 330,
        overflow: 'hidden',
        borderRadius: 16,
        background: '#eaf0ef',
        border: '1px solid var(--slate-200)',
      }}
    >
      <svg
        viewBox="0 0 800 390"
        style={{ width: '100%', height: '100%', display: 'block' }}
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label="Sơ đồ giám sát lộ trình trực tiếp"
      >
        <rect width="800" height="390" fill="#eef2ee" />
        <path
          d="M450 -20C350 70 500 130 415 205S370 340 450 420"
          stroke="#c5dfe9"
          strokeWidth="48"
          fill="none"
        />
        <g fill="#dce8db">
          <rect x="35" y="70" width="95" height="65" rx="16" />
          <rect x="535" y="190" width="130" height="70" rx="20" />
          <rect x="200" y="220" width="80" height="75" rx="16" />
        </g>
        <g stroke="#ffffff" fill="none" strokeWidth="12">
          <path d="M-10 75L810 110M0 290L810 325M160 0L205 400M610 0L540 400" />
          <path d="M0 190Q240 130 800 215" />
        </g>
        <g fill="#64748b" fontSize="12" fontWeight="700">
          <text x="48" y="362">{origin.toUpperCase()}</text>
          <text x="610" y="42">{destination.toUpperCase()}</text>
        </g>
        {points.length > 1 && (
          <polyline
            points={points.map(p => `${p.x},${p.y}`).join(' ')}
            stroke="#4338ca"
            strokeWidth="4"
            strokeLinejoin="round"
            strokeLinecap="round"
            fill="none"
            opacity={0.85}
          />
        )}
        {points.map((p, i) => {
          const st = stops[i];
          const fillColor =
            st.status === 'COMPLETED'
              ? '#16a34a'
              : st.stopType === 'PICKUP'
                ? '#0d9488'
                : '#dc2626';
          return (
            <g key={st.id} transform={`translate(${p.x},${p.y})`}>
              <circle r="14" fill={fillColor} stroke="#ffffff" strokeWidth="3" />
              <text textAnchor="middle" y="4" fill="#ffffff" fontSize="11" fontWeight="700">
                {i + 1}
              </text>
            </g>
          );
        })}
        <g transform={`translate(${vehiclePoint.x},${vehiclePoint.y})`}>
          <circle r="24" fill="#4338ca" opacity="0.2" />
          <circle r="16" fill="#0f172a" stroke="#ffffff" strokeWidth="3" />
          <path
            d="M-6 -6H6V4H-6ZM-6 -1H6M-3 7V4M3 7V4"
            stroke="#ffffff"
            strokeWidth="2"
            fill="none"
          />
        </g>
      </svg>

      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          background: '#ffffff',
          borderRadius: 10,
          padding: '6px 12px',
          fontSize: 12,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          boxShadow: '0 2px 8px rgba(15,23,42,0.08)',
        }}
      >
        <Icon name="route" size={14} />
        <span>Vị trí phương tiện &amp; tiến độ điểm dừng</span>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          right: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            background: 'rgba(255,255,255,0.95)',
            padding: '5px 10px',
            borderRadius: 8,
            fontSize: 11,
            color: 'var(--slate-600)',
          }}
        >
          Sơ đồ trực quan đồng bộ từ GPS &amp; TripStops
        </span>
        <span
          style={{
            background: 'rgba(255,255,255,0.95)',
            padding: '5px 10px',
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 700,
            display: 'flex',
            gap: 12,
          }}
        >
          <span style={{ color: '#0f766e' }}>● Đón</span>
          <span style={{ color: '#b91c1c' }}>● Trả</span>
          <span style={{ color: '#15803d' }}>● Đã xong</span>
        </span>
      </div>
    </div>
  );
}

export function CompanyMonitoringPage() {
  const { session } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const companyId = session?.companyId;

  const [trips, setTrips] = useState<TripMonitoringSummary[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<number | null>(() => {
    const raw = searchParams.get('tripId');
    return raw ? Number(raw) : null;
  });
  const [snapshot, setSnapshot] = useState<TripLiveSnapshotResponse | null>(null);
  const [incidents, setIncidents] = useState<TripIncidentResponse[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadMonitoringData = useCallback(
    async (silent = false) => {
      if (!companyId) return;
      if (!silent) setLoading(true);
      try {
        const [tripList, companyIncidents] = await Promise.all([
          monitoringApi.listCompanyMonitoringTrips(companyId),
          monitoringApi.listCompanyIncidents(companyId),
        ]);
        setTrips(tripList);
        setIncidents(companyIncidents);

        const activeTripId =
          selectedTripId && tripList.some(t => t.tripId === selectedTripId)
            ? selectedTripId
            : (tripList[0]?.tripId ?? null);

        if (activeTripId !== selectedTripId) {
          setSelectedTripId(activeTripId);
        }

        if (activeTripId != null) {
          const snap = await monitoringApi.getTripLiveSnapshot(activeTripId);
          setSnapshot(snap);
        } else {
          setSnapshot(null);
        }
        setError(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu giám sát chuyến đi');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [companyId, selectedTripId],
  );

  useEffect(() => {
    void loadMonitoringData(false);
  }, [loadMonitoringData]);

  useEffect(() => {
    if (!autoRefresh || !companyId) return;
    const timer = setInterval(() => {
      void loadMonitoringData(true);
    }, 8000);
    return () => clearInterval(timer);
  }, [autoRefresh, companyId, loadMonitoringData]);

  async function handleSelectTrip(tripId: number) {
    setSelectedTripId(tripId);
    setSearchParams({ tripId: String(tripId) });
    try {
      const snap = await monitoringApi.getTripLiveSnapshot(tripId);
      setSnapshot(snap);
    } catch {
      // handled on next poll
    }
  }

  async function handleResolveIncident(inc: TripIncidentResponse) {
    setResolvingId(inc.id);
    setError(null);
    setSuccess(null);
    try {
      await monitoringApi.resolveIncident(
        inc.tripId,
        inc.id,
        'Nhà xe đã tiếp nhận và phối hợp xử lý',
      );
      setSuccess(`Đã đánh dấu xử lý xong sự cố #${inc.id} (${inc.incidentTypeLabel}).`);
      await loadMonitoringData(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật trạng thái sự cố');
    } finally {
      setResolvingId(null);
    }
  }

  const selectedSummary = trips.find(t => t.tripId === selectedTripId) ?? trips[0] ?? null;
  const activeCount = trips.filter(t => t.status === 'IN_PROGRESS').length;
  const openIncidentsCount = incidents.filter(i => i.status !== 'RESOLVED').length;
  const tripIncidents = selectedSummary
    ? incidents.filter(i => i.tripId === selectedSummary.tripId)
    : [];

  const doneStops = snapshot?.completedStopsCount ?? selectedSummary?.completedStopsCount ?? 0;
  const totalStops = snapshot?.totalStopsCount ?? selectedSummary?.totalStopsCount ?? 0;
  const progressPct = totalStops > 0 ? Math.round((doneStops / totalStops) * 100) : 0;

  return (
    <AppShell
      role="COMPANY"
      breadcrumbs={['Không gian nhà xe', 'Giám sát trực tiếp']}
      eyebrow="Trung tâm điều hành · Realtime"
      title="Giám sát chuyến đi trực tiếp"
      subtitle="Theo dõi GPS gần nhất, tiến độ đón/trả hành khách và xử lý cảnh báo sự cố từ tài xế."
      navItems={buildCompanyNav('monitoring', true)}
      profileName="Nhà xe đối tác"
      profileSub="Điều hành trực tiếp"
      profileInitials={initialsOf('Nhà xe')}
      topbarStatus={
        <button
          type="button"
          className="topbar__chip"
          onClick={() => void loadMonitoringData(false)}
        >
          <Icon name="clock" size={14} />
          <span>{autoRefresh ? 'Tự động đồng bộ 8s' : 'Đang tạm dừng đồng bộ'}</span>
        </button>
      }
      headerAction={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setAutoRefresh(v => !v)}
          >
            {autoRefresh ? 'Tạm dừng tự động (8s)' : 'Bật tự động (8s)'}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => void loadMonitoringData(false)}
          >
            Làm mới ngay
          </button>
        </div>
      }
      logoutId="company-monitoring-logout"
    >
      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
      {success && <SuccessAlert message={success} onDismiss={() => setSuccess(null)} />}

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Chuyến đang chạy</span>
            <span className="metric-card__icon metric-card__icon--teal">
              <Icon name="bus" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{activeCount}</div>
          <div className="metric-card__note">Đang truyền GPS trực tiếp</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Tổng chuyến theo dõi</span>
            <span className="metric-card__icon metric-card__icon--blue">
              <Icon name="route" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{trips.length}</div>
          <div className="metric-card__note">Toàn bộ lịch vận hành công ty</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Sự cố đang mở</span>
            <span className="metric-card__icon metric-card__icon--amber">
              <Icon name="alert" size={18} />
            </span>
          </div>
          <div className="metric-card__value">{openIncidentsCount}</div>
          <div className="metric-card__note">Cảnh báo cần nhà xe xử lý</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__top">
            <span className="metric-card__label">Tín hiệu GPS cuối</span>
            <span className="metric-card__icon metric-card__icon--blue">
              <Icon name="pin" size={18} />
            </span>
          </div>
          <div className="metric-card__value" style={{ fontSize: 16 }}>
            {snapshot?.locationUpdatedAt
              ? formatTime(snapshot.locationUpdatedAt)
              : selectedSummary?.locationUpdatedAt
                ? formatTime(selectedSummary.locationUpdatedAt)
                : 'Chưa có GPS'}
          </div>
          <div className="metric-card__note">
            {(snapshot?.locationStale ?? selectedSummary?.locationStale)
              ? '⚠ Tín hiệu cũ (> 45 giây)'
              : 'Đồng bộ từ PostgreSQL / WebSocket'}
          </div>
        </div>
      </div>

      {loading ? (
        <PageSpinner />
      ) : !selectedSummary ? (
        <section className="panel">
          <div className="empty-state">
            <span className="empty-state__icon">
              <Icon name="bus" size={28} />
            </span>
            <div className="empty-state__title">Chưa có chuyến xe nào để giám sát</div>
            <p className="empty-state__body">
              Tạo và công bố chuyến xe trong mục Quản lý chuyến đi để bắt đầu theo dõi.
            </p>
            <Link className="btn btn--primary" to="/company/trips">
              Đi tới Quản lý chuyến đi
            </Link>
          </div>
        </section>
      ) : (
        <>
          {/* Trip selector bar */}
          <section className="panel" style={{ marginBottom: 20 }}>
            <div className="toolbar" style={{ marginTop: 0, marginBottom: 0 }}>
              <label htmlFor="monitor-trip-select" style={{ fontWeight: 700, fontSize: 13 }}>
                Chọn chuyến giám sát:
              </label>
              <select
                id="monitor-trip-select"
                className="form__select"
                style={{ flex: 1, maxWidth: 520 }}
                value={selectedSummary.tripId}
                onChange={e => void handleSelectTrip(Number(e.target.value))}
              >
                {trips.map(t => (
                  <option key={t.tripId} value={t.tripId}>
                    #{t.tripId} · {t.routeName} ({t.vehiclePlate}) · {t.status}
                    {t.openIncidentsCount > 0 ? ` · ⚠ ${t.openIncidentsCount} sự cố` : ''}
                  </option>
                ))}
              </select>
              <Link
                className="btn btn--ghost btn--sm"
                to={`/company/trips/${selectedSummary.tripId}/optimize`}
              >
                Xem Lộ trình tối ưu
              </Link>
              <Link
                className="btn btn--ghost btn--sm"
                to={`/company/trips/${selectedSummary.tripId}/bookings`}
              >
                Xem Đặt chỗ
              </Link>
            </div>
          </section>

          {/* 2-Column Monitoring Workspace (matching Figma TripOperations.tsx lines 1269-1365) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.7fr) minmax(300px, 1fr)',
              gap: 20,
              alignItems: 'start',
            }}
          >
            {/* Left panel: Live Map + Telemetry */}
            <section className="panel">
              <div className="panel__head">
                <div>
                  <h2 className="panel__title">{selectedSummary.routeName}</h2>
                  <p className="panel__sub">
                    Chuyến #{selectedSummary.tripId} · Biển số {selectedSummary.vehiclePlate} ·{' '}
                    {selectedSummary.bookedSeats}/{selectedSummary.seatCapacity} khách
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {(snapshot?.locationStale ?? selectedSummary.locationStale) && (
                    <Badge value="PENDING" />
                  )}
                  <Badge value={snapshot?.tripStatus ?? selectedSummary.status} />
                </div>
              </div>

              <RouteMapSvg
                origin={selectedSummary.origin}
                destination={selectedSummary.destination}
                stops={snapshot?.stops ?? []}
                tripStatus={snapshot?.tripStatus ?? selectedSummary.status}
              />

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 12,
                  marginTop: 16,
                }}
              >
                <div style={{ background: 'var(--slate-50)', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>Điểm đã xử lý</div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginTop: 4 }}>
                    {doneStops}/{totalStops} ({progressPct}%)
                  </div>
                </div>
                <div style={{ background: 'var(--slate-50)', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>Tọa độ GPS cuối</div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4 }}>
                    {(snapshot?.currentLat ?? selectedSummary.currentLat) != null
                      ? `${Number(snapshot?.currentLat ?? selectedSummary.currentLat).toFixed(4)}, ${Number(snapshot?.currentLng ?? selectedSummary.currentLng).toFixed(4)}`
                      : 'Chưa có tọa độ'}
                  </div>
                </div>
                <div style={{ background: 'var(--slate-50)', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>Cập nhật GPS gần nhất</div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4 }}>
                    {formatTime(snapshot?.locationUpdatedAt ?? selectedSummary.locationUpdatedAt)}
                  </div>
                </div>
              </div>
            </section>

            {/* Right column: Driver/Vehicle, Stop Progress & Incidents */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <section className="panel">
                <h3 className="panel__title" style={{ marginBottom: 12 }}>
                  Tài xế &amp; phương tiện
                </h3>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: '#f0fdfa',
                      color: '#0f766e',
                      fontWeight: 800,
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {initialsOf(selectedSummary.driverName, 'TX')}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}>{selectedSummary.driverName}</div>
                    {selectedSummary.driverPhone ? (
                      <a
                        href={`tel:${selectedSummary.driverPhone}`}
                        style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}
                      >
                        {selectedSummary.driverPhone}
                      </a>
                    ) : null}
                  </div>
                </div>
                <p
                  style={{
                    borderTop: '1px solid var(--slate-100)',
                    marginTop: 14,
                    paddingTop: 12,
                    fontSize: 13,
                    color: 'var(--slate-600)',
                  }}
                >
                  {selectedSummary.vehicleType} · <strong>{selectedSummary.vehiclePlate}</strong>
                </p>
              </section>

              <section className="panel">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  <span>Tiến độ điểm dừng</span>
                  <span style={{ color: 'var(--primary)' }}>{progressPct}%</span>
                </div>
                <div
                  style={{
                    height: 8,
                    borderRadius: 999,
                    background: 'var(--slate-100)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${progressPct}%`,
                      background: 'var(--primary)',
                      borderRadius: 999,
                    }}
                  />
                </div>
                <div style={{ marginTop: 14 }}>
                  {snapshot?.nextStop ? (
                    <>
                      <span className="badge badge--in-use">
                        {snapshot.nextStop.stopType === 'PICKUP' ? 'ĐÓN KHÁCH' : 'TRẢ KHÁCH'}
                      </span>
                      <div style={{ fontWeight: 700, marginTop: 8 }}>
                        {snapshot.nextStop.passengerName} ({snapshot.nextStop.seatCount} ghế)
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--slate-600)', marginTop: 4 }}>
                        {snapshot.nextStop.address}
                      </div>
                      {snapshot.etaMinutesToNextStop != null && (
                        <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 4 }}>
                          ETA dự kiến: ~{snapshot.etaMinutesToNextStop} phút
                        </div>
                      )}
                    </>
                  ) : (
                    <p style={{ fontSize: 13, color: 'var(--slate-500)', marginTop: 6 }}>
                      {selectedSummary.nextStopAddress
                        ? `Điểm tiếp theo: ${selectedSummary.nextStopAddress}`
                        : 'Không còn điểm dừng đang chờ xử lý.'}
                    </p>
                  )}
                </div>
              </section>

              <section className="panel">
                <div className="panel__head" style={{ marginBottom: 12 }}>
                  <div>
                    <h3 className="panel__title">Cảnh báo sự cố chuyến</h3>
                    <p className="panel__sub">
                      {tripIncidents.length} báo cáo trên chuyến · {incidents.length} toàn công ty
                    </p>
                  </div>
                </div>
                {incidents.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--slate-500)' }}>
                    Chưa ghi nhận sự cố nào từ tài xế.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(tripIncidents.length > 0 ? tripIncidents : incidents).map(inc => (
                      <div
                        key={inc.id}
                        style={{
                          border:
                            inc.status === 'RESOLVED'
                              ? '1px solid var(--slate-200)'
                              : '1px solid #fca5a5',
                          background: inc.status === 'RESOLVED' ? '#f8fafc' : '#fef2f2',
                          borderRadius: 12,
                          padding: 12,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 6,
                          }}
                        >
                          <strong style={{ fontSize: 13 }}>{inc.incidentTypeLabel}</strong>
                          <Badge
                            value={inc.status === 'RESOLVED' ? 'COMPLETED' : 'CANCELLED'}
                          />
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--slate-700)', lineHeight: 1.45 }}>
                          {inc.description}
                        </p>
                        <div style={{ fontSize: 11, color: 'var(--slate-500)', marginTop: 6 }}>
                          Tài xế {inc.driverName} · Chuyến #{inc.tripId} ·{' '}
                          {formatTime(inc.createdAt)}
                        </div>
                        {inc.status !== 'RESOLVED' ? (
                          <button
                            type="button"
                            className="btn btn--primary btn--sm"
                            style={{ marginTop: 10, width: '100%' }}
                            disabled={resolvingId === inc.id}
                            onClick={() => void handleResolveIncident(inc)}
                          >
                            {resolvingId === inc.id ? (
                              <Spinner size="sm" />
                            ) : (
                              'Đánh dấu đã xử lý'
                            )}
                          </button>
                        ) : (
                          inc.resolutionNote && (
                            <div style={{ fontSize: 11, color: '#15803d', marginTop: 6 }}>
                              ✓ {inc.resolutionNote}
                            </div>
                          )
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
