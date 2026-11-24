/**
 * SP3-P2-04: Passenger Realtime Live Tracking & Notification Screen (Figma PA-13 & PA-14)
 * - Connects to WebSocket /ws/trips/{tripId}?token=... for live location & stop status events
 * - Automatic WebSocket reconnect + authoritative REST snapshot resync (GET /api/v1/trips/{tripId}/live-snapshot)
 * - Displays connection state (Live / Stale / Reconnecting), Interactive Map with Vehicle + Stop markers,
 *   Next Stop & ETA card, Ordered TripStops progress, and Live Activity / Notification Feed (PA-14).
 * Route: /(passenger)/tracking/[tripId]
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
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
  getTripLiveSnapshot,
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
  StatusBadge,
} from '../../../src/components/UI';
import { CARD_SHADOW, COLORS, PRIMARY_SHADOW } from '../../../src/theme/tokens';

const REGION_COORDS: Record<string, { lat: number; lng: number }> = {
  'Đà Nẵng': { lat: 16.0544, lng: 108.2022 },
  'Huế': { lat: 16.4637, lng: 107.5909 },
  'Hội An': { lat: 15.8801, lng: 108.338 },
  'Tam Kỳ': { lat: 15.5736, lng: 108.474 },
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
      return '🗺 Nhà xe đã duyệt lộ trình đón/trả tối ưu mới';
    case 'TRIP_ACCEPTED':
      return '🔔 Tài xế đã xác nhận nhận chuyến đi';
    case 'TRIP_STARTED':
      return '🚍 Xe đã xuất phát! Đang truyền vị trí GPS trực tiếp';
    case 'STOP_ARRIVED':
      return '📍 Tài xế đã đến điểm dừng đón/trả';
    case 'STOP_PICKED_UP':
      return '✓ Tài xế đã xác nhận đón khách lên xe';
    case 'STOP_DROPPED_OFF':
      return '✓ Tài xế đã xác nhận trả khách tại điểm đến';
    case 'TRIP_COMPLETED':
      return '🎉 Chuyến đi đã hoàn thành an toàn';
    case 'INCIDENT_REPORTED':
      return '⚠ Tài xế vừa gửi báo cáo sự cố trên chuyến đi';
    default:
      return null;
  }
}

export default function PassengerLiveTrackingScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const params = useLocalSearchParams<{ tripId: string }>();
  const numericTripId = Number(params.tripId || 0);

  const [snapshot, setSnapshot] = useState<TripLiveSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [wsState, setWsState] = useState<'CONNECTING' | 'CONNECTED' | 'RECONNECTING'>('CONNECTING');
  const [liveToast, setLiveToast] = useState<string | null>(null);
  const [clientStaleTick, setClientStaleTick] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

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
        const data = await getTripLiveSnapshot(session.accessToken, numericTripId);
        if (!unmountedRef.current) {
          setSnapshot(data);
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
    [session?.accessToken, numericTripId],
  );

  // Connect WebSocket with capped exponential backoff & AppState foreground/background recovery (SP4-P2-05)
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
        // ADR-003: Fetch authoritative REST snapshot upon connection/reconnection
        fetchRestSnapshot(true);
      };

      ws.onmessage = event => {
        if (unmountedRef.current) return;
        try {
          const payload = JSON.parse(String(event.data)) as TripLiveSnapshot;
          if (payload && payload.tripId) {
            if (payload.eventType === 'SNAPSHOT' && payload.myNextStop !== undefined) {
              setSnapshot(payload);
            } else {
              // Merge live GPS/status smoothly while preserving passenger-scoped ownStop & personal ETA
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
              // Re-sync personalized stops & personal ETA when route/stops change
              if (payload.eventType !== 'LOCATION_UPDATED') {
                fetchRestSnapshot(true);
              }
            }
            setErrorMsg(null);
            const toastText = describeEventBadge(payload.eventType);
            if (toastText) {
              setLiveToast(toastText);
            }
          }
        } catch {
          // ignore non-snapshot frames (e.g. PONG)
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
            fetchRestSnapshot(true);
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
    fetchRestSnapshot(false);
    connectWebSocket();

    // Pause WebSocket cleanly on background & resync snapshot + reconnect on foreground (SP4-P2-05)
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
        fetchRestSnapshot(true);
        connectWebSocket();
      }
    });

    // Periodic fallback sync & client-side stale timer every 8s
    const interval = setInterval(() => {
      setClientStaleTick(t => t + 1);
      fetchRestSnapshot(true);
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

  // Compute whether location is stale (server flag or client age > 45s while IN_PROGRESS)
  const isLocationStale = useMemo(() => {
    void clientStaleTick;
    if (!snapshot) return false;
    if (snapshot.tripStatus !== 'IN_PROGRESS') return false;
    if (snapshot.locationStale) return true;
    if (!snapshot.locationUpdatedAt) return true;
    const ageSeconds = (Date.now() - new Date(snapshot.locationUpdatedAt).getTime()) / 1000;
    return ageSeconds > 45;
  }, [snapshot, clientStaleTick]);

  // Compute coordinates for MapView
  const mapGeometry = useMemo(() => {
    const originCoord = guessCoords(snapshot?.origin, { lat: 16.0544, lng: 108.2022 });
    const destCoord = guessCoords(snapshot?.destination, { lat: 16.4637, lng: 107.5909 });

    const stopCoords: {
      stop: TripStopRecord;
      index: number;
      latitude: number;
      longitude: number;
    }[] = [];

    const stops = snapshot?.stops ?? [];
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
          latitude: originCoord.lat + (destCoord.lat - originCoord.lat) * ratio,
          longitude: originCoord.lng + (destCoord.lng - originCoord.lng) * ratio,
        });
      }
    });

    const vehicleCoord =
      snapshot?.currentLat != null && snapshot?.currentLng != null
        ? {
          latitude: Number(snapshot.currentLat),
          longitude: Number(snapshot.currentLng),
        }
        : stopCoords[0]
          ? { latitude: stopCoords[0].latitude, longitude: stopCoords[0].longitude }
          : { latitude: originCoord.lat, longitude: originCoord.lng };

    const polylinePoints = [
      { latitude: originCoord.lat, longitude: originCoord.lng },
      ...stopCoords.map(sc => ({ latitude: sc.latitude, longitude: sc.longitude })),
      { latitude: destCoord.lat, longitude: destCoord.lng },
    ];

    return {
      originCoord,
      destCoord,
      stopCoords,
      vehicleCoord,
      polylinePoints,
      region: {
        latitude: vehicleCoord.latitude,
        longitude: vehicleCoord.longitude,
        latitudeDelta: 0.22,
        longitudeDelta: 0.22,
      },
    };
  }, [snapshot]);

  const progressPercent = useMemo(() => {
    if (!snapshot || snapshot.totalStopsCount === 0) {
      return snapshot?.tripStatus === 'COMPLETED' ? 100 : 0;
    }
    return Math.round((snapshot.completedStopsCount / snapshot.totalStopsCount) * 100);
  }, [snapshot]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.hero}>
        <View style={styles.heroGlow} />
        <View style={styles.heroRow}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
          >
            <BackGlyph size={18} color="#ffffff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroOverline}>THEO DÕI HÀNH TRÌNH TRỰC TIẾP (PA-13)</Text>
            <Text style={styles.heroTitle} numberOfLines={1}>
              {snapshot ? `${snapshot.origin} → ${snapshot.destination}` : `Chuyến #${numericTripId}`}
            </Text>
          </View>
          {snapshot ? <StatusBadge status={snapshot.tripStatus} /> : null}
        </View>

        {/* Connection & Stale Status Bar */}
        <View style={styles.connBar}>
          <View style={styles.connLeft}>
            <View
              style={[
                styles.connDot,
                wsState === 'CONNECTED' && !isLocationStale
                  ? { backgroundColor: '#10B981' }
                  : isLocationStale
                    ? { backgroundColor: '#F59E0B' }
                    : { backgroundColor: '#F97316' },
              ]}
            />
            <Text style={styles.connText}>
              {wsState === 'CONNECTED' && !isLocationStale
                ? 'Trực tiếp (WebSocket Live)'
                : isLocationStale
                  ? 'Tín hiệu GPS cũ (Stale > 45s)'
                  : 'Đang kết nối lại WS · Đồng bộ qua REST'}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              fetchRestSnapshot(false);
              if (wsState !== 'CONNECTED') connectWebSocket();
            }}
            style={styles.resyncBtn}
            accessibilityRole="button"
          >
            <Text style={styles.resyncBtnText}>Đồng bộ ↻</Text>
          </Pressable>
        </View>
      </View>

      {loading && !snapshot ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>Đang tải bản đồ và vị trí chuyến xe...</Text>
        </View>
      ) : errorMsg && !snapshot ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <Pressable style={styles.retryBtn} onPress={() => fetchRestSnapshot(false)}>
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : snapshot ? (
        <ScrollView
          contentContainerStyle={styles.content}
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
          {/* Live Event Notification Toast (PA-14) */}
          {liveToast ? (
            <Pressable
              style={styles.toastBanner}
              onPress={() => setLiveToast(null)}
              accessibilityRole="button"
            >
              <Text style={styles.toastBannerText}>{liveToast}</Text>
              <Text style={styles.toastDismiss}>Đóng ✕</Text>
            </Pressable>
          ) : null}

          {/* Stale GPS Warning Banner */}
          {isLocationStale ? (
            <View style={styles.staleWarningCard}>
              <Text style={styles.staleWarningTitle}>
                ⚠ Tín hiệu định vị GPS của xe chưa cập nhật mới
              </Text>
              <Text style={styles.staleWarningDesc}>
                Lần cập nhật cuối: {formatTime(snapshot.locationUpdatedAt)}. Hệ thống đang hiển thị vị
                trí gần nhất được lưu và tự động đồng bộ lại.
              </Text>
            </View>
          ) : null}

          {/* Interactive Live Map Card */}
          <View style={styles.mapCard}>
            <MapView
              style={styles.map}
              initialRegion={mapGeometry.region}
              region={mapGeometry.region}
            >
              <Polyline
                coordinates={mapGeometry.polylinePoints}
                strokeColor={COLORS.primary}
                strokeWidth={3}
              />

              {/* Ordered Pickup & Dropoff Stop Markers */}
              {mapGeometry.stopCoords.map(({ stop, index, latitude, longitude }) => (
                <Marker
                  key={stop.id}
                  coordinate={{ latitude, longitude }}
                  title={`#${index} ${stop.stopType === 'PICKUP' ? 'Đón' : 'Trả'}: ${stop.passengerName}`}
                  description={`${stop.address} (${stop.status})`}
                  pinColor={stop.stopType === 'PICKUP' ? '#10B981' : '#4F46E5'}
                />
              ))}

              {/* Live Vehicle Marker */}
              <Marker
                coordinate={mapGeometry.vehicleCoord}
                title={`Xe ${snapshot.vehiclePlate} (${snapshot.driverName})`}
                description={
                  snapshot.speedKmh != null
                    ? `Tốc độ ~${Math.round(Number(snapshot.speedKmh))} km/h`
                    : 'Vị trí xe hiện tại'
                }
              >
                <View style={styles.vehicleMarkerBubble}>
                  <BusGlyph size={14} color="#ffffff" />
                  <Text style={styles.vehicleMarkerText}>{snapshot.vehiclePlate}</Text>
                </View>
              </Marker>
            </MapView>

            <View style={styles.mapFooterBar}>
              <Text style={styles.mapCoordMeta}>
                GPS:{' '}
                {snapshot.currentLat != null && snapshot.currentLng != null
                  ? `${Number(snapshot.currentLat).toFixed(4)}, ${Number(snapshot.currentLng).toFixed(4)}`
                  : 'Đang chờ xe phát tín hiệu GPS'}
              </Text>
              <Text style={styles.mapTimeMeta}>
                Cập nhật: {formatTime(snapshot.locationUpdatedAt || snapshot.serverTimestamp)}
              </Text>
            </View>
          </View>

          {/* SP3-P1-04: Passenger's Own Stop & Personal ETA Card */}
          {snapshot.myNextStop ? (
            <View
              style={[
                styles.card,
                {
                  borderColor: '#6EE7B7',
                  borderWidth: 1.5,
                  backgroundColor: '#ECFDF5',
                },
              ]}
            >
              <View style={styles.nextStopHeader}>
                <Text style={[styles.nextStopLabel, { color: '#065F46' }]}>
                  ĐIỂM CỦA BẠN &amp; ETA DỰ KIẾN (PA-13)
                </Text>
                {snapshot.etaMinutesToMyStop != null ? (
                  <View style={[styles.etaBadge, { backgroundColor: COLORS.emerald }]}>
                    <ClockGlyph size={13} color="#ffffff" />
                    <Text style={styles.etaBadgeText}>
                      {snapshot.etaMinutesToMyStop === 0
                        ? 'Xe đã đến điểm của bạn'
                        : `~${snapshot.etaMinutesToMyStop} phút`}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <View
                  style={[
                    styles.stopTypePill,
                    snapshot.myNextStop.stopType === 'PICKUP'
                      ? { backgroundColor: '#A7F3D0' }
                      : { backgroundColor: '#C7D2FE' },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '800',
                      color: snapshot.myNextStop.stopType === 'PICKUP' ? '#065F46' : '#3730A3',
                    }}
                  >
                    {snapshot.myNextStop.stopType === 'PICKUP'
                      ? 'ĐIỂM ĐÓN CỦA BẠN'
                      : 'ĐIỂM TRẢ CỦA BẠN'}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#047857' }}>
                  Thứ tự #{snapshot.myNextStop.stopOrder}
                  {snapshot.myNextStop.plannedArrivalAt
                    ? ` · Dự kiến ${formatShortTime(snapshot.myNextStop.plannedArrivalAt)}`
                    : ''}
                </Text>
              </View>
              <Text style={styles.nextStopAddress}>{snapshot.myNextStop.address}</Text>
            </View>
          ) : null}

          {/* Next Stop & ETA Card */}
          <View style={[styles.card, styles.nextStopCard]}>
            <View style={styles.nextStopHeader}>
              <Text style={styles.nextStopLabel}>ĐIỂM DỪNG TIẾP THEO & DỰ KIẾN ĐẾN (ETA)</Text>
              {snapshot.etaMinutesToNextStop != null ? (
                <View style={styles.etaBadge}>
                  <ClockGlyph size={13} color="#ffffff" />
                  <Text style={styles.etaBadgeText}>
                    {snapshot.etaMinutesToNextStop === 0
                      ? 'Đã đến điểm'
                      : `~${snapshot.etaMinutesToNextStop} phút`}
                  </Text>
                </View>
              ) : null}
            </View>

            {snapshot.nextStop ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <View
                    style={[
                      styles.stopTypePill,
                      snapshot.nextStop.stopType === 'PICKUP'
                        ? { backgroundColor: '#D1FAE5' }
                        : { backgroundColor: '#E0E7FF' },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '800',
                        color:
                          snapshot.nextStop.stopType === 'PICKUP' ? '#065F46' : '#3730A3',
                      }}
                    >
                      {snapshot.nextStop.stopType === 'PICKUP'
                        ? 'ĐÓN KHÁCH (PICKUP)'
                        : 'TRẢ KHÁCH (DROPOFF)'}
                    </Text>
                  </View>
                  <Text style={styles.nextStopStatus}>
                    {snapshot.nextStop.status === 'ARRIVED'
                      ? '● Xe đang ở tại điểm dừng'
                      : '○ Xe đang di chuyển tới'}
                  </Text>
                </View>

                <Text style={styles.nextStopAddress}>{snapshot.nextStop.address}</Text>
                <Text style={styles.nextStopPassenger}>
                  Hành khách: {snapshot.nextStop.passengerName} ({snapshot.nextStop.seatCount} ghế)
                </Text>
              </>
            ) : (
              <Text style={styles.nextStopAddress}>
                {snapshot.tripStatus === 'COMPLETED'
                  ? '✓ Chuyến xe đã hoàn thành toàn bộ lộ trình đón/trả.'
                  : 'Đang chờ tài xế bắt đầu lộ trình.'}
              </Text>
            )}

            {/* Progress Bar */}
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Tiến độ hành trình</Text>
                <Text style={styles.progressCount}>
                  {snapshot.completedStopsCount}/{snapshot.totalStopsCount} điểm dừng ({progressPercent}%)
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
              </View>
            </View>
          </View>

          {/* Driver & Vehicle Summary Card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>TÀI XẾ & PHƯƠNG TIỆN PHỤ TRÁCH</Text>
            <View style={styles.driverRow}>
              <View style={styles.driverAvatar}>
                <Text style={styles.driverAvatarText}>TX</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.driverName}>{snapshot.driverName}</Text>
                <Text style={styles.vehicleMeta}>
                  {snapshot.vehiclePlate} · {snapshot.vehicleType} · {snapshot.companyName}
                </Text>
              </View>
              {snapshot.driverPhone ? (
                <Pressable
                  style={styles.callDriverBtn}
                  onPress={() => Linking.openURL(`tel:${snapshot.driverPhone}`)}
                  accessibilityRole="button"
                  accessibilityLabel="Gọi tài xế"
                >
                  <PhoneGlyph size={14} color="#ffffff" />
                  <Text style={styles.callDriverText}>Gọi tài xế</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* Ordered Stops Timeline (SP3-P1-04: Approved proposal stops & passenger privacy) */}
          <View style={styles.card}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
                gap: 8,
              }}
            >
              <Text style={[styles.sectionTitle, { marginBottom: 0, flex: 1 }]}>
                {snapshot.routeOptimized
                  ? `LỘ TRÌNH ĐÓN / TRẢ (${snapshot.stops.length})`
                  : 'ĐIỂM ĐÓN / TRẢ CỦA BẠN'}
              </Text>
              <View
                style={{
                  backgroundColor: snapshot.routeOptimized ? '#DCFCE7' : COLORS.primarySoft,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 999,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '800',
                    color: snapshot.routeOptimized ? '#166534' : COLORS.primary,
                  }}
                >
                  {snapshot.routeOptimized
                    ? '✓ Lộ trình chính thức'
                    : 'Đã ghi nhận điểm đón · trả'}
                </Text>
              </View>
            </View>

            {snapshot.stops.length === 0 ? (
              <Text style={styles.emptyMeta}>Chưa có danh sách điểm dừng trên chuyến này.</Text>
            ) : (
              snapshot.stops.map((stop, idx) => {
                const isPickup = stop.stopType === 'PICKUP';
                const isDone = stop.status === 'COMPLETED';
                const isArrived = stop.status === 'ARRIVED';
                const isOwn = stop.ownStop === true;
                return (
                  <View
                    key={stop.id}
                    style={[
                      styles.stopRow,
                      isOwn && { borderColor: COLORS.primary, backgroundColor: '#F5F3FF' },
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '800',
                            color: isPickup ? '#065F46' : '#3730A3',
                          }}
                        >
                          {isPickup ? 'ĐÓN KHÁCH' : 'TRẢ KHÁCH'}
                        </Text>
                        {isOwn ? (
                          <View
                            style={{
                              backgroundColor: COLORS.primary,
                              paddingHorizontal: 6,
                              paddingVertical: 1,
                              borderRadius: 6,
                            }}
                          >
                            <Text style={{ color: '#ffffff', fontSize: 9, fontWeight: '800' }}>
                              ĐIỂM CỦA BẠN
                            </Text>
                          </View>
                        ) : null}
                        <Text style={{ fontSize: 11, color: COLORS.slate500 }}>
                          · {isOwn ? `${stop.passengerName} (${stop.seatCount} ghế)` : 'Hành khách khác'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <PinGlyph size={13} color={COLORS.slate500} />
                        <Text style={styles.stopAddr}>{stop.address}</Text>
                      </View>
                      {stop.plannedArrivalAt ? (
                        <Text style={{ fontSize: 11, color: COLORS.slate500, marginTop: 2 }}>
                          Giờ đến dự kiến: {formatShortTime(stop.plannedArrivalAt)}
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
                      {isDone ? '✓ Đã xong' : isArrived ? '● Đã đến' : 'Chờ đến'}
                    </Text>
                  </View>
                );
              })
            )}
          </View>

          {/* PA-14: Realtime Trip Notifications & Activity Feed */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>THÔNG BÁO CẬP NHẬT TRẠNG THÁI CHUYẾN (PA-14)</Text>
            {snapshot.recentEvents && snapshot.recentEvents.length > 0 ? (
              snapshot.recentEvents.map((ev, idx) => (
                <View key={`${idx}-${ev}`} style={styles.eventItem}>
                  <View
                    style={[
                      styles.eventDot,
                      idx === 0
                        ? { backgroundColor: COLORS.emerald }
                        : { backgroundColor: COLORS.slate300 },
                    ]}
                  />
                  <Text
                    style={[
                      styles.eventText,
                      idx === 0 && { fontWeight: '700', color: COLORS.slate900 },
                    ]}
                  >
                    {ev}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyMeta}>Chưa có thông báo hoạt động nào.</Text>
            )}
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  hero: {
    backgroundColor: COLORS.navy,
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.primary,
    opacity: 0.25,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
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
  heroOverline: {
    color: COLORS.teal,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 1,
  },
  connBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  connLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  connDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  connText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  resyncBtn: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  resyncBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },

  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 36,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.slate600,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 14,
    color: COLORS.rose,
    textAlign: 'center',
    fontWeight: '700',
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#ffffff',
    fontWeight: '800',
  },

  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderColor: '#6EE7B7',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  toastBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  toastDismiss: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
    marginLeft: 8,
  },

  staleWarningCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  staleWarningTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 3,
  },
  staleWarningDesc: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 17,
  },

  mapCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.slate200,
    ...CARD_SHADOW,
  },
  map: {
    width: '100%',
    height: 230,
  },
  vehicleMarkerBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.navy,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  vehicleMarkerText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  mapFooterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.slate50,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate100,
  },
  mapCoordMeta: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.slate700,
  },
  mapTimeMeta: {
    fontSize: 11,
    color: COLORS.slate500,
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.slate100,
    ...CARD_SHADOW,
  },
  nextStopCard: {
    borderColor: '#C7D2FE',
    backgroundColor: '#F8FAFF',
  },
  nextStopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  nextStopLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.6,
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  etaBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  stopTypePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  nextStopStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.slate600,
  },
  nextStopAddress: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.slate900,
    lineHeight: 21,
  },
  nextStopPassenger: {
    fontSize: 12,
    color: COLORS.slate600,
    marginTop: 4,
  },
  progressSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E7FF',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.slate600,
  },
  progressCount: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.emerald,
    borderRadius: 999,
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.slate500,
    letterSpacing: 0.7,
    marginBottom: 12,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  driverName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.slate900,
  },
  vehicleMeta: {
    fontSize: 12,
    color: COLORS.slate600,
    marginTop: 2,
  },
  callDriverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.emerald,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    ...PRIMARY_SHADOW,
  },
  callDriverText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },

  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
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
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.slate800,
  },
  stopStateTag: {
    fontSize: 11,
    fontWeight: '800',
  },
  emptyMeta: {
    fontSize: 13,
    color: COLORS.slate500,
  },

  eventItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate50,
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  eventText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.slate700,
    lineHeight: 18,
  },
});
