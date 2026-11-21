/**
 * SP1-P2-05, SP3-P2-03 & SP3-P2-05: Driver Trip Execution Screen (Figma DR-03..06)
 * - Accept / Reject trip assignment with confirmation dialog (SP3-P2-05)
 * - Start Trip (PUBLISHED/FULL -> IN_PROGRESS)
 * - Ordered TripStop execution (ARRIVED -> PICKED_UP / DROPPED_OFF) enforcing pickup-before-dropoff
 * - Periodic + manual GPS location ingestion (POST /api/v1/driver/trips/{tripId}/location)
 * - Complete Trip (IN_PROGRESS -> COMPLETED when all active stops are COMPLETED)
 * Route: /(driver)/trip/[tripId]
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  acceptDriverTrip,
  completeDriverTrip,
  getDriverTrips,
  getDriverTripStops,
  getTripBookings,
  rejectDriverTrip,
  sendDriverLocation,
  startDriverTrip,
  updateDriverStopStatus,
  type BookingRecord,
  type DriverTripSummary,
  type TripStopRecord,
} from '../../../src/api/client';
import { useAuth } from '../../../src/session/AuthContext';
import {
  BackGlyph,
  BusGlyph,
  CalendarGlyph,
  CheckGlyph,
  ClockGlyph,
  PhoneGlyph,
  PinGlyph,
  SeatGlyph,
  StatusBadge,
} from '../../../src/components/UI';
import { CARD_SHADOW, COLORS, PRIMARY_SHADOW } from '../../../src/theme/tokens';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Fallback regional coordinates for GPS route interpolation when stops lack explicit lat/lng
const REGION_COORDS: Record<string, { lat: number; lng: number }> = {
  'Đà Nẵng': { lat: 16.0544, lng: 108.2022 },
  'Huế': { lat: 16.4637, lng: 107.5909 },
  'Hội An': { lat: 15.8801, lng: 108.338 },
  'Tam Kỳ': { lat: 15.5736, lng: 108.474 },
  'Quảng Ngãi': { lat: 15.1214, lng: 108.8044 },
};

function guessCoords(text: string, fallback: { lat: number; lng: number }) {
  for (const [key, val] of Object.entries(REGION_COORDS)) {
    if (text?.toLowerCase().includes(key.toLowerCase())) {
      return val;
    }
  }
  return fallback;
}

export default function DriverTripDetailScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const params = useLocalSearchParams<{ tripId: string; data?: string }>();

  const initialTrip: DriverTripSummary | null = useMemo(() => {
    if (!params.data) return null;
    try {
      return JSON.parse(params.data) as DriverTripSummary;
    } catch {
      return null;
    }
  }, [params.data]);

  const numericTripId = Number(params.tripId || initialTrip?.id || 0);

  const [trip, setTrip] = useState<DriverTripSummary | null>(initialTrip);
  const [stops, setStops] = useState<TripStopRecord[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // SP3-P2-05: Accept / Reject confirmation modal state
  const [confirmDecisionModal, setConfirmDecisionModal] = useState<'ACCEPT' | 'REJECT' | null>(
    null,
  );
  // Complete trip confirmation modal state
  const [confirmCompleteModal, setConfirmCompleteModal] = useState(false);

  // GPS simulation / periodic ingestion state while IN_PROGRESS
  const [autoGpsEnabled, setAutoGpsEnabled] = useState(true);
  const [lastGpsInfo, setLastGpsInfo] = useState<{
    lat: number;
    lng: number;
    time: string;
  } | null>(null);
  const gpsStepRef = useRef(0);

  const loadAll = useCallback(async () => {
    if (!session?.accessToken || !numericTripId) return;
    setLoadingData(true);
    try {
      const [driverTrips, stopList, bookingList] = await Promise.all([
        getDriverTrips(session.accessToken).catch(() => [] as DriverTripSummary[]),
        getDriverTripStops(session.accessToken, numericTripId).catch(() => [] as TripStopRecord[]),
        getTripBookings(session.accessToken, numericTripId).catch(() => [] as BookingRecord[]),
      ]);
      const latestTrip = driverTrips.find(t => t.id === numericTripId);
      if (latestTrip) {
        setTrip(latestTrip);
      }
      setStops(stopList);
      setBookings(bookingList);
    } finally {
      setLoadingData(false);
    }
  }, [session?.accessToken, numericTripId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Build ordered waypoint path for realistic GPS progression along the route
  const routeWaypoints = useMemo(() => {
    const startFallback = guessCoords(trip?.origin || 'Đà Nẵng', { lat: 16.0544, lng: 108.2022 });
    const endFallback = guessCoords(trip?.destination || 'Huế', { lat: 16.4637, lng: 107.5909 });

    const points: { lat: number; lng: number }[] = [];
    for (const s of stops) {
      if (s.latitude != null && s.longitude != null) {
        points.push({ lat: Number(s.latitude), lng: Number(s.longitude) });
      }
    }
    if (points.length === 0) {
      points.push(startFallback);
      points.push({
        lat: (startFallback.lat + endFallback.lat) / 2,
        lng: (startFallback.lng + endFallback.lng) / 2,
      });
      points.push(endFallback);
    } else if (points.length === 1) {
      points.push(endFallback);
    }

    // Interpolate 12 smooth steps along the waypoints
    const interpolated: { lat: number; lng: number }[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const segments = 6;
      for (let k = 0; k < segments; k++) {
        const ratio = k / segments;
        interpolated.push({
          lat: Number((a.lat + (b.lat - a.lat) * ratio).toFixed(6)),
          lng: Number((a.lng + (b.lng - a.lng) * ratio).toFixed(6)),
        });
      }
    }
    interpolated.push(points[points.length - 1]);
    return interpolated;
  }, [stops, trip?.origin, trip?.destination]);

  const transmitNextGpsSample = useCallback(
    async (manual = false) => {
      if (!session?.accessToken || !numericTripId || routeWaypoints.length === 0) return;
      if (manual) setActionLoading('GPS');
      try {
        // Target next pending/arrived stop if available, otherwise step through waypoints
        const nextStop = stops.find(s => s.status !== 'COMPLETED' && s.status !== 'SKIPPED');
        const idx = gpsStepRef.current % routeWaypoints.length;
        gpsStepRef.current += 1;
        let wp = routeWaypoints[idx];
        if (nextStop?.status === 'ARRIVED' && nextStop.latitude != null && nextStop.longitude != null) {
          wp = { lat: Number(nextStop.latitude), lng: Number(nextStop.longitude) };
        }
        await sendDriverLocation(session.accessToken, numericTripId, {
          latitude: wp.lat,
          longitude: wp.lng,
          heading: 32,
          speedKmh: nextStop?.status === 'ARRIVED' ? 0 : 42,
        });
        setLastGpsInfo({
          lat: wp.lat,
          lng: wp.lng,
          time: new Date().toLocaleTimeString('vi-VN'),
        });
        if (manual) {
          setFeedbackBanner({
            type: 'success',
            text: `Đã gửi vị trí GPS (${wp.lat.toFixed(4)}, ${wp.lng.toFixed(4)}) lên hệ thống Realtime.`,
          });
        }
      } catch (err: unknown) {
        if (manual) {
          setFeedbackBanner({
            type: 'error',
            text: err instanceof Error ? err.message : 'Không thể gửi vị trí GPS',
          });
        }
      } finally {
        if (manual) setActionLoading(null);
      }
    },
    [session?.accessToken, numericTripId, routeWaypoints, stops],
  );

  // Automatic periodic GPS broadcast every 8s while trip is IN_PROGRESS and autoGpsEnabled is true
  useEffect(() => {
    if (trip?.status !== 'IN_PROGRESS' || !autoGpsEnabled) return;
    transmitNextGpsSample(false);
    const timer = setInterval(() => {
      transmitNextGpsSample(false);
    }, 8000);
    return () => clearInterval(timer);
  }, [trip?.status, autoGpsEnabled, transmitNextGpsSample]);

  // SP3-P2-01b & SP3-P2-05: Execute Accept or Reject after user confirms in dialog
  async function handleConfirmAssignmentDecision() {
    if (!session?.accessToken || !numericTripId || !confirmDecisionModal) return;
    const decision = confirmDecisionModal;
    setActionLoading(decision);
    setFeedbackBanner(null);
    try {
      const updated =
        decision === 'ACCEPT'
          ? await acceptDriverTrip(session.accessToken, numericTripId)
          : await rejectDriverTrip(session.accessToken, numericTripId);
      setTrip(updated);
      setConfirmDecisionModal(null);
      setFeedbackBanner({
        type: 'success',
        text:
          decision === 'ACCEPT'
            ? 'Bạn đã xác nhận nhận chuyến đi. Giờ có thể bắt đầu hành trình khi đến giờ xuất phát.'
            : 'Bạn đã từ chối nhận chuyến đi này.',
      });
      await loadAll();
    } catch (err: unknown) {
      setConfirmDecisionModal(null);
      setFeedbackBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Không thể cập nhật trạng thái nhận chuyến',
      });
    } finally {
      setActionLoading(null);
    }
  }

  // SP3-P2-01: Start Trip
  async function handleStartTrip() {
    if (!session?.accessToken || !numericTripId) return;
    setActionLoading('START');
    setFeedbackBanner(null);
    try {
      const updated = await startDriverTrip(session.accessToken, numericTripId);
      setTrip(updated);
      setFeedbackBanner({
        type: 'success',
        text: 'Đã bắt đầu hành trình! Hệ thống đang phát GPS trực tiếp và mở danh sách điểm đón/trả.',
      });
      await loadAll();
    } catch (err: unknown) {
      setFeedbackBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Không thể bắt đầu chuyến đi',
      });
    } finally {
      setActionLoading(null);
    }
  }

  // SP3-P2-01: Stop status transition (ARRIVED -> PICKED_UP / DROPPED_OFF)
  async function handleStopAction(
    stop: TripStopRecord,
    action: 'ARRIVED' | 'PICKED_UP' | 'DROPPED_OFF',
  ) {
    if (!session?.accessToken || !numericTripId) return;
    setActionLoading(`STOP-${stop.id}`);
    setFeedbackBanner(null);
    try {
      await updateDriverStopStatus(session.accessToken, numericTripId, stop.id, action);
      const actionLabel =
        action === 'ARRIVED'
          ? `Đã báo đến điểm ${stop.stopType === 'PICKUP' ? 'đón' : 'trả'} của ${stop.passengerName}`
          : action === 'PICKED_UP'
            ? `Đã xác nhận đón khách ${stop.passengerName} lên xe`
            : `Đã xác nhận trả khách ${stop.passengerName} hoàn tất`;
      setFeedbackBanner({ type: 'success', text: actionLabel });
      await loadAll();
    } catch (err: unknown) {
      setFeedbackBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Không thể cập nhật điểm dừng',
      });
    } finally {
      setActionLoading(null);
    }
  }

  // SP3-P2-01: Complete Trip
  async function handleCompleteTrip() {
    if (!session?.accessToken || !numericTripId) return;
    setActionLoading('COMPLETE');
    setFeedbackBanner(null);
    try {
      const updated = await completeDriverTrip(session.accessToken, numericTripId);
      setTrip(updated);
      setConfirmCompleteModal(false);
      setFeedbackBanner({
        type: 'success',
        text: 'Chúc mừng! Chuyến đi đã hoàn thành và trạng thái tài xế đã chuyển về Sẵn sàng.',
      });
      await loadAll();
    } catch (err: unknown) {
      setConfirmCompleteModal(false);
      setFeedbackBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Không thể hoàn thành chuyến đi',
      });
    } finally {
      setActionLoading(null);
    }
  }

  if (!trip) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <View style={styles.hero}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button">
            <BackGlyph size={18} color="#ffffff" />
          </Pressable>
          <Text style={styles.heroTitle}>Chi tiết chuyến</Text>
        </View>
        <View style={styles.emptyBox}>
          {loadingData ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <Text style={styles.emptyText}>Không tìm thấy thông tin chuyến #{params.tripId}.</Text>
          )}
        </View>
      </View>
    );
  }

  const assignmentStatus = trip.assignmentStatus ?? 'ASSIGNED';
  const booked = trip.bookedSeats ?? 0;
  const completedStopsCount = stops.filter(s => s.status === 'COMPLETED').length;
  const allStopsCompleted =
    stops.length === 0 || stops.every(s => s.status === 'COMPLETED' || s.status === 'SKIPPED');

  // Helper to check if a booking's PICKUP stop is already completed
  function isBookingPickupCompleted(bookingId: number | null | undefined): boolean {
    if (bookingId == null) return true;
    const pickupStop = stops.find(s => s.bookingId === bookingId && s.stopType === 'PICKUP');
    if (!pickupStop) return true;
    return pickupStop.status === 'COMPLETED';
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <View style={styles.hero}>
        <View style={styles.heroGlow} />
        <View style={styles.heroBar}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
          >
            <BackGlyph size={18} color="#ffffff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroLabel}>ĐIỀU HÀNH CHUYẾN XE #{trip.id}</Text>
            <Text style={styles.heroTitle} numberOfLines={1}>
              {trip.origin} → {trip.destination}
            </Text>
          </View>
          <StatusBadge status={trip.status} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Feedback banner */}
        {feedbackBanner ? (
          <View
            style={[
              styles.bannerBox,
              feedbackBanner.type === 'error' ? styles.bannerError : styles.bannerSuccess,
            ]}
          >
            <Text
              style={[
                styles.bannerText,
                feedbackBanner.type === 'error'
                  ? { color: '#991B1B' }
                  : { color: '#065F46' },
              ]}
            >
              {feedbackBanner.text}
            </Text>
          </View>
        ) : null}

        {/* SP3-P2-05: Assignment Decision Card (ACCEPT / REJECT) */}
        {(trip.status === 'PUBLISHED' || trip.status === 'FULL') &&
        assignmentStatus === 'ASSIGNED' ? (
          <View style={[styles.card, styles.assignmentCard]}>
            <View style={styles.assignmentHeader}>
              <View style={styles.assignmentDot} />
              <Text style={styles.assignmentTitle}>PHÂN CÔNG MỚI — CHỜ BẠN XÁC NHẬN</Text>
            </View>
            <Text style={styles.assignmentDesc}>
              Nhà xe đã phân công bạn phụ trách chuyến{' '}
              <Text style={{ fontWeight: '800' }}>
                {trip.origin} → {trip.destination}
              </Text>{' '}
              khởi hành lúc <Text style={{ fontWeight: '800' }}>{formatTime(trip.departureTime)}</Text>.
              Vui lòng xác nhận nhận chuyến hoặc từ chối để nhà xe điều phối.
            </Text>
            <View style={styles.assignmentBtnRow}>
              <Pressable
                style={[styles.rejectBtn, actionLoading != null && { opacity: 0.6 }]}
                disabled={actionLoading != null}
                onPress={() => setConfirmDecisionModal('REJECT')}
                accessibilityRole="button"
                accessibilityLabel="Từ chối nhận chuyến"
              >
                <Text style={styles.rejectBtnText}>✕ Từ chối</Text>
              </Pressable>
              <Pressable
                style={[styles.acceptBtn, actionLoading != null && { opacity: 0.6 }]}
                disabled={actionLoading != null}
                onPress={() => setConfirmDecisionModal('ACCEPT')}
                accessibilityRole="button"
                accessibilityLabel="Xác nhận nhận chuyến"
              >
                <Text style={styles.acceptBtnText}>✓ Nhận chuyến</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Rejected Notice */}
        {assignmentStatus === 'REJECTED' ? (
          <View style={[styles.card, { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }]}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#991B1B', marginBottom: 4 }}>
              ✕ Bạn đã từ chối nhận chuyến này
            </Text>
            <Text style={{ fontSize: 13, color: '#7F1D1D', lineHeight: 19 }}>
              Nhà xe đã ghi nhận phản hồi và sẽ điều phối tài xế khác cho chuyến xe.
            </Text>
          </View>
        ) : null}

        {/* SP3-P2-03: Start Trip Action Card (when ACCEPTED and PUBLISHED/FULL) */}
        {(trip.status === 'PUBLISHED' || trip.status === 'FULL') &&
        assignmentStatus === 'ACCEPTED' ? (
          <View style={[styles.card, styles.execCard]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <View style={styles.acceptedPill}>
                <Text style={styles.acceptedPillText}>✓ ĐÃ NHẬN CHUYẾN</Text>
              </View>
              <Text style={{ fontSize: 12, color: COLORS.slate500, fontWeight: '600' }}>
                {stops.length} điểm đón/trả
              </Text>
            </View>
            <Text style={styles.execTitle}>Sẵn sàng xuất phát</Text>
            <Text style={styles.execDesc}>
              Bấm &ldquo;Bắt đầu hành trình&rdquo; khi xe khởi hành để mở lộ trình đón/trả khách và phát tín hiệu định vị GPS trực tiếp cho hành khách.
            </Text>
            <Pressable
              style={[styles.startTripBtn, actionLoading === 'START' && { opacity: 0.7 }]}
              disabled={actionLoading != null}
              onPress={handleStartTrip}
              accessibilityRole="button"
              accessibilityLabel="Bắt đầu hành trình"
            >
              {actionLoading === 'START' ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.startTripBtnText}>▶ Bắt đầu hành trình (START TRIP)</Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {/* SP3-P2-02 & SP3-P2-03: Active Trip GPS Broadcaster & Progress Card (when IN_PROGRESS) */}
        {trip.status === 'IN_PROGRESS' ? (
          <View style={[styles.card, styles.liveGpsCard]}>
            <View style={styles.liveGpsHeader}>
              <View style={styles.livePulseBadge}>
                <View style={styles.livePulseDot} />
                <Text style={styles.livePulseText}>ĐANG CHẠY · PHÁT GPS TRỰC TIẾP</Text>
              </View>
              <Text style={styles.stopProgressBadge}>
                {completedStopsCount}/{stops.length} điểm hoàn tất
              </Text>
            </View>

            <Text style={styles.gpsCoordText}>
              {lastGpsInfo
                ? `Vị trí gần nhất: (${lastGpsInfo.lat.toFixed(4)}, ${lastGpsInfo.lng.toFixed(4)}) · lúc ${lastGpsInfo.time}`
                : 'Đang đồng bộ tọa độ GPS của xe lên máy chủ...'}
            </Text>

            <View style={styles.gpsActionRow}>
              <Pressable
                style={[
                  styles.gpsToggleBtn,
                  autoGpsEnabled ? styles.gpsToggleOn : styles.gpsToggleOff,
                ]}
                onPress={() => setAutoGpsEnabled(v => !v)}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.gpsToggleText,
                    autoGpsEnabled ? { color: '#065F46' } : { color: COLORS.slate600 },
                  ]}
                >
                  {autoGpsEnabled ? '● Tự động GPS (8s): BẬT' : '○ Tự động GPS: TẮT'}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.gpsSendNowBtn, actionLoading === 'GPS' && { opacity: 0.6 }]}
                disabled={actionLoading != null}
                onPress={() => transmitNextGpsSample(true)}
                accessibilityRole="button"
                accessibilityLabel="Gửi vị trí GPS ngay"
              >
                <Text style={styles.gpsSendNowText}>
                  {actionLoading === 'GPS' ? 'Đang gửi...' : '📍 Gửi GPS ngay'}
                </Text>
              </Pressable>
            </View>

            {/* Complete Trip CTA */}
            <View style={styles.completeTripWrap}>
              <Pressable
                style={[
                  styles.completeTripBtn,
                  !allStopsCompleted && styles.completeTripBtnDisabled,
                ]}
                disabled={actionLoading != null}
                onPress={() => {
                  if (!allStopsCompleted) {
                    Alert.alert(
                      'Chưa hoàn tất điểm đón/trả',
                      'Vui lòng xác nhận đón và trả tất cả hành khách trong danh sách điểm dừng trước khi kết thúc chuyến đi.',
                    );
                    return;
                  }
                  setConfirmCompleteModal(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="Hoàn thành chuyến đi"
              >
                <CheckGlyph size={16} color="#ffffff" />
                <Text style={styles.completeTripBtnText}>
                  Hoàn thành chuyến đi (COMPLETE TRIP)
                </Text>
              </Pressable>
              {!allStopsCompleted ? (
                <Text style={styles.completeHintText}>
                  * Hoàn tất tất cả {stops.length} điểm đón/trả bên dưới để kết thúc chuyến đi.
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* SP3-P2-03: Ordered Trip Stops Execution Card (DR-05) */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.cardSection}>
              LỘ TRÌNH ĐÓN / TRẢ HÀNH KHÁCH ({stops.length} ĐIỂM DỪNG)
            </Text>
            <Pressable onPress={loadAll} accessibilityRole="button">
              <Text style={styles.refreshLink}>Làm mới ↻</Text>
            </Pressable>
          </View>

          {loadingData && stops.length === 0 ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 14 }} />
          ) : stops.length === 0 ? (
            <View style={styles.emptyStopBox}>
              <Text style={styles.noteBody}>
                Chưa có điểm dừng đón/trả nào (chuyến chưa có đặt chỗ được xác nhận).
              </Text>
            </View>
          ) : (
            stops.map((stop, index) => {
              const isPickup = stop.stopType === 'PICKUP';
              const pickupDoneForThisBooking = isBookingPickupCompleted(stop.bookingId);
              const isBlockedDropoff = !isPickup && !pickupDoneForThisBooking;
              const isBusy = actionLoading === `STOP-${stop.id}`;

              const statusLabel =
                stop.status === 'COMPLETED'
                  ? isPickup
                    ? '✓ Đã đón khách'
                    : '✓ Đã trả khách'
                  : stop.status === 'ARRIVED'
                    ? '● Xe đã đến điểm'
                    : '○ Chờ đến điểm';

              const statusColor =
                stop.status === 'COMPLETED'
                  ? '#15803D'
                  : stop.status === 'ARRIVED'
                    ? '#B45309'
                    : COLORS.slate500;

              return (
                <View
                  key={stop.id}
                  style={[
                    styles.stopCard,
                    stop.status === 'COMPLETED' && styles.stopCardCompleted,
                    stop.status === 'ARRIVED' && styles.stopCardArrived,
                  ]}
                >
                  <View style={styles.stopTopRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View
                        style={[
                          styles.stopOrderCircle,
                          isPickup ? styles.stopOrderPickup : styles.stopOrderDropoff,
                        ]}
                      >
                        <Text style={styles.stopOrderText}>#{index + 1}</Text>
                      </View>
                      <View
                        style={[
                          styles.stopTypeBadge,
                          isPickup ? styles.pickupTypeBadge : styles.dropoffTypeBadge,
                        ]}
                      >
                        <Text
                          style={[
                            styles.stopTypeBadgeText,
                            isPickup ? { color: '#065F46' } : { color: '#3730A3' },
                          ]}
                        >
                          {isPickup ? 'ĐIỂM ĐÓN (PICKUP)' : 'ĐIỂM TRẢ (DROPOFF)'}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.stopStatusText, { color: statusColor }]}>
                      {statusLabel}
                    </Text>
                  </View>

                  <View style={styles.stopAddressBox}>
                    <PinGlyph
                      size={16}
                      color={isPickup ? COLORS.emerald : COLORS.primary}
                    />
                    <Text style={styles.stopAddressText}>{stop.address}</Text>
                  </View>

                  <View style={styles.stopPassengerRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stopPassengerName}>
                        {stop.passengerName} · {stop.seatCount} ghế
                      </Text>
                      <Text style={styles.stopBookingCode}>Mã vé: {stop.bookingCode}</Text>
                    </View>
                    {stop.passengerPhone ? (
                      <Pressable
                        onPress={() => Linking.openURL(`tel:${stop.passengerPhone}`)}
                        style={styles.callPaxBtn}
                        accessibilityRole="button"
                        accessibilityLabel={`Gọi ${stop.passengerName}`}
                      >
                        <PhoneGlyph size={14} color={COLORS.emerald} />
                        <Text style={styles.callPaxText}>{stop.passengerPhone}</Text>
                      </Pressable>
                    ) : null}
                  </View>

                  {/* Stop Transition Action Buttons when Trip is IN_PROGRESS */}
                  {trip.status === 'IN_PROGRESS' && stop.status !== 'COMPLETED' ? (
                    <View style={styles.stopActionArea}>
                      {isBlockedDropoff ? (
                        <View style={styles.blockedDropoffNote}>
                          <Text style={styles.blockedDropoffText}>
                            ⚠ Cần hoàn tất đón hành khách này trước khi thực hiện trả khách.
                          </Text>
                        </View>
                      ) : stop.status === 'PENDING' ? (
                        <Pressable
                          style={[styles.arrivedBtn, isBusy && { opacity: 0.6 }]}
                          disabled={actionLoading != null}
                          onPress={() => handleStopAction(stop, 'ARRIVED')}
                          accessibilityRole="button"
                        >
                          {isBusy ? (
                            <ActivityIndicator color="#92400E" size="small" />
                          ) : (
                            <Text style={styles.arrivedBtnText}>
                              📍 Đã đến điểm {isPickup ? 'đón' : 'trả'} (ARRIVED)
                            </Text>
                          )}
                        </Pressable>
                      ) : stop.status === 'ARRIVED' ? (
                        <Pressable
                          style={[
                            isPickup ? styles.pickupConfirmBtn : styles.dropoffConfirmBtn,
                            isBusy && { opacity: 0.6 },
                          ]}
                          disabled={actionLoading != null}
                          onPress={() =>
                            handleStopAction(stop, isPickup ? 'PICKED_UP' : 'DROPPED_OFF')
                          }
                          accessibilityRole="button"
                        >
                          {isBusy ? (
                            <ActivityIndicator color="#ffffff" size="small" />
                          ) : (
                            <Text style={styles.confirmStopBtnText}>
                              {isPickup
                                ? '✓ Xác nhận đã đón khách lên xe (PICKED_UP)'
                                : '✓ Xác nhận đã trả khách (DROPPED_OFF)'}
                            </Text>
                          )}
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>

        {/* Route timeline card */}
        <View style={styles.card}>
          <Text style={styles.cardSection}>THÔNG TIN TUYẾN & PHƯƠNG TIỆN</Text>

          <View style={styles.timeline}>
            <View style={styles.timelineCol}>
              <View style={[styles.dot, { backgroundColor: COLORS.teal }]} />
              <View style={styles.line} />
              <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
            </View>
            <View style={{ flex: 1, gap: 18 }}>
              <View>
                <Text style={styles.stopTag}>ĐIỂM XUẤT PHÁT</Text>
                <Text style={styles.stopCity}>{trip.origin}</Text>
                <Text style={styles.stopSub}>Khởi hành lúc {formatTime(trip.departureTime)}</Text>
              </View>
              <View>
                <Text style={styles.stopTag}>ĐIỂM ĐẾN</Text>
                <Text style={styles.stopCity}>{trip.destination}</Text>
                {trip.estimatedMinutes ? (
                  <Text style={styles.stopSub}>
                    Thời gian dự kiến ~{trip.estimatedMinutes} phút
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <CalendarGlyph size={16} color={COLORS.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.metaLabel}>Ngày khởi hành</Text>
                <Text style={styles.metaValue}>{formatDate(trip.departureTime)}</Text>
              </View>
            </View>
            <View style={styles.metaItem}>
              <ClockGlyph size={16} color={COLORS.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.metaLabel}>Giờ xuất bến</Text>
                <Text style={styles.metaValue}>{formatTime(trip.departureTime)}</Text>
              </View>
            </View>
            <View style={styles.metaItem}>
              <BusGlyph size={16} color={COLORS.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.metaLabel}>Phương tiện</Text>
                <Text style={styles.metaValue}>
                  {trip.vehiclePlate}
                  {trip.vehicleType ? ` · ${trip.vehicleType}` : ''}
                </Text>
              </View>
            </View>
            <View style={styles.metaItem}>
              <SeatGlyph size={16} color={COLORS.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.metaLabel}>Số ghế đã đặt</Text>
                <Text style={styles.metaValue}>
                  {booked} / {trip.seatCapacity} khách ({bookings.length} đơn)
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* SP3-P2-05: Confirmation Modal for ACCEPT / REJECT Trip Assignment */}
      <Modal
        visible={confirmDecisionModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmDecisionModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {confirmDecisionModal === 'ACCEPT'
                ? 'Xác nhận nhận chuyến xe?'
                : 'Xác nhận từ chối chuyến xe?'}
            </Text>
            <Text style={styles.modalDesc}>
              {confirmDecisionModal === 'ACCEPT'
                ? `Bạn xác nhận nhận điều hành chuyến ${trip.origin} → ${trip.destination} khởi hành lúc ${formatTime(trip.departureTime)} trên xe ${trip.vehiclePlate}?`
                : `Bạn có chắc chắn muốn từ chối chuyến ${trip.origin} → ${trip.destination}? Sau khi từ chối, nhà xe sẽ được thông báo để phân công tài xế khác.`}
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                disabled={actionLoading != null}
                onPress={() => setConfirmDecisionModal(null)}
                accessibilityRole="button"
              >
                <Text style={styles.modalCancelText}>Quay lại</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.modalConfirmBtn,
                  confirmDecisionModal === 'REJECT'
                    ? { backgroundColor: COLORS.rose }
                    : { backgroundColor: COLORS.emerald },
                ]}
                disabled={actionLoading != null}
                onPress={handleConfirmAssignmentDecision}
                accessibilityRole="button"
              >
                {actionLoading != null ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>
                    {confirmDecisionModal === 'ACCEPT'
                      ? 'Đồng ý nhận chuyến'
                      : 'Xác nhận từ chối'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Complete Trip Confirmation Modal */}
      <Modal
        visible={confirmCompleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmCompleteModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Hoàn thành chuyến đi?</Text>
            <Text style={styles.modalDesc}>
              Tất cả {stops.length} điểm đón/trả khách đã hoàn tất. Bạn xác nhận kết thúc chuyến đi{' '}
              {trip.origin} → {trip.destination}?
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                disabled={actionLoading != null}
                onPress={() => setConfirmCompleteModal(false)}
                accessibilityRole="button"
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirmBtn, { backgroundColor: COLORS.primary }]}
                disabled={actionLoading != null}
                onPress={handleCompleteTrip}
                accessibilityRole="button"
              >
                {actionLoading === 'COMPLETE' ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Hoàn thành chuyến</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  hero: {
    backgroundColor: COLORS.navy,
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -70,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.primary,
    opacity: 0.25,
  },
  heroBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  heroLabel: {
    color: COLORS.teal,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  heroTitle: { color: '#ffffff', fontSize: 18, fontWeight: '800' },

  content: { padding: 16, gap: 14, paddingBottom: 36 },

  bannerBox: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  bannerSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  bannerError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  bannerText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.slate100,
    ...CARD_SHADOW,
  },
  assignmentCard: {
    borderColor: '#F59E0B',
    borderWidth: 1.5,
    backgroundColor: '#FFFBEB',
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  assignmentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D97706',
  },
  assignmentTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.6,
  },
  assignmentDesc: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 19,
    marginBottom: 14,
  },
  assignmentBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rejectBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.rose,
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  rejectBtnText: {
    color: COLORS.rose,
    fontWeight: '800',
    fontSize: 14,
  },
  acceptBtn: {
    flex: 1.4,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.emerald,
    alignItems: 'center',
    ...PRIMARY_SHADOW,
  },
  acceptBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },

  execCard: {
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDF4',
  },
  acceptedPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  acceptedPillText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '800',
  },
  execTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.slate900,
    marginBottom: 4,
  },
  execDesc: {
    fontSize: 13,
    color: COLORS.slate600,
    lineHeight: 19,
    marginBottom: 14,
  },
  startTripBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...PRIMARY_SHADOW,
  },
  startTripBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },

  liveGpsCard: {
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
  },
  liveGpsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  livePulseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1D4ED8',
  },
  livePulseText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E40AF',
  },
  stopProgressBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  gpsCoordText: {
    fontSize: 12,
    color: COLORS.slate700,
    marginBottom: 10,
  },
  gpsActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  gpsToggleBtn: {
    flex: 1.2,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  gpsToggleOn: {
    backgroundColor: '#D1FAE5',
    borderColor: '#6EE7B7',
  },
  gpsToggleOff: {
    backgroundColor: '#F1F5F9',
    borderColor: COLORS.slate200,
  },
  gpsToggleText: {
    fontSize: 12,
    fontWeight: '800',
  },
  gpsSendNowBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#1D4ED8',
    alignItems: 'center',
  },
  gpsSendNowText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  completeTripWrap: {
    borderTopWidth: 1,
    borderTopColor: '#BFDBFE',
    paddingTop: 12,
  },
  completeTripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.emerald,
    paddingVertical: 13,
    borderRadius: 12,
  },
  completeTripBtnDisabled: {
    backgroundColor: COLORS.slate400,
  },
  completeTripBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  completeHintText: {
    fontSize: 11,
    color: COLORS.slate500,
    marginTop: 6,
    textAlign: 'center',
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardSection: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.slate500,
    letterSpacing: 0.8,
  },
  refreshLink: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  emptyStopBox: {
    paddingVertical: 10,
  },
  stopCard: {
    borderWidth: 1,
    borderColor: COLORS.slate200,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#ffffff',
  },
  stopCardArrived: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  stopCardCompleted: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
    opacity: 0.9,
  },
  stopTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stopOrderCircle: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  stopOrderPickup: {
    backgroundColor: COLORS.emerald,
  },
  stopOrderDropoff: {
    backgroundColor: COLORS.primary,
  },
  stopOrderText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  stopTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pickupTypeBadge: {
    backgroundColor: '#D1FAE5',
  },
  dropoffTypeBadge: {
    backgroundColor: '#E0E7FF',
  },
  stopTypeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  stopStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  stopAddressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 8,
  },
  stopAddressText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.slate900,
    lineHeight: 19,
  },
  stopPassengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stopPassengerName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.slate700,
  },
  stopBookingCode: {
    fontSize: 11,
    color: COLORS.slate500,
  },
  callPaxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  callPaxText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
  },
  stopActionArea: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate100,
  },
  arrivedBtn: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  arrivedBtnText: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '800',
  },
  pickupConfirmBtn: {
    backgroundColor: COLORS.emerald,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  dropoffConfirmBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmStopBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  blockedDropoffNote: {
    backgroundColor: '#FFFBEB',
    padding: 8,
    borderRadius: 8,
  },
  blockedDropoffText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
  },

  timeline: { flexDirection: 'row', gap: 14 },
  timelineCol: { alignItems: 'center', paddingTop: 4 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.slate200,
    marginVertical: 4,
    minHeight: 36,
  },
  stopTag: { fontSize: 10, fontWeight: '800', color: COLORS.slate400, letterSpacing: 0.6 },
  stopCity: { fontSize: 17, fontWeight: '800', color: COLORS.slate900, marginTop: 2 },
  stopSub: { fontSize: 12, color: COLORS.slate500, marginTop: 2 },

  divider: { height: 1, backgroundColor: COLORS.slate100, marginVertical: 14 },

  metaGrid: { gap: 12 },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.slate50,
    padding: 11,
    borderRadius: 12,
  },
  metaLabel: { fontSize: 11, color: COLORS.slate500 },
  metaValue: { fontSize: 13, fontWeight: '700', color: COLORS.slate900, marginTop: 1 },
  noteBody: { fontSize: 13, color: COLORS.slate700, lineHeight: 19 },

  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { fontSize: 14, color: COLORS.slate500 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    ...CARD_SHADOW,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.slate900,
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    color: COLORS.slate600,
    lineHeight: 20,
    marginBottom: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.slate100,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.slate700,
  },
  modalConfirmBtn: {
    flex: 1.3,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
});
