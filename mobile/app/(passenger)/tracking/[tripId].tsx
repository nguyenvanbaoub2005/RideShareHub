/**
 * SP3-P1-04 & SP3-P2-04: Passenger Realtime Live Tracking Screen (Figma PA-13 & PA-14)
 * - Hero Interactive MapView (top 340px) with floating Back button & Live Connection pill
 * - Auto-fits camera bounds (`fitToCoordinates`) across Pickup, Dropoff, Stop markers & Vehicle
 * - Bottom Sheet (`rounded-t-28px`) with Trip Status + ETA countdown + Progress bar + Next Stop
 *   + Expected arrival time, Driver & Vehicle card with call button, and Approved Route Stops
 * - Connects to WebSocket `/ws/trips/{tripId}?token=...` + authoritative REST snapshot resync
 * - Includes optional local Demo Simulation mode so single-device testers can watch the bus move
 *   along the route without mutating backend state when the driver hasn't started the trip yet.
 * Route: /(passenger)/tracking/[tripId]
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { StatusBar } from 'expo-status-bar';
import {
  buildTripWebSocketUrl,
  getMyBookings,
  getTripLiveSnapshot,
  type BookingRecord,
  type TripLiveSnapshot,
  type TripStopRecord,
} from '../../../src/api/client';
import { useAuth } from '../../../src/session/AuthContext';
import {
  BackGlyph,
  BusGlyph,
  ClockGlyph,
  PhoneGlyph,
  PinGlyph,
  StarGlyph,
  StatusBadge,
} from '../../../src/components/UI';
import { CARD_SHADOW, COLORS } from '../../../src/theme/tokens';
import { formatArrivalTime, formatDuration } from '../../../src/trips/tripFormatters';

const REGION_COORDS: Record<string, { lat: number; lng: number }> = {
  'Đà Nẵng': { lat: 16.0544, lng: 108.2022 },
  'Huế': { lat: 16.4637, lng: 107.5909 },
  'Hội An': { lat: 15.8801, lng: 108.338 },
  'Tam Kỳ': { lat: 15.5736, lng: 108.474 },
  'Quảng Nam': { lat: 15.5736, lng: 108.474 },
  'Quảng Ngãi': { lat: 15.1214, lng: 108.8044 },
};

function guessCoords(text: string | undefined, fallback: { lat: number; lng: number }) {
  if (!text) return fallback;
  for (const [key, val] of Object.entries(REGION_COORDS)) {
    if (text.toLowerCase().includes(key.toLowerCase())) {
      return val;
    }
  }
  return fallback;
}

function formatTime(iso?: string | null): string {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatShortTime(iso?: string | null): string {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function describeEventBadge(eventType?: string): string | null {
  switch (eventType) {
    case 'ROUTE_PROPOSAL_ACCEPTED':
      return 'Nhà xe vừa cập nhật lộ trình đón/trả tối ưu';
    case 'TRIP_ACCEPTED':
      return 'Tài xế đã xác nhận nhận chuyến đi';
    case 'TRIP_STARTED':
      return 'Xe đã xuất phát! Đang truyền vị trí GPS trực tiếp';
    case 'STOP_ARRIVED':
      return 'Tài xế đã đến điểm dừng đón/trả';
    case 'STOP_PICKED_UP':
      return 'Tài xế đã xác nhận đón khách lên xe';
    case 'STOP_DROPPED_OFF':
      return 'Tài xế đã xác nhận trả khách tại điểm đến';
    case 'TRIP_COMPLETED':
      return 'Chuyến đi đã hoàn thành an toàn';
    case 'INCIDENT_REPORTED':
      return 'Tài xế vừa gửi thông báo tình hình trên tuyến';
    default:
      return null;
  }
}

type LatLng = { latitude: number; longitude: number };

function interpolateAlongPolyline(points: LatLng[], progress: number): {
  current: LatLng;
  traveled: LatLng[];
  remaining: LatLng[];
} {
  if (points.length === 0) {
    const def = { latitude: 16.0544, longitude: 108.2022 };
    return { current: def, traveled: [def], remaining: [def] };
  }
  if (points.length === 1) {
    return { current: points[0], traveled: [points[0]], remaining: [points[0]] };
  }
  const clamped = Math.max(0, Math.min(1, progress));
  if (clamped <= 0) {
    return { current: points[0], traveled: [points[0]], remaining: points };
  }
  if (clamped >= 1) {
    const last = points[points.length - 1];
    return { current: last, traveled: points, remaining: [last] };
  }

  const segLengths: number[] = [];
  let totalLen = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].latitude - points[i].latitude;
    const dy = points[i + 1].longitude - points[i].longitude;
    const len = Math.hypot(dx, dy);
    segLengths.push(len);
    totalLen += len;
  }
  if (totalLen <= 0.000001) {
    return { current: points[0], traveled: [points[0]], remaining: points };
  }

  const targetDist = clamped * totalLen;
  let acc = 0;
  for (let i = 0; i < segLengths.length; i++) {
    const segLen = segLengths[i];
    if (acc + segLen >= targetDist || i === segLengths.length - 1) {
      const localRatio = segLen > 0 ? (targetDist - acc) / segLen : 0;
      const current: LatLng = {
        latitude: points[i].latitude + (points[i + 1].latitude - points[i].latitude) * localRatio,
        longitude:
          points[i].longitude + (points[i + 1].longitude - points[i].longitude) * localRatio,
      };
      return {
        current,
        traveled: [...points.slice(0, i + 1), current],
        remaining: [current, ...points.slice(i + 1)],
      };
    }
    acc += segLen;
  }
  const last = points[points.length - 1];
  return { current: last, traveled: points, remaining: [last] };
}

export default function PassengerLiveTrackingScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const params = useLocalSearchParams<{ tripId: string; bookingId?: string }>();
  const numericTripId = Number(params.tripId || 0);
  const numericBookingId = params.bookingId ? Number(params.bookingId) : null;

  const [snapshot, setSnapshot] = useState<TripLiveSnapshot | null>(null);
  const [myBooking, setMyBooking] = useState<BookingRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [wsState, setWsState] = useState<'CONNECTING' | 'CONNECTED' | 'RECONNECTING'>('CONNECTING');
  const [liveToast, setLiveToast] = useState<string | null>(null);
  const [clientStaleTick, setClientStaleTick] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Figma PA-13 simulation state (allows testing vehicle motion & finish demo on single device)
  const [simProgress, setSimProgress] = useState<number | null>(null);
  const [simRunning, setSimRunning] = useState(false);
  const [confirmFinishDemo, setConfirmFinishDemo] = useState(false);

  const mapRef = useRef<MapView | null>(null);
  const hasFittedMapRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const unmountedRef = useRef(false);

  const fetchRestSnapshot = useCallback(
    async (silent = false, isPullRefresh = false) => {
      if (!session?.accessToken || !numericTripId) return;
      if (isPullRefresh) {
        setRefreshing(true);
      } else if (!silent) {
        setLoading(true);
      }
      try {
        const [data, bookings] = await Promise.all([
          getTripLiveSnapshot(session.accessToken, numericTripId),
          myBooking
            ? Promise.resolve(null)
            : getMyBookings(session.accessToken).catch(() => [] as BookingRecord[]),
        ]);
        if (!unmountedRef.current) {
          setSnapshot(data);
          if (bookings) {
            const matched =
              (numericBookingId ? bookings.find(b => b.id === numericBookingId) : null) ??
              bookings.find(
                b =>
                  b.tripId === numericTripId &&
                  b.status !== 'CANCELLED' &&
                  b.status !== 'NO_SHOW',
              ) ??
              bookings.find(b => b.tripId === numericTripId) ??
              null;
            if (matched) setMyBooking(matched);
          }
          setErrorMsg(null);
        }
      } catch (err: unknown) {
        if (!unmountedRef.current && !silent) {
          setErrorMsg(
            err instanceof Error ? err.message : 'Không thể tải dữ liệu theo dõi chuyến xe',
          );
        }
      } finally {
        if (!unmountedRef.current) {
          if (isPullRefresh) setRefreshing(false);
          else if (!silent) setLoading(false);
        }
      }
    },
    [session?.accessToken, numericTripId, numericBookingId, myBooking],
  );

  const connectWebSocket = useCallback(() => {
    if (!session?.accessToken || !numericTripId || unmountedRef.current) return;

    if (wsRef.current) {
      try {
        wsRef.current.onclose = null;
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }

    const wsUrl = buildTripWebSocketUrl(numericTripId, session.accessToken);
    setWsState(prev => (prev === 'CONNECTED' ? 'CONNECTED' : 'CONNECTING'));

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (unmountedRef.current) return;
        reconnectAttemptRef.current = 0;
        setWsState('CONNECTED');
        void fetchRestSnapshot(true);
      };

      ws.onmessage = event => {
        if (unmountedRef.current) return;
        try {
          const payload = JSON.parse(String(event.data)) as TripLiveSnapshot;
          if (payload && payload.tripId) {
            // If real live GPS arrives from driver, exit local demo simulation automatically
            if (payload.eventType === 'LOCATION_UPDATED' && payload.currentLat != null) {
              setSimRunning(false);
              setSimProgress(null);
            }
            if (payload.eventType === 'SNAPSHOT' && payload.myNextStop !== undefined) {
              setSnapshot(payload);
            } else {
              setSnapshot(prev =>
                prev
                  ? {
                      ...prev,
                      eventType: payload.eventType,
                      tripStatus: payload.tripStatus,
                      currentLat: payload.currentLat ?? prev.currentLat,
                      currentLng: payload.currentLng ?? prev.currentLng,
                      heading: payload.heading ?? prev.heading,
                      speedKmh: payload.speedKmh ?? prev.speedKmh,
                      locationUpdatedAt: payload.locationUpdatedAt ?? prev.locationUpdatedAt,
                      locationStale: payload.locationStale,
                      completedStopsCount: payload.completedStopsCount,
                      totalStopsCount: payload.totalStopsCount,
                      recentEvents: payload.recentEvents?.length
                        ? payload.recentEvents
                        : prev.recentEvents,
                      routeOptimized: payload.routeOptimized ?? prev.routeOptimized,
                      acceptedProposalId: payload.acceptedProposalId ?? prev.acceptedProposalId,
                    }
                  : payload,
              );
              if (payload.eventType !== 'LOCATION_UPDATED') {
                void fetchRestSnapshot(true);
              }
            }
            setErrorMsg(null);
            const toastText = describeEventBadge(payload.eventType);
            if (toastText) {
              setLiveToast(toastText);
            }
          }
        } catch {
          // ignore non-snapshot frames
        }
      };

      ws.onerror = () => {
        if (unmountedRef.current) return;
        setWsState('RECONNECTING');
      };

      ws.onclose = () => {
        if (unmountedRef.current) return;
        setWsState('RECONNECTING');
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        const attempt = reconnectAttemptRef.current;
        reconnectAttemptRef.current = Math.min(attempt + 1, 4);
        const delayMs = Math.min(15000, 2000 * Math.pow(2, attempt));
        reconnectTimerRef.current = setTimeout(() => {
          if (!unmountedRef.current) {
            void fetchRestSnapshot(true);
            connectWebSocket();
          }
        }, delayMs);
      };
    } catch {
      setWsState('RECONNECTING');
    }
  }, [session?.accessToken, numericTripId, fetchRestSnapshot]);

  useEffect(() => {
    unmountedRef.current = false;
    void fetchRestSnapshot(false);
    connectWebSocket();

    const appStateSub = AppState.addEventListener('change', nextState => {
      if (unmountedRef.current) return;
      if (nextState === 'background' || nextState === 'inactive') {
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        if (wsRef.current) {
          try {
            wsRef.current.onclose = null;
            wsRef.current.close();
          } catch {
            // ignore
          }
          wsRef.current = null;
        }
      } else if (nextState === 'active') {
        reconnectAttemptRef.current = 0;
        void fetchRestSnapshot(true);
        connectWebSocket();
      }
    });

    const interval = setInterval(() => {
      setClientStaleTick(t => t + 1);
      void fetchRestSnapshot(true);
    }, 8000);

    return () => {
      unmountedRef.current = true;
      appStateSub.remove();
      clearInterval(interval);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        try {
          wsRef.current.onclose = null;
          wsRef.current.close();
        } catch {
          // ignore
        }
      }
    };
  }, [fetchRestSnapshot, connectWebSocket]);

  // Local Demo Simulation timer (moves bus smoothly along route when user taps "Mô phỏng xe chạy" or "Kết thúc chuyến (demo)")
  useEffect(() => {
    if (!simRunning) return;
    const timer = setInterval(() => {
      setSimProgress(prev => {
        const next = Math.min(1, (prev ?? 0.08) + 0.04);
        if (next >= 1) {
          setSimRunning(false);
        }
        return next;
      });
    }, 800);
    return () => clearInterval(timer);
  }, [simRunning]);

  const isLocationStale = useMemo(() => {
    void clientStaleTick;
    if (simProgress != null) return false;
    if (!snapshot) return false;
    if (snapshot.tripStatus !== 'IN_PROGRESS') return false;
    if (snapshot.locationStale) return true;
    if (!snapshot.locationUpdatedAt) return true;
    const ageSeconds = (Date.now() - new Date(snapshot.locationUpdatedAt).getTime()) / 1000;
    return ageSeconds > 45;
  }, [snapshot, clientStaleTick, simProgress]);

  // Compute real Progress Ratio (0..1)
  const effectiveProgress = useMemo(() => {
    if (simProgress != null) return simProgress;
    if (!snapshot) return 0;
    if (snapshot.tripStatus === 'COMPLETED') return 1;
    if (snapshot.totalStopsCount > 0) {
      const base = snapshot.completedStopsCount / snapshot.totalStopsCount;
      if (snapshot.tripStatus === 'IN_PROGRESS') {
        return Math.max(0.15, Math.min(0.95, base || 0.35));
      }
      return base;
    }
    return snapshot.tripStatus === 'IN_PROGRESS' ? 0.45 : 0;
  }, [snapshot, simProgress]);

  // Compute coordinates for MapView: Pickup, Dropoff, Ordered Stops, Route Polyline & Live Vehicle
  const mapGeometry = useMemo(() => {
    const originFallback = guessCoords(snapshot?.origin, { lat: 16.0544, lng: 108.2022 });
    const destFallback = guessCoords(snapshot?.destination, { lat: 16.4637, lng: 107.5909 });

    const stops = snapshot?.stops ?? [];
    const ownPickupStop = stops.find(s => s.ownStop && s.stopType === 'PICKUP');
    const ownDropoffStop = stops.find(s => s.ownStop && s.stopType === 'DROPOFF');

    const pickupCoord: LatLng =
      myBooking?.pickup?.latitude != null && myBooking?.pickup?.longitude != null
        ? {
            latitude: Number(myBooking.pickup.latitude),
            longitude: Number(myBooking.pickup.longitude),
          }
        : ownPickupStop?.latitude != null && ownPickupStop?.longitude != null
          ? {
              latitude: Number(ownPickupStop.latitude),
              longitude: Number(ownPickupStop.longitude),
            }
          : { latitude: originFallback.lat, longitude: originFallback.lng };

    const dropoffCoord: LatLng =
      myBooking?.dropoff?.latitude != null && myBooking?.dropoff?.longitude != null
        ? {
            latitude: Number(myBooking.dropoff.latitude),
            longitude: Number(myBooking.dropoff.longitude),
          }
        : ownDropoffStop?.latitude != null && ownDropoffStop?.longitude != null
          ? {
              latitude: Number(ownDropoffStop.latitude),
              longitude: Number(ownDropoffStop.longitude),
            }
          : { latitude: destFallback.lat, longitude: destFallback.lng };

    const stopCoords: {
      stop: TripStopRecord;
      index: number;
      latitude: number;
      longitude: number;
    }[] = [];

    stops.forEach((s, idx) => {
      if (s.latitude != null && s.longitude != null) {
        stopCoords.push({
          stop: s,
          index: idx + 1,
          latitude: Number(s.latitude),
          longitude: Number(s.longitude),
        });
      } else {
        const ratio = (idx + 1) / (stops.length + 1);
        stopCoords.push({
          stop: s,
          index: idx + 1,
          latitude: pickupCoord.latitude + (dropoffCoord.latitude - pickupCoord.latitude) * ratio,
          longitude:
            pickupCoord.longitude + (dropoffCoord.longitude - pickupCoord.longitude) * ratio,
        });
      }
    });

    // Build clean route waypoints from actual stop coordinates (or pickup -> dropoff if no stops)
    const routeWaypoints: LatLng[] =
      stopCoords.length >= 2
        ? stopCoords.map(sc => ({ latitude: sc.latitude, longitude: sc.longitude }))
        : [pickupCoord, dropoffCoord];

    const hasRealDriverGps =
      simProgress == null && snapshot?.currentLat != null && snapshot?.currentLng != null;

    const interpolated = interpolateAlongPolyline(routeWaypoints, effectiveProgress);

    const vehicleCoord: LatLng = hasRealDriverGps
      ? {
          latitude: Number(snapshot!.currentLat),
          longitude: Number(snapshot!.currentLng),
        }
      : interpolated.current;

    const traveledPolyline: LatLng[] = hasRealDriverGps
      ? [routeWaypoints[0], vehicleCoord]
      : interpolated.traveled;

    const centerLat = (pickupCoord.latitude + dropoffCoord.latitude + vehicleCoord.latitude) / 3;
    const centerLng = (pickupCoord.longitude + dropoffCoord.longitude + vehicleCoord.longitude) / 3;
    const latSpan = Math.max(
      0.04,
      Math.abs(pickupCoord.latitude - dropoffCoord.latitude) * 1.45,
      Math.abs(vehicleCoord.latitude - pickupCoord.latitude) * 1.45,
    );
    const lngSpan = Math.max(
      0.04,
      Math.abs(pickupCoord.longitude - dropoffCoord.longitude) * 1.45,
      Math.abs(vehicleCoord.longitude - pickupCoord.longitude) * 1.45,
    );

    return {
      pickupCoord,
      dropoffCoord,
      pickupLabel: myBooking?.pickup?.label ?? ownPickupStop?.address ?? snapshot?.origin ?? 'Điểm đón',
      dropoffLabel:
        myBooking?.dropoff?.label ?? ownDropoffStop?.address ?? snapshot?.destination ?? 'Điểm trả',
      stopCoords,
      vehicleCoord,
      routeWaypoints,
      traveledPolyline,
      initialRegion: {
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: latSpan,
        longitudeDelta: lngSpan,
      },
    };
  }, [snapshot, myBooking, effectiveProgress, simProgress]);

  const fitMapToRoute = useCallback(() => {
    if (!mapRef.current) return;
    const coords: LatLng[] = [
      mapGeometry.pickupCoord,
      mapGeometry.dropoffCoord,
      mapGeometry.vehicleCoord,
      ...mapGeometry.stopCoords.map(s => ({ latitude: s.latitude, longitude: s.longitude })),
    ];
    if (coords.length >= 2) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 76, right: 48, bottom: 48, left: 48 },
        animated: true,
      });
    }
  }, [mapGeometry]);

  useEffect(() => {
    if (snapshot && !hasFittedMapRef.current) {
      hasFittedMapRef.current = true;
      const t = setTimeout(() => {
        fitMapToRoute();
      }, 350);
      return () => clearTimeout(t);
    }
  }, [snapshot, fitMapToRoute]);

  const isCompletedView =
    snapshot?.tripStatus === 'COMPLETED' || (simProgress != null && simProgress >= 1);

  const statusHeadline = useMemo(() => {
    if (isCompletedView) return 'Đã đến điểm trả';
    if (simProgress != null) {
      if (simProgress >= 0.88) return 'Sắp đến điểm trả';
      if (simProgress >= 0.2) return 'Đang trên đường đến điểm trả';
      return 'Tài xế đang đến điểm đón';
    }
    if (!snapshot) return 'Đang tải trạng thái...';
    if (snapshot.tripStatus === 'IN_PROGRESS') {
      const target = snapshot.myNextStop ?? snapshot.nextStop;
      if (target?.status === 'ARRIVED') {
        return target.stopType === 'PICKUP'
          ? 'Tài xế đã đến điểm đón'
          : 'Tài xế đã đến điểm trả';
      }
      if (target?.stopType === 'DROPOFF') {
        return 'Đang trên đường đến điểm trả';
      }
      return 'Tài xế đang đến điểm đón';
    }
    if (snapshot.assignmentStatus === 'ACCEPTED') {
      return 'Tài xế chuẩn bị xuất phát';
    }
    return 'Chờ tài xế khởi hành';
  }, [snapshot, isCompletedView, simProgress]);

  const etaMinutesDisplay = useMemo(() => {
    if (isCompletedView) return 0;
    if (simProgress != null) {
      const totalMin = snapshot?.estimatedMinutes || 120;
      return Math.max(1, Math.ceil((1 - simProgress) * Math.min(totalMin, 45)));
    }
    if (snapshot?.etaMinutesToMyStop != null) return snapshot.etaMinutesToMyStop;
    if (snapshot?.etaMinutesToNextStop != null) return snapshot.etaMinutesToNextStop;
    return Math.max(5, Math.round((snapshot?.estimatedMinutes || 60) / 4));
  }, [snapshot, isCompletedView, simProgress]);

  const nextStopNameDisplay = useMemo(() => {
    if (isCompletedView) return mapGeometry.dropoffLabel;
    if (simProgress != null) {
      if (simProgress < 0.22) return mapGeometry.pickupLabel;
      const midStop = snapshot?.stops?.find((_, i) => i > 0 && i < (snapshot.stops?.length ?? 0) - 1);
      if (simProgress < 0.65 && midStop) return midStop.address;
      return mapGeometry.dropoffLabel;
    }
    return (
      snapshot?.myNextStop?.address ??
      snapshot?.nextStop?.address ??
      mapGeometry.pickupLabel
    );
  }, [snapshot, isCompletedView, simProgress, mapGeometry]);

  const expectedArrivalClock = useMemo(() => {
    if (!snapshot) return '--:--';
    return formatArrivalTime(snapshot.departureTime, snapshot.estimatedMinutes || 60);
  }, [snapshot]);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {loading && !snapshot ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>Đang tải bản đồ và vị trí chuyến xe...</Text>
        </View>
      ) : errorMsg && !snapshot ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <Pressable style={styles.retryBtn} onPress={() => void fetchRestSnapshot(false)}>
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : snapshot ? (
        <>
          {/* Figma PA-13 Hero Interactive Map */}
          <View style={styles.mapHeroWrap}>
            <MapView
              ref={mapRef}
              style={styles.mapHero}
              initialRegion={mapGeometry.initialRegion}
              onMapReady={fitMapToRoute}
              showsCompass={false}
            >
              {/* Full planned route path (soft blue) */}
              <Polyline
                coordinates={mapGeometry.routeWaypoints}
                strokeColor="#BFD3F7"
                strokeWidth={6}
              />

              {/* Traveled / active route path (primary blue) */}
              <Polyline
                coordinates={mapGeometry.traveledPolyline}
                strokeColor="#2563EB"
                strokeWidth={6}
              />

              {/* Intermediate stops when optimized route is available */}
              {mapGeometry.stopCoords.map(({ stop, index, latitude, longitude }) => (
                <Marker
                  key={`stop-${stop.id}`}
                  coordinate={{ latitude, longitude }}
                  title={`#${index} ${stop.stopType === 'PICKUP' ? 'Đón' : 'Trả'}: ${stop.passengerName}`}
                  description={stop.address}
                >
                  <View
                    style={[
                      styles.smallStopDot,
                      stop.status === 'COMPLETED'
                        ? { backgroundColor: COLORS.emerald }
                        : stop.stopType === 'PICKUP'
                          ? { backgroundColor: COLORS.teal }
                          : { backgroundColor: COLORS.primary },
                    ]}
                  >
                    <Text style={styles.smallStopDotText}>{index}</Text>
                  </View>
                </Marker>
              ))}

              {/* Passenger's Pickup Marker (Teal circle + label like Figma PA-13) */}
              <Marker
                coordinate={mapGeometry.pickupCoord}
                title="Điểm đón"
                description={mapGeometry.pickupLabel}
              >
                <View style={styles.markerContainer}>
                  <View style={styles.pickupPinDot} />
                  <View style={styles.markerLabelPill}>
                    <Text style={styles.markerLabelText}>Điểm đón</Text>
                  </View>
                </View>
              </Marker>

              {/* Passenger's Dropoff Marker (Red pin + label like Figma PA-13) */}
              <Marker
                coordinate={mapGeometry.dropoffCoord}
                title="Điểm trả"
                description={mapGeometry.dropoffLabel}
              >
                <View style={styles.markerContainer}>
                  <View style={styles.dropoffPinCircle}>
                    <PinGlyph size={16} color="#ffffff" />
                  </View>
                  <View style={styles.markerLabelPill}>
                    <Text style={styles.markerLabelText}>Điểm trả</Text>
                  </View>
                </View>
              </Marker>

              {/* Live Bus Marker (Blue circle with white bus icon & halo ring matching Figma PA-13) */}
              <Marker
                coordinate={mapGeometry.vehicleCoord}
                title={`Xe ${snapshot.vehiclePlate} · ${snapshot.driverName}`}
                description={
                  snapshot.speedKmh != null
                    ? `Tốc độ ~${Math.round(Number(snapshot.speedKmh))} km/h`
                    : 'Vị trí xe trực tiếp'
                }
              >
                <View style={styles.busHaloOuter}>
                  <View style={styles.busCircleInner}>
                    <BusGlyph size={18} color="#ffffff" />
                  </View>
                </View>
              </Marker>
            </MapView>

            {/* Floating Top Overlay: Back button + Live pill */}
            <View style={styles.mapTopOverlay}>
              <Pressable
                onPress={() => router.back()}
                style={styles.floatingBackBtn}
                accessibilityRole="button"
                accessibilityLabel="Quay lại"
              >
                <BackGlyph size={20} color={COLORS.navy} />
              </Pressable>

              <View style={styles.OverlayRightRow}>
                <Pressable
                  onPress={fitMapToRoute}
                  style={styles.floatingFitBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Căn giữa bản đồ"
                >
                  <PinGlyph size={15} color={COLORS.primary} />
                </Pressable>

                <Pressable
                  onPress={() => {
                    void fetchRestSnapshot(false, true);
                    if (wsState !== 'CONNECTED') connectWebSocket();
                  }}
                  style={styles.floatingLivePill}
                  accessibilityRole="button"
                  accessibilityLabel="Trạng thái trực tiếp"
                >
                  <View
                    style={[
                      styles.liveDot,
                      wsState === 'CONNECTED' && !isLocationStale
                        ? { backgroundColor: '#16A34A' }
                        : isLocationStale
                          ? { backgroundColor: '#F59E0B' }
                          : { backgroundColor: '#2563EB' },
                    ]}
                  />
                  <Text style={styles.floatingLiveText}>
                    {simProgress != null
                      ? 'Trực tiếp (Demo)'
                      : wsState === 'CONNECTED' && !isLocationStale
                        ? 'Trực tiếp'
                        : isLocationStale
                          ? 'GPS trễ'
                          : 'Đang đồng bộ'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Figma PA-13 Rounded Bottom Sheet */}
          <View style={styles.bottomSheet}>
            <ScrollView
              contentContainerStyle={styles.sheetScroll}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    void fetchRestSnapshot(false, true);
                    if (wsState !== 'CONNECTED') connectWebSocket();
                  }}
                  tintColor={COLORS.primary}
                />
              }
            >
              {/* Toast Notification (PA-14) */}
              {liveToast ? (
                <Pressable
                  style={styles.toastBanner}
                  onPress={() => setLiveToast(null)}
                  accessibilityRole="button"
                >
                  <Text style={styles.toastBannerText}>{liveToast}</Text>
                  <Text style={styles.toastDismiss}>✕</Text>
                </Pressable>
              ) : null}

              {/* Stale GPS Warning Banner */}
              {isLocationStale ? (
                <View style={styles.staleWarningCard}>
                  <Text style={styles.staleWarningTitle}>
                    Tín hiệu GPS cập nhật lần cuối lúc {formatTime(snapshot.locationUpdatedAt)}
                  </Text>
                  <Text style={styles.staleWarningDesc}>
                    Đang hiển thị vị trí gần nhất của xe và tự động đồng bộ lại.
                  </Text>
                </View>
              ) : null}

              {/* Card 1: Trip Status + ETA + Progress Bar + Next Stop + Arrival Time (Figma PA-13) */}
              <View style={styles.card}>
                <View style={styles.statusTopRow}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.statusLabelSmall}>Trạng thái chuyến</Text>
                    <Text style={styles.statusHeadlineText}>{statusHeadline}</Text>
                  </View>

                  {isCompletedView ? (
                    <StatusBadge status="COMPLETED" label="Hoàn thành" />
                  ) : (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.etaBigNumber}>
                        {etaMinutesDisplay}
                        <Text style={styles.etaUnitText}> phút</Text>
                      </Text>
                      <Text style={styles.etaSubLabel}>đến điểm tiếp theo</Text>
                    </View>
                  )}
                </View>

                {/* Progress Bar */}
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.round(effectiveProgress * 100)}%` },
                    ]}
                  />
                </View>

                {!isCompletedView ? (
                  <View style={styles.nextInfoBlock}>
                    <View style={styles.nextInfoRow}>
                      <PinGlyph size={16} color={COLORS.teal} />
                      <Text style={styles.nextInfoText} numberOfLines={2}>
                        <Text style={styles.nextInfoMuted}>Điểm dừng tiếp theo: </Text>
                        <Text style={styles.nextInfoBold}>{nextStopNameDisplay}</Text>
                      </Text>
                    </View>

                    <View style={styles.nextInfoRow}>
                      <ClockGlyph size={16} color={COLORS.primary} />
                      <Text style={styles.nextInfoText}>
                        <Text style={styles.nextInfoMuted}>Dự kiến đến điểm trả: </Text>
                        <Text style={styles.nextInfoBold}>{expectedArrivalClock}</Text>
                        <Text style={styles.nextInfoLight}>
                          {' '}
                          · hành trình {formatDuration(snapshot.estimatedMinutes || 60)}
                        </Text>
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>

              {/* Card 2: Driver & Vehicle Card matching Figma PA-13 */}
              <View style={[styles.card, styles.driverCardRow]}>
                <View style={styles.driverAvatarCircle}>
                  <Text style={styles.driverAvatarInitial}>
                    {(snapshot.driverName.trim().split(/\s+/).pop()?.[0] ?? 'T').toUpperCase()}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.driverNameText}>{snapshot.driverName}</Text>
                  <Text style={styles.driverVehicleText}>
                    {snapshot.vehicleType} · {snapshot.vehiclePlate}
                  </Text>
                  <View style={styles.driverRatingRow}>
                    <StarGlyph size={13} color={COLORS.warning} filled />
                    <Text style={styles.driverRatingText}>4.9</Text>
                  </View>
                </View>

                {snapshot.driverPhone ? (
                  <Pressable
                    style={styles.driverCallCircle}
                    onPress={() => {
                      const tel = snapshot.driverPhone?.replace(/\s+/g, '');
                      if (tel) void Linking.openURL(`tel:${tel}`);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Gọi tài xế"
                  >
                    <PhoneGlyph size={18} color="#ffffff" />
                  </Pressable>
                ) : null}
              </View>

              {/* Caption matching Figma PA-13 */}
              <Text style={styles.companyCaptionText}>
                {snapshot.companyName} · Cập nhật vị trí mỗi vài giây
              </Text>

              {/* Ordered Stops Timeline when multiple stops exist */}
              {snapshot.stops.length > 0 ? (
                <View style={styles.card}>
                  <View style={styles.stopsHeaderRow}>
                    <Text style={styles.sectionTitle}>
                      {snapshot.routeOptimized
                        ? `LỘ TRÌNH ĐÓN / TRẢ (${snapshot.stops.length})`
                        : 'ĐIỂM ĐÓN / TRẢ CỦA BẠN'}
                    </Text>
                    <View
                      style={[
                        styles.routeBadgePill,
                        {
                          backgroundColor: snapshot.routeOptimized
                            ? '#DCFCE7'
                            : COLORS.primarySoft,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.routeBadgeText,
                          { color: snapshot.routeOptimized ? '#166534' : COLORS.primary },
                        ]}
                      >
                        {snapshot.routeOptimized
                          ? '✓ Lộ trình tối ưu'
                          : 'Đã ghi nhận điểm đón · trả'}
                      </Text>
                    </View>
                  </View>

                  {snapshot.stops.map((stop, idx) => {
                    const isPickup = stop.stopType === 'PICKUP';
                    const isDone = stop.status === 'COMPLETED' || isCompletedView;
                    const isArrived = !isCompletedView && stop.status === 'ARRIVED';
                    const isOwn = stop.ownStop === true;
                    return (
                      <View
                        key={stop.id}
                        style={[
                          styles.stopRow,
                          isOwn && { borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' },
                          isDone && styles.stopRowDone,
                          isArrived && styles.stopRowArrived,
                        ]}
                      >
                        <View
                          style={[
                            styles.stopBadge,
                            isDone
                              ? { backgroundColor: COLORS.emerald }
                              : isArrived
                                ? { backgroundColor: '#D97706' }
                                : isOwn
                                  ? { backgroundColor: COLORS.primary }
                                  : { backgroundColor: COLORS.slate300 },
                          ]}
                        >
                          <Text style={styles.stopBadgeText}>#{idx + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '800',
                                color: isPickup ? '#0F766E' : COLORS.primary,
                              }}
                            >
                              {isPickup ? 'ĐÓN KHÁCH' : 'TRẢ KHÁCH'}
                            </Text>
                            {isOwn ? (
                              <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.primary }}>
                                • Điểm của bạn
                              </Text>
                            ) : null}
                          </View>
                          <Text style={styles.stopAddr} numberOfLines={2}>
                            {stop.address}
                          </Text>
                          {stop.plannedArrivalAt ? (
                            <Text style={{ fontSize: 11, color: COLORS.slate500, marginTop: 2 }}>
                              Dự kiến: {formatShortTime(stop.plannedArrivalAt)}
                            </Text>
                          ) : null}
                        </View>
                        <Text
                          style={[
                            styles.stopStateTag,
                            isDone
                              ? { color: '#15803D' }
                              : isArrived
                                ? { color: '#B45309' }
                                : { color: COLORS.slate400 },
                          ]}
                        >
                          {isDone ? '✓ Đã xong' : isArrived ? '● Đã đến' : 'Sắp tới'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </ScrollView>

            {/* Figma PA-13 Footer */}
            <View style={styles.footer}>
              {isCompletedView ? (
                <Pressable
                  style={styles.primaryFullBtn}
                  onPress={() => router.replace('/(passenger)/bookings')}
                  accessibilityRole="button"
                  accessibilityLabel="Đánh giá chuyến đi"
                >
                  <StarGlyph size={18} color="#ffffff" filled />
                  <Text style={styles.primaryFullBtnText}>Đánh giá chuyến đi</Text>
                </Pressable>
              ) : (
                <View style={styles.footerRow}>
                  <Pressable
                    style={styles.demoBtn}
                    onPress={() => {
                      if (!simRunning && simProgress == null) {
                        setSimProgress(0.15);
                        setSimRunning(true);
                      } else {
                        setConfirmFinishDemo(true);
                      }
                    }}
                    accessibilityRole="button"
                  >
                    <Text style={styles.demoBtnText}>
                      {simRunning || simProgress != null
                        ? 'Kết thúc chuyến (demo)'
                        : 'Mô phỏng xe chạy'}
                    </Text>
                  </Pressable>

                  <View style={styles.disabledRateBtn}>
                    <Text style={styles.disabledRateBtnText}>Đánh giá sau chuyến đi</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Confirm Finish Demo Dialog matching Figma PA-13 */}
          <Modal
            visible={confirmFinishDemo}
            transparent
            animationType="fade"
            onRequestClose={() => setConfirmFinishDemo(false)}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Kết thúc chuyến mô phỏng?</Text>
                <Text style={styles.modalBody}>
                  Xe trên bản đồ sẽ di chuyển tới điểm trả và chuyển sang trạng thái hoàn thành
                  trong phiên xem thử này. Không làm thay đổi dữ liệu thật của tài xế hoặc nhà xe.
                </Text>
                <View style={styles.modalActions}>
                  <Pressable
                    style={styles.modalCancelBtn}
                    onPress={() => setConfirmFinishDemo(false)}
                  >
                    <Text style={styles.modalCancelText}>Hủy</Text>
                  </Pressable>
                  <Pressable
                    style={styles.modalConfirmBtn}
                    onPress={() => {
                      setSimRunning(false);
                      setSimProgress(1);
                      setConfirmFinishDemo(false);
                    }}
                  >
                    <Text style={styles.modalConfirmText}>Kết thúc chuyến</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.canvas },

  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: { fontSize: 13, color: COLORS.slate600, fontWeight: '600' },
  errorText: { fontSize: 14, color: COLORS.danger, textAlign: 'center', fontWeight: '700' },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
  },
  retryBtnText: { color: '#ffffff', fontWeight: '700' },

  // Hero Map section (Figma PA-13)
  mapHeroWrap: {
    height: 330,
    width: '100%',
    position: 'relative',
    backgroundColor: '#E8EEF5',
  },
  mapHero: {
    width: '100%',
    height: '100%',
  },
  mapTopOverlay: {
    position: 'absolute',
    top: 52,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  OverlayRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  floatingBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...CARD_SHADOW,
  },
  floatingFitBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...CARD_SHADOW,
  },
  floatingLivePill: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    ...CARD_SHADOW,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  floatingLiveText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navy,
  },

  // Map Custom Markers
  markerContainer: {
    alignItems: 'center',
  },
  pickupPinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.teal,
    borderWidth: 3.5,
    borderColor: '#ffffff',
    ...CARD_SHADOW,
  },
  dropoffPinCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.danger,
    borderWidth: 2.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    ...CARD_SHADOW,
  },
  markerLabelPill: {
    marginTop: 3,
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  markerLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.navy,
  },
  busHaloOuter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(37, 99, 235, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  busCircleInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    borderWidth: 2.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    ...CARD_SHADOW,
  },
  smallStopDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallStopDotText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },

  // Rounded Bottom Sheet (Figma PA-13)
  bottomSheet: {
    flex: 1,
    marginTop: -22,
    backgroundColor: COLORS.canvas,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -6 },
    elevation: 8,
  },
  sheetScroll: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 24,
    gap: 12,
  },

  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderColor: '#6EE7B7',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  toastBannerText: { flex: 1, fontSize: 13, fontWeight: '700', color: '#065F46' },
  toastDismiss: { fontSize: 13, fontWeight: '700', color: '#047857', marginLeft: 8 },

  staleWarningCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  staleWarningTitle: { fontSize: 12, fontWeight: '700', color: '#92400E' },
  staleWarningDesc: { fontSize: 11, color: '#78350F', marginTop: 2 },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    ...CARD_SHADOW,
  },
  statusTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  statusLabelSmall: {
    fontSize: 12,
    color: COLORS.slate500,
    fontWeight: '500',
  },
  statusHeadlineText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.navy,
    marginTop: 3,
    lineHeight: 24,
  },
  etaBigNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2563EB',
    lineHeight: 28,
  },
  etaUnitText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  etaSubLabel: {
    fontSize: 11,
    color: COLORS.slate500,
    marginTop: 3,
  },
  progressTrack: {
    marginTop: 14,
    height: 8,
    backgroundColor: COLORS.slate100,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 999,
  },
  nextInfoBlock: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    gap: 8,
  },
  nextInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  nextInfoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  nextInfoMuted: { color: COLORS.slate500 },
  nextInfoBold: { color: COLORS.navy, fontWeight: '700' },
  nextInfoLight: { color: COLORS.slate400 },

  // Driver Card
  driverCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driverAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.tealDark,
  },
  driverNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.navy,
  },
  driverVehicleText: {
    fontSize: 12,
    color: COLORS.slate500,
    marginTop: 2,
  },
  driverRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  driverRatingText: {
    fontSize: 12,
    color: COLORS.slate600,
    fontWeight: '600',
  },
  driverCallCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  companyCaptionText: {
    fontSize: 12,
    color: COLORS.slate400,
    textAlign: 'center',
    marginVertical: 2,
  },

  // Ordered Stops
  stopsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.slate500,
    letterSpacing: 0.6,
  },
  routeBadgePill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  routeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.slate100,
    marginBottom: 8,
  },
  stopRowDone: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  stopRowArrived: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  stopBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
  },
  stopBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  stopAddr: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.navy,
    marginTop: 2,
  },
  stopStateTag: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Footer
  footer: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 26,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  demoBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  demoBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navy,
    textAlign: 'center',
  },
  disabledRateBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: COLORS.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  disabledRateBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.slate400,
    textAlign: 'center',
  },
  primaryFullBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryFullBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 20,
    ...CARD_SHADOW,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.navy,
  },
  modalBody: {
    fontSize: 13,
    color: COLORS.slate600,
    marginTop: 8,
    lineHeight: 19,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.navy,
  },
  modalConfirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
