/**
 * SP2-P1-03: Passenger Home — Exact Figma PA-04 Layout:
 * Navy-Indigo Gradient Hero, Clean Compact Overlapping Search Card with Bottom Sheet Pickers,
 * LinearGradient Popular Route Cards + Watermark, and Real PostgreSQL Recent Bookings.
 */

import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  type BookingRecord,
  getMyBookings,
  getMyProfile,
  searchTrips,
  type TripSearchResult,
  type UserProfile,
} from '../../src/api/client';
import {
  CalendarGlyph,
  CheckGlyph,
  ChevronDownGlyph,
  PassengerTabBar,
  PinGlyph,
  RouteGlyph,
  SearchGlyph,
  StatusBadge,
  SwapGlyph,
  TicketGlyph,
} from '../../src/components/UI';
import { useAuth } from '../../src/session/AuthContext';
import {
  decodeAccessTokenClaims,
  deriveDisplayNameAndInitials,
} from '../../src/session/jwt';
import { COLORS, CARD_SHADOW, FLOAT_SHADOW, PRIMARY_SHADOW } from '../../src/theme/tokens';
import {
  formatDateLong,
  formatDateShort,
  formatDeparture,
  formatDuration,
  formatVND,
} from '../../src/trips/tripFormatters';

const CARD_GRADIENTS: readonly [string, string][] = [
  ['#5438f5', '#2563eb'],
  ['#14b8a6', '#0f766e'],
  ['#0f172a', '#334155'],
  ['#3b82f6', '#4338ca'],
];

