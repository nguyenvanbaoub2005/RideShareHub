/**
 * SP1-P2-05: Driver Home Screen — Figma DR-02 / DR-03 Navy Hero + Next Trip Card + Dark TabBar.
 * Route: /(driver)/
 */

import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getDriverTrips, type DriverTripSummary } from '../../src/api/client';
import { useAuth } from '../../src/session/AuthContext';
import {
  BusGlyph,
  CheckGlyph,
  DriverTabBar,
  StatusBadge,
} from '../../src/components/UI';
import { CARD_SHADOW, COLORS, FLOAT_SHADOW, PRIMARY_SHADOW } from '../../src/theme/tokens';

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

function isSameLocalDay(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatUntil(iso: string): string {
  const mins = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
  if (mins <= 0) return 'Sắp xuất phát';
  if (mins < 60) return `Còn ${mins} phút`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `Còn ${hrs} giờ ${rem} phút` : `Còn ${hrs} giờ`;
}

function greetingByHour(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Chào buổi sáng,';
  if (h < 18) return 'Chào buổi chiều,';
  return 'Chào buổi tối,';
}

export default function DriverHomeScreen() {
  const router = useRouter();
  const { session, signOut, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'home' | 'trips'>('home');
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

  const upcomingTrips = useMemo(
    () =>
      trips.filter(
        t => t.status === 'PUBLISHED' || t.status === 'FULL' || t.status === 'IN_PROGRESS',
      ),
    [trips],
  );

  const nextTrip = useMemo(() => {
    if (upcomingTrips.length === 0) return null;
    const future = upcomingTrips.filter(t => new Date(t.departureTime).getTime() >= Date.now() - 3_600_000);
    return (future[0] ?? upcomingTrips[0]) ?? null;
  }, [upcomingTrips]);

  const todayTrips = useMemo(() => trips.filter(t => isSameLocalDay(t.departureTime)), [trips]);
  const todayPaxCount = useMemo(
    () => todayTrips.reduce((sum, t) => sum + (t.bookedSeats ?? 0), 0),
    [todayTrips],
  );
  const primaryVehicle = nextTrip ?? trips[0] ?? null;

  const filtered = trips.filter(t => {
    if (filter === 'ALL') return true;
    if (filter === 'UPCOMING') return t.status === 'PUBLISHED' || t.status === 'FULL';
    if (filter === 'ONGOING') return t.status === 'IN_PROGRESS';
    return t.status === 'COMPLETED' || t.status === 'CANCELLED';
  });

  function openTrip(item: DriverTripSummary) {
    router.push({
      pathname: '/(driver)/trip/[tripId]',
      params: { tripId: String(item.id), data: JSON.stringify(item) },
    } as never);
  }

  function renderCompactRow(item: DriverTripSummary) {
    const booked = item.bookedSeats ?? 0;
    return (
      <Pressable
        key={item.id}
        style={styles.compactRow}
        onPress={() => openTrip(item)}
        accessibilityRole="button"
      >
        <View style={styles.compactTimeCol}>
          <Text style={styles.compactTime}>{formatTime(item.departureTime)}</Text>
          <Text style={styles.compactDay}>{formatDay(item.departureTime)}</Text>
        </View>
        <View style={styles.compactDivider} />
        <View style={{ flex: 1 }}>
          <Text style={styles.compactRoute} numberOfLines={1}>
            {item.origin} → {item.destination}
          </Text>
          <Text style={styles.compactMeta}>
            {booked}/{item.seatCapacity} khách · {item.vehiclePlate}
          </Text>
        </View>
        <StatusBadge status={item.status} />
      </Pressable>
    );
  }

  function renderTripCard({ item }: { item: DriverTripSummary }) {
    const isHighlight = item.status === 'IN_PROGRESS' || item.status === 'PUBLISHED' || item.status === 'FULL';
    const booked = item.bookedSeats ?? 0;
    return (
      <Pressable
        style={[styles.card, isHighlight && styles.cardHighlight]}
        onPress={() => openTrip(item)}
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

  function renderHomeView() {
    return (
      <ScrollView style={styles.flex} contentContainerStyle={styles.homeScroll}>
        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={styles.heroRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>TX</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{greetingByHour()}</Text>
              <Text style={styles.heroTitle}>Tài xế RideShare</Text>
              <Text style={styles.heroSubMeta}>
                ★ Sẵn sàng · {trips.length} chuyến được giao
              </Text>
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

          {primaryVehicle ? (
            <View style={styles.vehicleChip}>
              <BusGlyph size={18} color={COLORS.teal} />
              <Text style={styles.vehicleChipText} numberOfLines={1}>
                <Text style={{ fontWeight: '800', color: '#ffffff' }}>
                  {primaryVehicle.vehiclePlate}
                </Text>
                {primaryVehicle.vehicleType ? ` · ${primaryVehicle.vehicleType}` : ''}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.homeBody}>
          {/* Floating availability summary card matching Figma DR-02 */}
          <View style={styles.statusCard}>
            <View style={styles.statusIconCircle}>
              <CheckGlyph size={18} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusTitle}>Đang nhận lịch phân công</Text>
              <Text style={styles.statusSub}>
                Chuyến mới từ nhà xe sẽ tự động hiển thị tại đây
              </Text>
            </View>
          </View>

          {/* Featured Next Trip Indigo Hero Card */}
          {nextTrip ? (
            <Pressable
              style={styles.nextCard}
              onPress={() => openTrip(nextTrip)}
              accessibilityRole="button"
            >
              <View style={styles.nextTopRow}>
                <Text style={styles.nextEyebrow}>CHUYẾN TIẾP THEO</Text>
                <View style={styles.nextPill}>
                  <Text style={styles.nextPillText}>{formatUntil(nextTrip.departureTime)}</Text>
                </View>
              </View>
              <Text style={styles.nextTime}>{formatTime(nextTrip.departureTime)}</Text>
              <Text style={styles.nextRoute}>
                {nextTrip.origin} → {nextTrip.destination}
              </Text>
              <View style={styles.nextMetaRow}>
                <Text style={styles.nextMetaText}>
                  {nextTrip.bookedSeats ?? 0}/{nextTrip.seatCapacity} khách
                </Text>
                <Text style={styles.nextMetaText}>Chuyến #{nextTrip.id}</Text>
                <Text style={styles.nextMetaText}>{nextTrip.vehiclePlate}</Text>
              </View>
            </Pressable>
          ) : null}

          {/* 3-Column Metrics */}
          <View style={styles.statsGrid}>
            {[
              [String(todayTrips.length), 'Chuyến hôm nay'],
              [String(todayPaxCount), 'Hành khách'],
              [String(upcomingTrips.length), 'Chuyến sắp tới'],
            ].map(([val, lbl]) => (
              <View key={lbl} style={styles.statCard}>
                <Text style={styles.statValue}>{val}</Text>
                <Text style={styles.statLabel}>{lbl}</Text>
              </View>
            ))}
          </View>

          {/* Today / Upcoming preview */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>
                Chuyến hôm nay ({todayTrips.length})
              </Text>
              <Pressable onPress={() => setActiveTab('trips')}>
                <Text style={styles.sectionLink}>Xem tất cả →</Text>
              </Pressable>
            </View>
            {todayTrips.length === 0 ? (
              <View style={styles.emptyPreview}>
                <Text style={styles.emptyPreviewText}>
                  Chưa có chuyến trong hôm nay. Chạm “Chuyến được giao” để xem toàn bộ lịch.
                </Text>
              </View>
            ) : (
              todayTrips.slice(0, 3).map(renderCompactRow)
            )}
          </View>
        </View>
      </ScrollView>
    );
  }

  function renderTripsView() {
    return (
      <FlatList
        data={filtered}
        keyExtractor={t => String(t.id)}
        ListHeaderComponent={
          <View style={styles.tripsHero}>
            <View style={styles.heroRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.greeting}>Danh sách phân công</Text>
                <Text style={styles.heroTitle}>Chuyến được giao</Text>
              </View>
              <Pressable
                onPress={loadTrips}
                style={styles.logoutBtn}
                accessibilityRole="button"
              >
                <Text style={styles.logoutText}>Làm mới</Text>
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
                    <Text style={[styles.filterText, active && styles.filterTextActive]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Không có chuyến nào</Text>
            <Text style={styles.emptyText}>
              Chuyến được nhà xe phân công cho bạn sẽ hiển thị tại đây.
            </Text>
          </View>
        }
        renderItem={renderTripCard}
        contentContainerStyle={styles.listContent}
      />
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style={loading || errorMsg ? 'dark' : 'light'} />
      <View style={styles.flex}>
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={COLORS.primary} size="large" />
            <Text style={styles.loadingText}>Đang tải lịch chạy…</Text>
          </View>
        ) : errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
            <Pressable style={styles.retryBtn} onPress={loadTrips}>
              <Text style={styles.retryText}>Thử lại</Text>
            </Pressable>
            <Pressable
              style={styles.errorLogoutBtn}
              onPress={signOut}
              disabled={authLoading}
            >
              <Text style={styles.errorLogoutText}>Đăng xuất / Đổi tài khoản</Text>
            </Pressable>
          </View>
        ) : activeTab === 'home' ? (
          renderHomeView()
        ) : (
          renderTripsView()
        )}
      </View>

      <DriverTabBar active={activeTab} onChange={setActiveTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.canvas },
  flex: { flex: 1 },
  homeScroll: { paddingBottom: 24 },
  hero: {
    backgroundColor: COLORS.navy,
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 18,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(84, 56, 245, 0.32)',
  },
  tripsHero: {
    backgroundColor: COLORS.navy,
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 18,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.navy, fontSize: 17, fontWeight: '800' },
  greeting: { color: COLORS.slate300, fontSize: 13 },
  heroTitle: { color: '#ffffff', fontSize: 22, fontWeight: '800', marginTop: 1 },
  heroSubMeta: { color: COLORS.slate300, fontSize: 12, marginTop: 3 },
  logoutBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoutText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },

  vehicleChip: {
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  vehicleChipText: { color: COLORS.slate300, fontSize: 13, flex: 1 },

  homeBody: { paddingHorizontal: 16, marginTop: -30, gap: 14 },

  statusCard: {
    backgroundColor: COLORS.successSoft,
    borderWidth: 1.5,
    borderColor: COLORS.success,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    ...FLOAT_SHADOW,
  },
  statusIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: { color: COLORS.navy, fontSize: 16, fontWeight: '800' },
  statusSub: { color: COLORS.slate600, fontSize: 12, marginTop: 2, lineHeight: 16 },

  nextCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    padding: 18,
    ...PRIMARY_SHADOW,
  },
  nextTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nextEyebrow: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  nextPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  nextPillText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  nextTime: { color: '#ffffff', fontSize: 34, fontWeight: '800', marginTop: 10, lineHeight: 38 },
  nextRoute: { color: '#ffffff', fontSize: 19, fontWeight: '700', marginTop: 6 },
  nextMetaRow: { flexDirection: 'row', gap: 14, marginTop: 10, flexWrap: 'wrap' },
  nextMetaText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' },

  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    ...CARD_SHADOW,
  },
  statValue: { color: COLORS.primary, fontSize: 22, fontWeight: '800' },
  statLabel: { color: COLORS.slate600, fontSize: 11, fontWeight: '600', marginTop: 3 },

  sectionBlock: { gap: 10, marginTop: 4 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.navy },
  sectionLink: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    borderRadius: 18,
    padding: 14,
    ...CARD_SHADOW,
  },
  compactTimeCol: { width: 56, alignItems: 'center' },
  compactTime: { fontSize: 19, fontWeight: '800', color: COLORS.navy },
  compactDay: { fontSize: 11, color: COLORS.slate500, marginTop: 2 },
  compactDivider: { width: 1, height: 34, backgroundColor: COLORS.line },
  compactRoute: { fontSize: 15, fontWeight: '700', color: COLORS.navy },
  compactMeta: { fontSize: 12, color: COLORS.slate600, marginTop: 3 },

  emptyPreview: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 16,
  },
  emptyPreviewText: { color: COLORS.slate500, fontSize: 13, lineHeight: 19 },

  filterRow: { flexDirection: 'row', gap: 8, marginTop: 16, flexWrap: 'wrap' },
  filterPill: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
  },
  filterPillActive: { backgroundColor: COLORS.teal },
  filterText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  filterTextActive: { color: COLORS.navy },

  listContent: { paddingBottom: 28 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    borderWidth: 1.5,
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

  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: COLORS.slate500, textAlign: 'center', marginTop: 12 },
  errorBox: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: COLORS.danger, textAlign: 'center', fontSize: 14 },
  retryBtn: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryText: { color: '#fff', fontWeight: '700' },
  errorLogoutBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  errorLogoutText: { color: COLORS.danger, fontWeight: '700', fontSize: 14 },
  emptyBox: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 32 },
  emptyTitle: { color: COLORS.navy, fontSize: 17, fontWeight: '700' },
  emptyText: { color: COLORS.slate500, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
