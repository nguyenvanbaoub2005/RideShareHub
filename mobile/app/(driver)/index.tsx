/**
 * SP1-P2-05: Driver Home Screen — Figma DR-02 / DR-03 light canvas + navy hero.
 * Route: /(driver)/
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
import { getDriverTrips, type DriverTripSummary } from '../../src/api/client';
import { useAuth } from '../../src/session/AuthContext';
import { StatusBadge } from '../../src/components/UI';
import { CARD_SHADOW, COLORS } from '../../src/theme/tokens';

type FilterTab = 'ALL' | 'UPCOMING' | 'ONGOING' | 'DONE';

const FILTERS: [FilterTab, string][] = [
  ['ALL', 'Tất cả'],
  ['UPCOMING', 'Chờ khởi hành'],
  ['ONGOING', 'Đang chạy'],
  ['DONE', 'Đã xong'],
];

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}

export default function DriverHomeScreen() {
  const router = useRouter();
  const { session, signOut, loading: authLoading } = useAuth();

  const [trips, setTrips] = useState<DriverTripSummary[]>([]);
  const [filter, setFilter] = useState<FilterTab>('ALL');
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

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const filtered = trips.filter(t => {
    if (filter === 'ALL') return true;
    if (filter === 'UPCOMING') return t.status === 'PUBLISHED' || t.status === 'FULL';
    if (filter === 'ONGOING') return t.status === 'IN_PROGRESS';
    return t.status === 'COMPLETED' || t.status === 'CANCELLED';
  });

  const upcomingCount = trips.filter(t => t.status === 'PUBLISHED' || t.status === 'FULL').length;
  const ongoingCount = trips.filter(t => t.status === 'IN_PROGRESS').length;

  function renderHeader() {
    return (
      <View>
        <View style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>TX</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>Xin chào,</Text>
              <Text style={styles.heroTitle}>Chuyến được giao</Text>
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

          <View style={styles.filterRow}>
            {FILTERS.map(([key, label]) => {
              const active = filter === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setFilter(key)}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.statsGrid}>
          {[
            [String(trips.length), 'Tổng chuyến'],
            [String(upcomingCount), 'Sắp khởi hành'],
            [String(ongoingCount), 'Đang chạy'],
          ].map(([val, lbl]) => (
            <View key={lbl} style={styles.statCard}>
              <Text style={styles.statValue}>{val}</Text>
              <Text style={styles.statLabel}>{lbl}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  function renderTrip({ item }: { item: DriverTripSummary }) {
    const isHighlight = item.status === 'IN_PROGRESS' || item.status === 'PUBLISHED' || item.status === 'FULL';
    const booked = item.bookedSeats ?? 0;
    return (
      <Pressable
        style={[styles.card, isHighlight && styles.cardHighlight]}
        onPress={() =>
          router.push({
            pathname: '/(driver)/trip/[tripId]',
            params: { tripId: String(item.id), data: JSON.stringify(item) },
          } as never)
        }
        accessibilityRole="button"
        accessibilityLabel={`Chuyến ${item.origin} đến ${item.destination}`}
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardMeta}>
            {formatDay(item.departureTime)} · #{item.id}
          </Text>
          <StatusBadge status={item.status} />
        </View>

        <View style={styles.timeRow}>
          <Text style={styles.departBig}>{formatTime(item.departureTime)}</Text>
          {item.estimatedMinutes ? (
            <Text style={styles.durationText}>~{item.estimatedMinutes} phút</Text>
          ) : null}
        </View>

        <Text style={styles.route}>
          {item.origin} → {item.destination}
        </Text>

        <View style={styles.infoGrid}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Hành khách</Text>
            <Text style={styles.infoVal}>
              {booked}/{item.seatCapacity} khách
            </Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Phương tiện</Text>
            <Text style={styles.infoVal}>{item.vehiclePlate}</Text>
          </View>
        </View>

        <View style={styles.ctaRow}>
          <Text style={styles.ctaText}>Xem chi tiết chuyến →</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.root}>
      {loading ? (
        <View style={styles.flex}>
          {renderHeader()}
          <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 48 }} />
          <Text style={styles.loadingText}>Đang tải danh sách chuyến…</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.flex}>
          {renderHeader()}
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
            <Pressable style={styles.retryBtn} onPress={loadTrips}>
              <Text style={styles.retryText}>Thử lại</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={t => String(t.id)}
          ListHeaderComponent={renderHeader()}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Không có chuyến nào</Text>
              <Text style={styles.emptyText}>
                Chuyến được nhà xe phân công cho bạn sẽ hiển thị tại đây.
              </Text>
            </View>
          }
          renderItem={renderTrip}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.canvas },
  flex: { flex: 1 },
  hero: {
    backgroundColor: COLORS.navy,
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 18,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.navy, fontSize: 16, fontWeight: '800' },
  greeting: { color: COLORS.slate300, fontSize: 13 },
  heroTitle: { color: '#ffffff', fontSize: 22, fontWeight: '800', marginTop: 1 },
  logoutBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoutText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },

  filterRow: { flexDirection: 'row', gap: 8, marginTop: 18, flexWrap: 'wrap' },
  filterPill: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
  },
  filterPillActive: { backgroundColor: COLORS.teal },
  filterText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  filterTextActive: { color: COLORS.navy },

  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    ...CARD_SHADOW,
  },
  statValue: { color: COLORS.primary, fontSize: 22, fontWeight: '800' },
  statLabel: { color: COLORS.slate600, fontSize: 11, fontWeight: '600', marginTop: 2 },

  listContent: { paddingBottom: 36 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: COLORS.line,
    padding: 18,
    marginHorizontal: 16,
    marginTop: 12,
    ...CARD_SHADOW,
  },
  cardHighlight: { borderColor: COLORS.primary },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardMeta: { color: COLORS.slate500, fontSize: 13, fontWeight: '600' },
  timeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 12 },
  departBig: { color: COLORS.navy, fontSize: 32, fontWeight: '800', lineHeight: 34 },
  durationText: { color: COLORS.slate500, fontSize: 13, paddingBottom: 4 },
  route: { color: COLORS.navy, fontSize: 19, fontWeight: '700', marginTop: 8 },
  infoGrid: { flexDirection: 'row', gap: 10, marginTop: 14 },
  infoBox: {
    flex: 1,
    backgroundColor: COLORS.canvas,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  infoLabel: { color: COLORS.slate500, fontSize: 11 },
  infoVal: { color: COLORS.navy, fontSize: 14, fontWeight: '700', marginTop: 2 },
  ctaRow: {
    marginTop: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },

  loadingText: { color: COLORS.slate500, textAlign: 'center', marginTop: 12 },
  errorBox: { padding: 24, alignItems: 'center' },
  errorText: { color: COLORS.danger, textAlign: 'center', fontSize: 14 },
  retryBtn: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryText: { color: '#fff', fontWeight: '700' },
  emptyBox: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 32 },
  emptyTitle: { color: COLORS.navy, fontSize: 17, fontWeight: '700' },
  emptyText: { color: COLORS.slate500, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