function localIsoDate(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function PassengerHomeScreen() {
  const router = useRouter();
  const { session } = useAuth();

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [pax, setPax] = useState(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [cityPickerMode, setCityPickerMode] = useState<'origin' | 'destination' | null>(null);
  const [cityFilterText, setCityFilterText] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dbTrips, setDbTrips] = useState<TripSearchResult[]>([]);
  const [myBookings, setMyBookings] = useState<BookingRecord[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadHomeData = useCallback(
    async (isRefresh = false) => {
      if (!session?.accessToken) return;
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoadingTrips(true);
      }
      try {
        const [profileRes, tripsRes, bookingsRes] = await Promise.allSettled([
          getMyProfile(session.accessToken),
          searchTrips(session.accessToken, {}),
          getMyBookings(session.accessToken),
        ]);
        if (profileRes.status === 'fulfilled') {
          setProfile(profileRes.value);
        }
        if (tripsRes.status === 'fulfilled') {
          setDbTrips(tripsRes.value);
        }
        if (bookingsRes.status === 'fulfilled') {
          setMyBookings(bookingsRes.value);
        }
      } finally {
        setLoadingTrips(false);
        setRefreshing(false);
      }
    },
    [session?.accessToken],
  );

  useFocusEffect(
    useCallback(() => {
      void loadHomeData(false);
    }, [loadHomeData]),
  );

  const claims = useMemo(
    () => decodeAccessTokenClaims(session?.accessToken),
    [session?.accessToken],
  );
  const profileMeta = useMemo(
    () =>
      deriveDisplayNameAndInitials(
        profile?.fullName ?? myBookings[0]?.passengerName,
        profile?.email ?? claims.email,
      ),
    [profile?.fullName, profile?.email, myBookings, claims.email],
  );

  const shortGreetingName = useMemo(() => {
    const parts = profileMeta.displayName.trim().split(/\s+/);
    if (parts.length >= 2) return parts.slice(-2).join(' ');
    return profileMeta.displayName;
  }, [profileMeta.displayName]);

  const upcomingCount = useMemo(
    () =>
      myBookings.filter(
        b => b.status === 'PENDING' || b.status === 'CONFIRMED' || b.status === 'PICKED_UP',
      ).length,
    [myBookings],
  );

  const recentBookings = useMemo(() => myBookings.slice(0, 3), [myBookings]);

  const dbOrigins = useMemo(
    () => Array.from(new Set(dbTrips.map(t => t.origin))).filter(Boolean),
    [dbTrips],
  );
  const dbDestinations = useMemo(
    () => Array.from(new Set(dbTrips.map(t => t.destination))).filter(Boolean),
    [dbTrips],
  );

  const quickDayOptions = useMemo(() => {
    const items: { label: string; sub: string; value: string }[] = [
      { label: 'Tất cả ngày', sub: 'Hiển thị mọi chuyến đang mở bán', value: '' },
    ];
    for (let i = 0; i <= 6; i += 1) {
      const iso = localIsoDate(i);
      const label = i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : formatDateShort(iso);
      items.push({ label, sub: formatDateLong(iso), value: iso });
    }
    return items;
  }, []);

  const matchingTrips = useMemo(() => {
    const o = origin.trim().toLowerCase();
    const d = destination.trim().toLowerCase();
    return dbTrips.filter(t => {
      if (o && !t.origin.toLowerCase().includes(o)) return false;
      if (d && !t.destination.toLowerCase().includes(d)) return false;
      return true;
    });
  }, [dbTrips, origin, destination]);

  const maxAvailableSeats = useMemo(() => {
    const source = matchingTrips.length > 0 ? matchingTrips : dbTrips;
    if (source.length === 0) return 16;
    return Math.max(1, ...source.map(t => t.availableSeats));
  }, [matchingTrips, dbTrips]);

  useEffect(() => {
    if (pax > maxAvailableSeats) {
      setPax(maxAvailableSeats);
    }
  }, [maxAvailableSeats, pax]);

  const openRoutesFromDb = useMemo(() => {
    const map = new Map<
      string,
      {
        from: string;
        to: string;
        minPrice: number;
        estimatedMinutes: number;
        tripCount: number;
        maxSeats: number;
      }
    >();
    for (const t of dbTrips) {
      const key = `${t.origin}__${t.destination}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          from: t.origin,
          to: t.destination,
          minPrice: t.estimatedFare,
          estimatedMinutes: t.estimatedMinutes,
          tripCount: 1,
          maxSeats: t.availableSeats,
        });
      } else {
        existing.minPrice = Math.min(existing.minPrice, t.estimatedFare);
        existing.tripCount += 1;
        existing.maxSeats = Math.max(existing.maxSeats, t.availableSeats);
      }
    }
    return Array.from(map.values());
  }, [dbTrips]);

  function swapLocations() {
    setOrigin(destination);
    setDestination(origin);
    setValidationError(null);
  }

  function handleSearch() {
    setValidationError(null);
    const o = origin.trim();
    const d = destination.trim();
    if (o && d && o.toLowerCase() === d.toLowerCase()) {
      setValidationError('Điểm đi và điểm đến phải khác nhau.');
      return;
    }
    if (date.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      setValidationError('Ngày đi phải theo định dạng YYYY-MM-DD.');
      return;
    }
    router.push({
      pathname: '/(passenger)/results',
      params: {
        origin: o,
        destination: d,
        date: date.trim(),
        minSeats: String(pax),
      },
    });
  }

  const formattedDateHeadline = date
    ? date === localIsoDate(0)
      ? `Hôm nay, ${formatDateShort(date)}`
      : formatDateShort(date)
    : 'Tất cả ngày';

  const activeCityPool = cityPickerMode === 'origin' ? dbOrigins : dbDestinations;
  const filteredCities = activeCityPool.filter(c =>
    c.toLowerCase().includes(cityFilterText.trim().toLowerCase()),
  );

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadHomeData(true)}
            tintColor="#ffffff"
          />
        }
      >
        {/* Figma PA-04 Navy-Indigo Gradient Hero */}
        <LinearGradient
          colors={['#0b1120', '#181446', '#0f172a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.9 }}
          style={styles.hero}
        >
          <StatusBar style="light" />
          <View style={styles.heroGlowPurple} />
          <View style={styles.heroTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profileMeta.initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroSub}>Xin chào,</Text>
              <Text style={styles.heroName} numberOfLines={1}>
                {shortGreetingName}
              </Text>
            </View>
            <Pressable
              style={styles.bookingsCircleBtn}
              onPress={() => router.push('/(passenger)/bookings')}
              accessibilityRole="button"
              accessibilityLabel="Xem vé sắp đi"
            >
              <TicketGlyph size={20} color="#ffffff" />
              {upcomingCount > 0 ? <View style={styles.notifDot} /> : null}
            </Pressable>
          </View>
          <Text style={styles.heroQuestion}>Bạn muốn đi đâu hôm nay?</Text>
        </LinearGradient>

        {/* Figma PA-04 Compact Overlapping Search Card */}
        <View style={styles.searchCard}>
          <View style={styles.routeBlock}>
            <Pressable
              style={styles.pickRow}
              onPress={() => {
                setCityFilterText('');
                setCityPickerMode('origin');
              }}
            >
              <View style={[styles.pinBadge, { backgroundColor: '#dcfce7' }]}>
                <PinGlyph size={17} color={COLORS.tealDark} />
              </View>
              <View style={{ flex: 1, paddingRight: 42 }}>
                <Text style={styles.pickLabel}>Điểm đi</Text>
                <Text
                  style={[styles.pickValue, !origin && styles.pickValuePlaceholder]}
                  numberOfLines={1}
                >
                  {origin || 'Tất cả điểm đi'}
                </Text>
              </View>
              <ChevronDownGlyph size={17} color={COLORS.slate400} />
            </Pressable>

            <View style={styles.connectorLine} />

            <Pressable
              style={styles.pickRow}
              onPress={() => {
                setCityFilterText('');
                setCityPickerMode('destination');
              }}
            >
              <View style={[styles.pinBadge, { backgroundColor: '#fee2e2' }]}>
                <PinGlyph size={17} color={COLORS.danger} />
              </View>
              <View style={{ flex: 1, paddingRight: 42 }}>
                <Text style={styles.pickLabel}>Điểm đến</Text>
                <Text
                  style={[styles.pickValue, !destination && styles.pickValuePlaceholder]}
                  numberOfLines={1}
                >
                  {destination || 'Tất cả điểm đến'}
                </Text>
              </View>
              <ChevronDownGlyph size={17} color={COLORS.slate400} />
            </Pressable>

            <Pressable
              onPress={swapLocations}
              style={styles.swapBtn}
              accessibilityRole="button"
              accessibilityLabel="Đổi chiều"
            >
              <SwapGlyph size={16} color={COLORS.primary} />
            </Pressable>
          </View>

          <View style={styles.divider} />

          {/* Date & Passenger stepper row matching Figma PA-04 */}
          <View style={styles.metaRow}>
            <Pressable style={styles.dateSummaryBtn} onPress={() => setDatePickerOpen(true)}>
              <View style={styles.calendarBadge}>
                <CalendarGlyph size={17} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pickLabel}>Ngày đi</Text>
                <Text style={styles.dateDisplayText} numberOfLines={1}>
                  {formattedDateHeadline}
                </Text>
              </View>
            </Pressable>

            <View style={styles.stepper}>
              <Pressable
                onPress={() => setPax(p => Math.max(1, p - 1))}
                disabled={pax <= 1}
                style={[styles.stepBtn, styles.stepBtnMinus, pax <= 1 && { opacity: 0.35 }]}
                accessibilityRole="button"
                accessibilityLabel="Giảm số khách"
              >
                <Text style={styles.stepMinusText}>−</Text>
              </Pressable>
              <View style={styles.stepCenter}>
                <Text style={styles.stepCount}>{pax}</Text>
                <Text style={styles.stepSub}>khách</Text>
              </View>
              <Pressable
                onPress={() => setPax(p => Math.min(maxAvailableSeats, p + 1))}
                disabled={pax >= maxAvailableSeats}
                style={[
                  styles.stepBtn,
                  styles.stepBtnPlus,
                  pax >= maxAvailableSeats && { opacity: 0.4 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Tăng số khách"
              >
                <Text style={styles.stepPlusText}>+</Text>
              </Pressable>
            </View>
          </View>

          {validationError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{validationError}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleSearch}
            style={styles.searchBtnWrap}
            accessibilityRole="button"
            accessibilityLabel="Tìm chuyến"
          >
            <LinearGradient
              colors={['#5438f5', '#4328d6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.searchBtn}
            >
              <SearchGlyph size={18} color="#ffffff" />
              <Text style={styles.searchBtnText}>Tìm chuyến</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Figma PA-04 Tuyến phổ biến (Gradient cards + Route watermark) */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Tuyến phổ biến</Text>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/(passenger)/results',
                  params: { origin: '', destination: '', date: date.trim(), minSeats: String(pax) },
                })
              }
            >
              <Text style={styles.sectionLink}>Xem tất cả</Text>
            </Pressable>
          </View>

          {loadingTrips ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <ActivityIndicator color={COLORS.primary} />
            </View>
          ) : openRoutesFromDb.length === 0 ? (
            <View style={styles.emptyRouteBox}>
              <Text style={styles.emptyRouteText}>
                Hiện chưa có chuyến sắp khởi hành nào đang mở bán.
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.popularRow}
            >
              {openRoutesFromDb.map((r, idx) => (
                <Pressable
                  key={`${r.from}-${r.to}`}
                  onPress={() => {
                    setOrigin(r.from);
                    setDestination(r.to);
                    setValidationError(null);
                    router.push({
                      pathname: '/(passenger)/results',
                      params: {
                        origin: r.from,
                        destination: r.to,
                        date: date.trim(),
                        minSeats: String(Math.min(pax, r.maxSeats)),
                      },
                    });
                  }}
                >
                  <LinearGradient
                    colors={CARD_GRADIENTS[idx % CARD_GRADIENTS.length]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.popularCard}
                  >
                    <View style={styles.watermarkWrap}>
                      <RouteGlyph size={68} color="rgba(255,255,255,0.16)" />
                    </View>
                    <Text style={styles.popularTime}>{formatDuration(r.estimatedMinutes)}</Text>
                    <Text style={styles.popularFrom} numberOfLines={1}>
                      {r.from}
                    </Text>
                    <Text style={styles.popularToLabel}>đến</Text>
                    <Text style={styles.popularFrom} numberOfLines={1}>
                      {r.to}
                    </Text>
                    <Text style={styles.popularPrice}>Từ {formatVND(r.minPrice)}</Text>
                  </LinearGradient>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Figma PA-04 Đặt chỗ gần đây */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Đặt chỗ gần đây</Text>
            <Pressable onPress={() => router.push('/(passenger)/bookings')}>
              <Text style={styles.sectionLink}>Xem tất cả</Text>
            </Pressable>
          </View>

          {recentBookings.length === 0 ? (
            <View style={styles.emptyRouteBox}>
              <Text style={styles.emptyRouteText}>
                Bạn chưa có đơn đặt chỗ nào. Chọn tuyến ở trên để bắt đầu!
              </Text>
            </View>
          ) : (
            <View style={styles.recentList}>
              {recentBookings.map(item => (
                <Pressable
                  key={item.id}
                  style={styles.recentCard}
                  onPress={() => router.push('/(passenger)/bookings')}
                  accessibilityRole="button"
                >
                  <View style={styles.recentIconBox}>
                    <TicketGlyph size={20} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recentRoute} numberOfLines={1}>
                      {item.origin} → {item.destination}
                    </Text>
                    <Text style={styles.recentMeta} numberOfLines={1}>
                      {formatDeparture(item.departureTime)} · {item.companyName}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={styles.recentPrice}>{formatVND(item.fareEstimate)}</Text>
                    <StatusBadge status={item.status} />
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <PassengerTabBar active="home" />

      {/* Bottom Sheet Modal: Origin / Destination Picker */}
      <Modal
        visible={cityPickerMode !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setCityPickerMode(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetBackdrop}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCityPickerMode(null)} />
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {cityPickerMode === 'origin' ? 'Chọn điểm đi' : 'Chọn điểm đến'}
            </Text>
            <TextInput
              style={styles.sheetSearchInput}
              placeholder="Gõ tên thành phố / khu vực..."
              placeholderTextColor={COLORS.slate400}
              value={cityFilterText}
              onChangeText={setCityFilterText}
              returnKeyType="done"
            />
            <ScrollView style={styles.sheetList} keyboardShouldPersistTaps="handled">
              <Pressable
                style={styles.sheetItem}
                onPress={() => {
                  if (cityPickerMode === 'origin') setOrigin('');
                  else setDestination('');
                  setCityPickerMode(null);
                }}
              >
                <Text style={styles.sheetItemText}>Tất cả khu vực</Text>
                {(cityPickerMode === 'origin' ? origin : destination) === '' ? (
                  <CheckGlyph size={18} color={COLORS.primary} />
                ) : null}
              </Pressable>

              {cityFilterText.trim() &&
              !activeCityPool.some(
                c => c.toLowerCase() === cityFilterText.trim().toLowerCase(),
              ) ? (
                <Pressable
                  style={styles.sheetItem}
                  onPress={() => {
                    const val = cityFilterText.trim();
                    if (cityPickerMode === 'origin') setOrigin(val);
                    else setDestination(val);
                    setCityPickerMode(null);
                  }}
                >
                  <Text style={[styles.sheetItemText, { color: COLORS.primary }]}>
                    Tìm theo "{cityFilterText.trim()}"
                  </Text>
                </Pressable>
              ) : null}

              {filteredCities.map(city => {
                const selected =
                  (cityPickerMode === 'origin' ? origin : destination).toLowerCase() ===
                  city.toLowerCase();
                return (
                  <Pressable
                    key={city}
                    style={styles.sheetItem}
                    onPress={() => {
                      if (cityPickerMode === 'origin') setOrigin(city);
                      else setDestination(city);
                      setValidationError(null);
                      setCityPickerMode(null);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <PinGlyph
                        size={17}
                        color={cityPickerMode === 'origin' ? COLORS.tealDark : COLORS.danger}
                      />
                      <Text style={styles.sheetItemText}>{city}</Text>
                    </View>
                    {selected ? <CheckGlyph size={18} color={COLORS.primary} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Bottom Sheet Modal: Date Picker */}
      <Modal
        visible={datePickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDatePickerOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetBackdrop}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDatePickerOpen(false)} />
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Chọn ngày khởi hành</Text>
            <ScrollView style={styles.sheetList} keyboardShouldPersistTaps="handled">
              {quickDayOptions.map(opt => {
                const active = date === opt.value;
                return (
                  <Pressable
                    key={opt.label}
                    style={styles.sheetItem}
                    onPress={() => {
                      setDate(opt.value);
                      setDatePickerOpen(false);
                    }}
                  >
                    <View>
                      <Text style={[styles.sheetItemText, active && { color: COLORS.primary }]}>
                        {opt.label}
                      </Text>
                      <Text style={styles.sheetItemSub}>{opt.sub}</Text>
                    </View>
                    {active ? <CheckGlyph size={18} color={COLORS.primary} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Text style={styles.customDateLabel}>Hoặc nhập ngày cụ thể (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.sheetSearchInput}
              placeholder="Ví dụ: 2026-11-25"
              placeholderTextColor={COLORS.slate400}
              value={date}
              onChangeText={setDate}
              maxLength={10}
              returnKeyType="done"
              onSubmitEditing={() => setDatePickerOpen(false)}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.canvas },
  root: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  hero: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 78,
    overflow: 'hidden',
  },
  heroGlowPurple: {
    position: 'absolute',
    top: -65,
    right: -65,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(84, 56, 245, 0.36)',
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.32)',
  },
  avatarText: { color: COLORS.navy, fontSize: 16, fontWeight: '800' },
  heroSub: { color: COLORS.slate300, fontSize: 13 },
  heroName: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  bookingsCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.danger,
    borderWidth: 2,
    borderColor: COLORS.navy,
  },
  heroQuestion: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 22,
    letterSpacing: -0.3,
  },

  searchCard: {
    marginTop: -56,
    marginHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#eaedf3',
    padding: 16,
    ...FLOAT_SHADOW,
  },
  routeBlock: { position: 'relative' },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 54,
    paddingHorizontal: 2,
  },
  pinBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickLabel: { fontSize: 11, fontWeight: '600', color: COLORS.slate500 },
  pickValue: { fontSize: 16, fontWeight: '700', color: COLORS.navy, marginTop: 1 },
  pickValuePlaceholder: { color: COLORS.slate500, fontWeight: '600' },
  connectorLine: {
    marginLeft: 19,
    height: 6,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.slate300,
    borderStyle: 'dotted',
  },
  swapBtn: {
    position: 'absolute',
    right: 32,
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    ...CARD_SHADOW,
  },

  divider: { height: 1, backgroundColor: '#edf1f7', marginVertical: 12 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateSummaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calendarBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDisplayText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.navy,
    marginTop: 1,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 999,
    padding: 4,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnMinus: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stepBtnPlus: { backgroundColor: COLORS.primary },
  stepMinusText: { fontSize: 18, fontWeight: '600', color: COLORS.navy, lineHeight: 20 },
  stepPlusText: { fontSize: 18, fontWeight: '700', color: '#ffffff', lineHeight: 20 },
  stepCenter: { alignItems: 'center', minWidth: 32 },
  stepCount: { fontSize: 15, fontWeight: '800', color: COLORS.navy, lineHeight: 16 },
  stepSub: { fontSize: 10, color: COLORS.slate500 },

  errorBox: {
    marginTop: 12,
    backgroundColor: COLORS.dangerSoft,
    borderRadius: 10,
    padding: 10,
  },
  errorText: { color: COLORS.danger, fontSize: 12, fontWeight: '600' },

  searchBtnWrap: { marginTop: 14, ...PRIMARY_SHADOW },
  searchBtn: {
    borderRadius: 14,
    height: 50,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },

  section: { marginTop: 22 },
  sectionHead: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.navy },
  sectionLink: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  popularRow: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  popularCard: {
    width: 168,
    borderRadius: 20,
    padding: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  watermarkWrap: {
    position: 'absolute',
    right: -10,
    bottom: -10,
  },
  popularTime: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' },
  popularFrom: { color: '#ffffff', fontSize: 16, fontWeight: '800', marginTop: 8 },
  popularToLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginVertical: 1 },
  popularPrice: { color: '#ffffff', fontSize: 14, fontWeight: '800', marginTop: 12 },

  emptyRouteBox: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#eaedf3',
    padding: 16,
  },
  emptyRouteText: { fontSize: 13, color: COLORS.slate500, lineHeight: 19 },

  recentList: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  recentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#eaedf3',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...CARD_SHADOW,
  },
  recentIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentRoute: { fontSize: 14, fontWeight: '700', color: COLORS.navy },
  recentMeta: { fontSize: 12, color: COLORS.slate500, marginTop: 2 },
  recentPrice: { fontSize: 14, fontWeight: '800', color: COLORS.navy },

  /* Picker Bottom Sheets */
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 30,
    maxHeight: '78%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.slate300,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: COLORS.navy, marginBottom: 12 },
  sheetSearchInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: COLORS.canvas,
    paddingHorizontal: 14,
    fontSize: 14,
    color: COLORS.navy,
    marginBottom: 10,
  },
  sheetList: { maxHeight: 320 },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sheetItemText: { fontSize: 15, fontWeight: '600', color: COLORS.navy },
  sheetItemSub: { fontSize: 12, color: COLORS.slate500, marginTop: 2 },
  customDateLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.slate500,
    marginTop: 10,
    marginBottom: 6,
  },
});
