/**
 * SP3-P1-01, SP3-P1-03 & SP3-P1-05:
 * Company Trip Stop Management & AI VRPPD Route Optimization Proposal Review Page.
 * Route: /company/trips/:tripId/optimize
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  optimizationApi,
  tripApi,
  type RouteProposalResponse,
  type TripResponse,
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
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}

function proposalStatusLabel(status: RouteProposalResponse['status']): string {
  switch (status) {
    case 'PROPOSED':
      return 'Chờ duyệt (PROPOSED)';
    case 'ACCEPTED':
      return 'Đang áp dụng (ACCEPTED)';
    case 'REJECTED':
      return 'Đã từ chối (REJECTED)';
    case 'SUPERSEDED':
      return 'Đã thay thế (SUPERSEDED)';
    default:
      return status;
  }
}

function proposalStatusStyle(status: RouteProposalResponse['status']): React.CSSProperties {
  switch (status) {
    case 'ACCEPTED':
      return { background: '#dcfce7', color: '#166534', border: '1px solid #86efac' };
    case 'PROPOSED':
      return { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' };
    case 'REJECTED':
      return { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' };
    default:
      return { background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' };
  }
}

export function TripOptimizationPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  const companyId = session?.companyId;
  const numericTripId = Number(tripId || 0);

  const [trip, setTrip] = useState<TripResponse | null>(null);
  const [stops, setStops] = useState<TripStopResponse[]>([]);
  const [proposals, setProposals] = useState<RouteProposalResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [syncingStops, setSyncingStops] = useState(false);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [rejectReasonById, setRejectReasonById] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!companyId || !numericTripId) return;
    setLoading(true);
    setError(null);
    try {
      const [allTrips, stopList, proposalList] = await Promise.all([
        tripApi.listTrips(companyId),
        optimizationApi.listTripStops(numericTripId),
        optimizationApi.listProposals(numericTripId),
      ]);
      const found = allTrips.find(t => t.id === numericTripId) ?? null;
      setTrip(found);
      setStops(stopList);
      setProposals(proposalList);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu lộ trình tối ưu');
    } finally {
      setLoading(false);
    }
  }, [companyId, numericTripId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleSyncStops() {
    if (!numericTripId) return;
    setSyncingStops(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await optimizationApi.syncTripStops(numericTripId);
      setStops(updated);
      setSuccess(`Đã đồng bộ ${updated.length} điểm đón/trả từ danh sách đặt chỗ hiện tại.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể đồng bộ điểm dừng');
    } finally {
      setSyncingStops(false);
    }
  }

  async function handleRunOptimizer() {
    if (!numericTripId) return;
    setOptimizing(true);
    setError(null);
    setSuccess(null);
    try {
      const created = await optimizationApi.optimizeTrip(numericTripId);
      setSuccess(
        `AI Optimizer (${created.solverEngine}) đã tạo đề xuất #${created.id} ở trạng thái PROPOSED — ` +
          `tổng quãng đường ${created.totalDistanceKm} km (tiết kiệm ${created.distanceSavedKm} km). Vui lòng xem xét và bấm Duyệt để áp dụng.`,
      );
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể gọi dịch vụ tối ưu lộ trình');
    } finally {
      setOptimizing(false);
    }
  }

  async function handleAccept(proposalId: number) {
    if (!numericTripId) return;
    setReviewingId(proposalId);
    setError(null);
    setSuccess(null);
    try {
      await optimizationApi.acceptProposal(numericTripId, proposalId);
      setSuccess(
        `Đã duyệt và áp dụng đề xuất lộ trình #${proposalId}! Danh sách điểm dừng của Tài xế và Hành khách đã được cập nhật theo thứ tự tối ưu.`,
      );
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể duyệt đề xuất lộ trình');
    } finally {
      setReviewingId(null);
    }
  }

  async function handleReject(proposalId: number) {
    if (!numericTripId) return;
    setReviewingId(proposalId);
    setError(null);
    setSuccess(null);
    try {
      const reason = rejectReasonById[proposalId]?.trim() || 'Nhà xe giữ nguyên lộ trình hiện tại';
      await optimizationApi.rejectProposal(numericTripId, proposalId, reason);
      setSuccess(`Đã từ chối đề xuất lộ trình #${proposalId}.`);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể từ chối đề xuất lộ trình');
    } finally {
      setReviewingId(null);
    }
  }

  const isTripLocked = trip?.status === 'COMPLETED' || trip?.status === 'CANCELLED';
  const acceptedProposal = proposals.find(p => p.status === 'ACCEPTED') ?? null;
  const companyLabel = 'Nhà xe đối tác';

  return (
    <AppShell
      role="COMPANY"
      breadcrumbs={[
        'Không gian nhà xe',
        'Quản lý chuyến đi',
        trip ? `${trip.origin} → ${trip.destination}` : `Chuyến #${numericTripId}`,
        'Tối ưu lộ trình',
      ]}
      eyebrow="AI Route Optimizer · VRPPD"
      title="Tối ưu lộ trình đón / trả (AI VRPPD)"
      subtitle={
        trip
          ? `Chuyến #${trip.id} · ${trip.origin} → ${trip.destination} · Xe ${trip.vehiclePlate}`
          : `Chuyến #${numericTripId}`
      }
      navItems={buildCompanyNav('trips', true)}
      profileName={companyLabel}
      profileSub="Đối tác vận tải"
      profileInitials={initialsOf(companyLabel)}
      topbarStatus={trip ? <Badge value={trip.status} /> : <Badge value="APPROVED" />}
      logoutId="trip-optimize-logout"
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
        <button
          type="button"
          className="back-link"
          style={{ marginBottom: 0 }}
          onClick={() => navigate('/company/trips')}
        >
          <Icon name="left" size={16} />
          <span>Quay lại danh sách chuyến</span>
        </button>
        <Link className="btn btn--ghost btn--sm" to={`/company/trips/${numericTripId}/bookings`}>
          Xem Đặt chỗ
        </Link>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
      {success && <SuccessAlert message={success} onDismiss={() => setSuccess(null)} />}

      {loading ? (
        <PageSpinner />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Summary & Primary Actions */}
          <section className="panel">
            <div className="panel__head">
              <div>
                <h2 className="panel__title">
                  Điều phối lộ trình tối ưu {trip ? `— ${trip.routeName}` : ''}
                </h2>
                <p className="panel__sub">
                  Hệ thống OR-Tools VRPPD tính thứ tự đón/trả ngắn nhất thỏa mãn ràng buộc đón trước trả sau và sức chứa xe. Đề xuất chỉ được áp dụng khi nhà xe bấm <strong>Duyệt</strong>.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                {trip && <Badge value={trip.status} />}
                <button
                  type="button"
                  id="sync-stops-btn"
                  className="btn btn--ghost"
                  disabled={syncingStops || isTripLocked}
                  onClick={handleSyncStops}
                >
                  {syncingStops ? <Spinner size="sm" /> : null}
                  Đồng bộ điểm dừng
                </button>
                <button
                  type="button"
                  id="run-optimizer-btn"
                  className="btn btn--primary"
                  disabled={optimizing || isTripLocked}
                  onClick={handleRunOptimizer}
                >
                  {optimizing ? <Spinner size="sm" /> : <Icon name="route" size={16} />}
                  {optimizing ? 'Đang tối ưu OR-Tools...' : 'Chạy AI Tối ưu lộ trình'}
                </button>
              </div>
            </div>

            {isTripLocked && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  padding: '10px 14px',
                  borderRadius: 10,
                  fontSize: 13,
                  marginBottom: 12,
                }}
              >
                Chuyến đã ở trạng thái <strong>{trip?.status}</strong> — đã khóa chỉnh sửa điểm dừng và tối ưu lộ trình.
              </div>
            )}

            <div className="metric-grid" style={{ marginBottom: 0 }}>
              <div className="metric-card">
                <div className="metric-card__label">Tổng điểm dừng hoạt động</div>
                <div className="metric-card__value">{stops.length}</div>
                <div className="metric-card__note">Gồm cặp điểm PICKUP &amp; DROPOFF</div>
              </div>
              <div className="metric-card">
                <div className="metric-card__label">Trạng thái lộ trình tối ưu</div>
                <div className="metric-card__value" style={{ fontSize: 18 }}>
                  {acceptedProposal ? `Đã duyệt (#${acceptedProposal.id})` : 'Chưa duyệt'}
                </div>
                <div className="metric-card__note">
                  {acceptedProposal
                    ? `${acceptedProposal.totalDistanceKm} km · Tiết kiệm ${acceptedProposal.distanceSavedKm} km`
                    : 'Chạy AI Optimizer và bấm Duyệt để áp dụng'}
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-card__label">Tổng số đề xuất đã tạo</div>
                <div className="metric-card__value">{proposals.length}</div>
                <div className="metric-card__note">Lưu đầy đủ lịch sử duyệt / thay thế</div>
              </div>
            </div>
          </section>

          {/* Route Proposals Review Section (SP3-P1-05) */}
          <section className="panel">
            <div className="panel__head">
              <div>
                <h2 className="panel__title">Đề xuất lộ trình từ AI Optimizer (SP3-P1-05)</h2>
                <p className="panel__sub">
                  Kiểm tra quãng đường, tải trọng ghế trên xe tại từng điểm dừng rồi chọn Duyệt (ACCEPT) hoặc Từ chối (REJECT)
                </p>
              </div>
            </div>

            {proposals.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__title">Chưa có đề xuất tối ưu nào</div>
                <p className="empty-state__body">
                  Bấm <strong>Chạy AI Tối ưu lộ trình</strong> để hệ thống FastAPI + Google OR-Tools đề xuất thứ tự đón/trả tối ưu cho chuyến xe này.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {proposals.map(proposal => (
                  <div
                    key={proposal.id}
                    id={`proposal-card-${proposal.id}`}
                    style={{
                      border:
                        proposal.status === 'ACCEPTED'
                          ? '2px solid #22c55e'
                          : proposal.status === 'PROPOSED'
                            ? '2px solid #f59e0b'
                            : '1px solid var(--slate-200)',
                      borderRadius: 14,
                      padding: 16,
                      background: '#ffffff',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 10,
                        marginBottom: 12,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: 16 }}>Đề xuất #{proposal.id}</strong>
                        <span
                          style={{
                            ...proposalStatusStyle(proposal.status),
                            padding: '3px 10px',
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {proposalStatusLabel(proposal.status)}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>
                          Engine: {proposal.solverEngine} ({proposal.solverStatus}) · Tạo lúc{' '}
                          {formatTime(proposal.createdAt)}
                        </span>
                      </div>

                      {proposal.status === 'PROPOSED' && !isTripLocked && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <input
                            type="text"
                            className="form__input"
                            style={{ width: 220, padding: '6px 10px', fontSize: 12 }}
                            placeholder="Lý do từ chối (nếu từ chối)..."
                            value={rejectReasonById[proposal.id] ?? ''}
                            onChange={e =>
                              setRejectReasonById(prev => ({
                                ...prev,
                                [proposal.id]: e.target.value,
                              }))
                            }
                          />
                          <button
                            type="button"
                            id={`reject-proposal-${proposal.id}`}
                            className="btn btn--danger-ghost btn--sm"
                            disabled={reviewingId === proposal.id}
                            onClick={() => handleReject(proposal.id)}
                          >
                            Từ chối (REJECT)
                          </button>
                          <button
                            type="button"
                            id={`accept-proposal-${proposal.id}`}
                            className="btn btn--primary btn--sm"
                            disabled={reviewingId === proposal.id}
                            onClick={() => handleAccept(proposal.id)}
                          >
                            {reviewingId === proposal.id ? 'Đang áp dụng...' : '✓ Duyệt & Áp dụng (ACCEPT)'}
                          </button>
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: 18,
                        flexWrap: 'wrap',
                        fontSize: 13,
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: 'var(--slate-50)',
                        marginBottom: 12,
                      }}
                    >
                      <span>
                        <strong>Quãng đường tối ưu:</strong> {proposal.totalDistanceKm} km
                      </span>
                      <span>
                        <strong>Lộ trình mặc định:</strong> {proposal.baselineDistanceKm} km
                      </span>
                      <span style={{ color: '#15803d', fontWeight: 700 }}>
                        Tiết kiệm: {proposal.distanceSavedKm} km
                      </span>
                      <span>
                        <strong>Thời lượng dự kiến:</strong> ~{proposal.totalDurationMinutes} phút
                      </span>
                      <span>
                        <strong>Tải cao nhất trên xe:</strong> {proposal.maxSeatsOnBoard} /{' '}
                        {proposal.vehicleCapacity} ghế
                      </span>
                      {proposal.rejectReason && (
                        <span style={{ color: '#b91c1c' }}>
                          <strong>Lý do từ chối:</strong> {proposal.rejectReason}
                        </span>
                      )}
                    </div>

                    <div className="table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Thứ tự</th>
                            <th>Loại điểm</th>
                            <th>Hành khách / Mã vé</th>
                            <th>Địa chỉ đón / trả</th>
                            <th>Ghế trên xe</th>
                            <th>Chặng (km)</th>
                            <th>Giờ đến dự kiến</th>
                          </tr>
                        </thead>
                        <tbody>
                          {proposal.stops.map(s => (
                            <tr key={s.id}>
                              <td>
                                <strong>#{s.stopOrder}</strong>
                              </td>
                              <td>
                                <span
                                  style={{
                                    padding: '2px 8px',
                                    borderRadius: 6,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    background: s.stopType === 'PICKUP' ? '#dcfce7' : '#e0e7ff',
                                    color: s.stopType === 'PICKUP' ? '#166534' : '#3730a3',
                                  }}
                                >
                                  {s.stopType === 'PICKUP' ? 'ĐÓN (PICKUP)' : 'TRẢ (DROPOFF)'}
                                </span>
                              </td>
                              <td>
                                <div style={{ fontWeight: 600 }}>{s.passengerName}</div>
                                <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>
                                  {s.bookingCode} ({s.seatDelta > 0 ? `+${s.seatDelta}` : s.seatDelta} ghế)
                                </div>
                              </td>
                              <td style={{ maxWidth: 280 }}>{s.address}</td>
                              <td>
                                <strong>{s.cumulativeSeatsOnBoard}</strong> / {proposal.vehicleCapacity}
                              </td>
                              <td>{s.distanceFromPrevKm} km</td>
                              <td style={{ whiteSpace: 'nowrap' }}>
                                {formatTime(s.plannedArrivalAt)} (+{s.etaOffsetMinutes}p)
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Active Materialized TripStops Table (SP3-P1-01) */}
          <section className="panel">
            <div className="panel__head">
              <div>
                <h2 className="panel__title">Danh sách TripStop hiện tại đang áp dụng trên chuyến</h2>
                <p className="panel__sub">
                  Thứ tự điểm dừng thực tế đang đồng bộ với ứng dụng Tài xế và Hành khách ({stops.length} điểm)
                </p>
              </div>
            </div>

            {stops.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__title">Chưa có điểm dừng nào</div>
                <p className="empty-state__body">
                  Điểm dừng được tự động tạo từ các đặt chỗ đã xác nhận (CONFIRMED).
                </p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Thứ tự</th>
                      <th>Loại</th>
                      <th>Hành khách</th>
                      <th>Địa chỉ</th>
                      <th>Giờ đến dự kiến</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stops.map(s => (
                      <tr key={s.id}>
                        <td>
                          <strong>#{s.stopOrder}</strong>
                        </td>
                        <td>{s.stopType === 'PICKUP' ? 'ĐÓN KHÁCH' : 'TRẢ KHÁCH'}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{s.passengerName}</div>
                          <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>
                            {s.bookingCode} · {s.seatCount} ghế
                          </div>
                        </td>
                        <td>{s.address}</td>
                        <td>{formatTime(s.plannedArrivalAt)}</td>
                        <td>
                          <Badge value={s.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
}
