/**
 * SP1-P2-05: Driver Home Screen — list of trips assigned to this driver.
 *
 * Route: /(driver)/
 * Shows ASSIGNED / IN_PROGRESS trips. Execution flow (SP3-P2-03) is deferred.
 */

import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../../src/session/AuthContext';

// ---- types (matches backend TripResponse shape) ----
interface DriverTripSummary {
  id: number;
  origin: string;
  destination: string;
  departureTime: string;
  vehiclePlate: string;
  seatCapacity: number;
  bookedSeats: number;
  status: 'DRAFT' | 'PUBLISHED' | 'FULL' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

function statusMeta(status: DriverTripSummary['status']): { label: string; color: string; bg: string } {
  switch (status) {
    case 'PUBLISHED': return { label: 'Chờ khởi hành', color: '#fbbf24', bg: '#451a03' };
    case 'FULL': return { label: 'Đủ chỗ', color: '#60a5fa', bg: '#1e3a8a' };
    case 'IN_PROGRESS': return { label: 'Đang chạy', color: '#34d399', bg: '#064e3b' };
    case 'COMPLETED': return { label: 'Hoàn thành', color: '#a5b4fc', bg: '#312e81' };
    case 'CANCELLED': return { label: 'Đã hủy', color: '#94a3b8', bg: '#1e293b' };
    default: return { label: status, color: '#94a3b8', bg: '#1e293b' };
  }
}

function formatDeparture(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', {
    weekday: 'short', day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

async function getDriverTrips(token: string): Promise<DriverTripSummary[]> {
  const res = await fetch(`${BASE_URL}/api/v1/driver/trips`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { message?: string }).message ?? 'Không tải được danh sách chuyến');
  }
  const json = await res.json() as { data: DriverTripSummary[] };
  return json.data;
}

export default function DriverHomeScreen() {
  const router = useRouter();
  const { session, signOut, loading: authLoading } = useAuth();

  const [trips, setTrips] = useState<DriverTripSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadTrips = useCallback(async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const list = await getDriverTrips(session.accessToken);
      setTrips(list);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể tải danh sách chuyến');
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken]);

  useEffect(() => { loadTrips(); }, [loadTrips]);

  function renderHeader() {
    return (
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>RIDESHARE HUB</Text>
          <Text style={styles.role}>🚗 Tài xế</Text>
        </View>
        <Pressable
          onPress={signOut}
          disabled={authLoading}
          style={[styles.logoutBtn, authLoading && { opacity: 0.5 }]}
          accessibilityRole="button"
          accessibilityLabel="Đăng xuất"
        >
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </Pressable>
      </View>
    );
  }

  function renderTrip({ item }: { item: DriverTripSummary }) {
    const badge = statusMeta(item.status);
    const isActive = item.status === 'IN_PROGRESS' || item.status === 'PUBLISHED' || item.status === 'FULL';
    return (
      <Pressable
        style={[styles.card, isActive && styles.cardActive]}
        onPress={() => {
          // SP3-P2-03: trip execution screen (not yet implemented)
          router.push({ pathname: '/(driver)/trip/[tripId]', params: { tripId: item.id } } as never);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Chuyến ${item.origin} đến ${item.destination}`}
      >
        <View style={styles.cardRow}>
          <Text style={styles.route}>{item.origin} → {item.destination}</Text>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>
        <Text style={styles.dep}>{formatDeparture(item.departureTime)}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.meta}>🚌 {item.vehiclePlate}</Text>
          <Text style={styles.meta}>💺 {item.bookedSeats}/{item.seatCapacity} ghế</Text>
        </View>
        {isActive && (
          <Text style={styles.tapHint}>Nhấn để xem chi tiết chuyến →</Text>
        )}
      </Pressable>
    );
  }

  return (
    <View style={styles.root}>
      {loading ? (
        <View style={styles.center}>
          {renderHeader()}
          <ActivityIndicator color="#6366f1" size="large" style={{ marginTop: 48 }} />
          <Text style={styles.loadingText}>Đang tải danh sách chuyến…</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.center}>
          {renderHeader()}
          <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
          <Pressable style={styles.retryBtn} onPress={loadTrips}>
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={t => String(t.id)}
          ListHeaderComponent={renderHeader()}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🚗</Text>
              <Text style={styles.emptyText}>
                Chưa có chuyến nào được giao.{'\n'}Vui lòng liên hệ nhà xe.
              </Text>
            </View>
          }
          renderItem={renderTrip}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, paddingHorizontal: 24 },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brand: { color: '#6366f1', fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  role: { color: '#f1f5f9', fontSize: 20, fontWeight: '700', marginTop: 4 },
  logoutBtn: {
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 4,
  },
  logoutText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },

  list: { paddingHorizontal: 24, paddingBottom: 40 },

  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardActive: { borderColor: '#6366f1' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  route: { color: '#f1f5f9', fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  dep: { color: '#6366f1', fontSize: 13, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', gap: 16 },
  meta: { color: '#94a3b8', fontSize: 13 },
  tapHint: { color: '#6366f1', fontSize: 12, marginTop: 10, fontStyle: 'italic' },

  loadingText: { color: '#64748b', textAlign: 'center', marginTop: 12 },
  errorText: { color: '#ef4444', textAlign: 'center', marginTop: 32, fontSize: 14 },
  retryBtn: { marginTop: 16, backgroundColor: '#6366f1', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  retryText: { color: '#fff', fontWeight: '600' },
  emptyBox: { alignItems: 'center', paddingTop: 48 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 14, lineHeight: 22 },
});
