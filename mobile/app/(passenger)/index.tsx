/**
 * SP2-P1-03: Passenger home — Figma PA-04 Navy Hero + Overlapping Search Card + Popular Routes + TabBar.
 */

import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { PassengerTabBar } from '../../src/components/UI';
import { COLORS, FLOAT_SHADOW } from '../../src/theme/tokens';
import { formatVND } from '../../src/trips/tripFormatters';

const POPULAR_ROUTES = [
  { from: 'Đà Nẵng', to: 'Huế', price: 120000, time: '3 giờ', bg: COLORS.primary },
  { from: 'Đà Nẵng', to: 'Hội An', price: 60000, time: '1 giờ', bg: COLORS.tealDark },
  { from: 'Hội An', to: 'Quảng Nam', price: 45000, time: '45 phút', bg: COLORS.navy },
  { from: 'Huế', to: 'Đà Nẵng', price: 120000, time: '3 giờ', bg: '#3b82f6' },
];

function localIsoDate(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function PassengerHomeScreen() {
  const router = useRouter();

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [pax, setPax] = useState(1);
  const [validationError, setValidationError] = useState<string | null>(null);

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
      setValidationError('Ngày đi phải theo định dạng YYYY-MM-DD (hoặc để trống để xem tất cả).');
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

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.flex}>
        <ScrollView
          style={styles.root}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Figma PA-04 Deep Navy Hero Header */}
          <View style={styles.hero}>
            <View style={styles.heroTop}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>HK</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroSub}>Xin chào,</Text>
                <Text style={styles.heroBrand}>RideShareHub</Text>
              </View>
              <Pressable
                style={styles.bookingsChip}
                onPress={() => router.push('/(passenger)/bookings')}
                accessibilityRole="button"
              >
                <Text style={styles.bookingsChipText}>Vé của tôi</Text>
              </Pressable>
            </View>
            <Text style={styles.heroQuestion}>Bạn muốn đi đâu hôm nay?</Text>
          </View>

          {/* Overlapping Search Card */}
          <View style={styles.searchCard}>
            <View style={styles.routeBlock}>
              <View style={styles.pickRow}>
                <View style={[styles.pinBadge, { backgroundColor: '#ccfbf1' }]}>
                  <View style={[styles.pinDot, { backgroundColor: COLORS.teal }]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickLabel}>Điểm đi</Text>
                  <TextInput
                    style={styles.pickInput}
                    placeholder="VD: Đà Nẵng (bỏ trống = tất cả)"
                    placeholderTextColor={COLORS.slate400}
                    value={origin}
                    onChangeText={setOrigin}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View style={styles.connectorLine} />

              <View style={styles.pickRow}>
                <View style={[styles.pinBadge, { backgroundColor: COLORS.dangerSoft }]}>
                  <View style={[styles.pinDot, { backgroundColor: COLORS.danger }]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickLabel}>Điểm đến</Text>
                  <TextInput
                    style={styles.pickInput}
                    placeholder="VD: Huế (bỏ trống = tất cả)"
                    placeholderTextColor={COLORS.slate400}
                    value={destination}
                    onChangeText={setDestination}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
              </View>

              <Pressable
                onPress={swapLocations}
                style={styles.swapBtn}
                accessibilityRole="button"
                accessibilityLabel="Đổi chiều"
              >
                <Text style={styles.swapGlyph}>⇅</Text>
              </Pressable>
            </View>

            <View style={styles.divider} />

            {/* Date & Passenger stepper row */}
            <View style={styles.metaRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pickLabel}>Ngày đi (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.dateInput}
                  placeholder="Tất cả ngày"
                  placeholderTextColor={COLORS.slate400}
                  value={date}
                  onChangeText={setDate}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                />
              </View>

              <View style={styles.stepper}>
                <Pressable
                  onPress={() => setPax(p => Math.max(1, p - 1))}
                  disabled={pax <= 1}
                  style={[styles.stepBtn, styles.stepBtnMinus, pax <= 1 && { opacity: 0.4 }]}
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
                  onPress={() => setPax(p => Math.min(6, p + 1))}
                  disabled={pax >= 6}
                  style={[styles.stepBtn, styles.stepBtnPlus, pax >= 6 && { opacity: 0.4 }]}
                  accessibilityRole="button"
                  accessibilityLabel="Tăng số khách"
                >
                  <Text style={styles.stepPlusText}>+</Text>
                </Pressable>
              </View>
            </View>

            {/* Quick Date Chips */}
            <View style={styles.quickDates}>
              {[
                ['Tất cả ngày', ''],
                ['Hôm nay', localIsoDate(0)],
                ['Ngày mai', localIsoDate(1)],
              ].map(([lbl, val]) => {
                const active = date === val;
                return (
                  <Pressable
                    key={lbl}
                    onPress={() => setDate(val)}
                    style={[styles.dateChip, active && styles.dateChipActive]}
                  >
                    <Text style={[styles.dateChipText, active && styles.dateChipTextActive]}>
                      {lbl}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {validationError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{validationError}</Text>
              </View>
            ) : null}

            <Pressable
              style={styles.searchBtn}
              onPress={handleSearch}
              accessibilityRole="button"
              accessibilityLabel="Tìm kiếm chuyến xe"
            >
              <Text style={styles.searchBtnText}>Tìm chuyến</Text>
            </Pressable>
          </View>

          {/* Popular Routes section matching Figma PA-04 */}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Tuyến phổ biến</Text>
              <Pressable onPress={handleSearch}>
                <Text style={styles.sectionLink}>Xem tất cả</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.popularRow}
            >
              {POPULAR_ROUTES.map(p => (
                <Pressable
                  key={`${p.from}-${p.to}`}
                  style={[styles.popularCard, { backgroundColor: p.bg }]}
                  onPress={() => {
                    setOrigin(p.from);
                    setDestination(p.to);
                    setValidationError(null);
                  }}
                >
                  <Text style={styles.popularTime}>{p.time}</Text>
                  <Text style={styles.popularFrom}>{p.from}</Text>
                  <Text style={styles.popularToLabel}>đến</Text>
                  <Text style={styles.popularFrom}>{p.to}</Text>
                  <Text style={styles.popularPrice}>Từ {formatVND(p.price)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </ScrollView>

        <PassengerTabBar active="home" />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.canvas },
  root: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  hero: {
    backgroundColor: COLORS.navy,
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 76,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.navy, fontSize: 15, fontWeight: '800' },
  heroSub: { color: COLORS.slate300, fontSize: 12 },
  heroBrand: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  bookingsChip: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bookingsChipText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  heroQuestion: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 22,
    letterSpacing: -0.3,
  },

  searchCard: {
    marginTop: -54,
    marginHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 16,
    ...FLOAT_SHADOW,
  },
  routeBlock: { position: 'relative' },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  pinBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDot: { width: 10, height: 10, borderRadius: 5 },
  pickLabel: { fontSize: 11, fontWeight: '600', color: COLORS.slate500 },
  pickInput: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.navy,
    paddingVertical: 4,
    paddingRight: 44,
  },
  connectorLine: {
    marginLeft: 16,
    height: 10,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.slate300,
    borderStyle: 'dotted',
  },
  swapBtn: {
    position: 'absolute',
    right: 4,
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapGlyph: { color: COLORS.primary, fontSize: 16, fontWeight: '800' },

  divider: { height: 1, backgroundColor: COLORS.line, marginVertical: 12 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateInput: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.navy,
    paddingVertical: 4,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.line,
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
    borderColor: COLORS.line,
  },
  stepBtnPlus: { backgroundColor: COLORS.primary },
  stepMinusText: { fontSize: 18, fontWeight: '600', color: COLORS.navy, lineHeight: 20 },
  stepPlusText: { fontSize: 18, fontWeight: '700', color: '#ffffff', lineHeight: 20 },
  stepCenter: { alignItems: 'center', minWidth: 32 },
  stepCount: { fontSize: 15, fontWeight: '800', color: COLORS.navy, lineHeight: 16 },
  stepSub: { fontSize: 10, color: COLORS.slate500 },

  quickDates: { flexDirection: 'row', gap: 8, marginTop: 12 },
  dateChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.canvas,
  },
  dateChipActive: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary,
  },
  dateChipText: { fontSize: 12, fontWeight: '600', color: COLORS.slate600 },
  dateChipTextActive: { color: COLORS.primary },

  errorBox: {
    marginTop: 12,
    backgroundColor: COLORS.dangerSoft,
    borderRadius: 10,
    padding: 10,
  },
  errorText: { color: COLORS.danger, fontSize: 12, fontWeight: '600' },

  searchBtn: {
    marginTop: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },

  section: { marginTop: 24 },
  sectionHead: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.navy },
  sectionLink: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  popularRow: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  popularCard: {
    width: 160,
    borderRadius: 20,
    padding: 16,
  },
  popularTime: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600' },
  popularFrom: { color: '#ffffff', fontSize: 16, fontWeight: '800', marginTop: 6 },
  popularToLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginVertical: 1 },
  popularPrice: { color: '#ffffff', fontSize: 13, fontWeight: '700', marginTop: 12 },
});
