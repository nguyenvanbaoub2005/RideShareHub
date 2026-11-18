import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CARD_SHADOW, COLORS } from '../theme/tokens';

/** Geometric Brand Logo matching Figma PA-01 / PA-02 */
export function BrandLogo({
  size = 64,
  inverted = false,
}: {
  size?: number;
  inverted?: boolean;
}) {
  const dotSize = Math.round(size * 0.3);
  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <View
        style={{
          flex: 1,
          borderRadius: Math.round(size * 0.28),
          backgroundColor: inverted ? COLORS.surface : COLORS.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: inverted ? COLORS.primary : COLORS.surface,
            fontSize: Math.round(size * 0.38),
            fontWeight: '900',
            letterSpacing: -0.5,
          }}
        >
          R
        </Text>
      </View>
      <View
        style={{
          position: 'absolute',
          right: -3,
          bottom: -3,
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: COLORS.teal,
          borderWidth: 3,
          borderColor: inverted ? COLORS.navy : COLORS.surface,
        }}
      />
    </View>
  );
}

/** White surface AppBar matching Figma PA-05..PA-15 */
export function AppBar({
  title,
  sub,
  onBack,
  right,
}: {
  title: string;
  sub?: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <View style={uiStyles.appBar}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          style={uiStyles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <Text style={uiStyles.backGlyph}>←</Text>
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={uiStyles.appBarTitle} numberOfLines={1}>
          {title}
        </Text>
        {sub ? (
          <Text style={uiStyles.appBarSub} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

/** Figma Pill Badge with dot */
const BADGE_PALETTE: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  CONFIRMED: { label: 'Đã xác nhận', bg: '#eff6ff', text: '#1d4ed8', dot: COLORS.primary },
  PENDING: { label: 'Chờ xác nhận', bg: '#fffbeb', text: '#b45309', dot: COLORS.warning },
  PICKED_UP: { label: 'Đã lên xe', bg: '#f0fdfa', text: '#0f766e', dot: COLORS.teal },
  COMPLETED: { label: 'Hoàn thành', bg: '#f0fdfa', text: '#0f766e', dot: COLORS.teal },
  CANCELLED: { label: 'Đã hủy', bg: '#fef2f2', text: '#b91c1c', dot: COLORS.danger },
  NO_SHOW: { label: 'Vắng mặt', bg: '#f1f5f9', text: '#475569', dot: COLORS.slate400 },
  PUBLISHED: { label: 'Chờ khởi hành', bg: '#fffbeb', text: '#b45309', dot: COLORS.warning },
  FULL: { label: 'Đủ chỗ', bg: '#eff6ff', text: '#1d4ed8', dot: COLORS.primary },
  IN_PROGRESS: { label: 'Đang chạy', bg: '#f0fdf4', text: '#15803d', dot: COLORS.success },
  DRAFT: { label: 'Bản nháp', bg: '#f1f5f9', text: '#475569', dot: COLORS.slate400 },
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const meta = BADGE_PALETTE[status] ?? {
    label: status,
    bg: COLORS.slate100,
    text: COLORS.slate600,
    dot: COLORS.slate400,
  };
  return (
    <View style={[uiStyles.badge, { backgroundColor: meta.bg }]}>
      <View style={[uiStyles.badgeDot, { backgroundColor: meta.dot }]} />
      <Text style={[uiStyles.badgeText, { color: meta.text }]}>{label ?? meta.label}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[uiStyles.card, style]}>{children}</View>;
}

export function SectionHeading({ children }: { children: string }) {
  return <Text style={uiStyles.sectionH}>{children}</Text>;
}

export function KeyValueRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={uiStyles.kvRow}>
      <Text style={uiStyles.kvLabel}>{label}</Text>
      <Text style={[uiStyles.kvVal, strong && uiStyles.kvValStrong]}>{value}</Text>
    </View>
  );
}

/** Passenger Bottom Navigation Bar matching Figma PA-04 / PA-11 */
export function PassengerTabBar({
  active,
}: {
  active: 'home' | 'bookings' | 'account';
}) {
  const router = useRouter();
  const items: { id: 'home' | 'bookings' | 'account'; label: string; glyph: string; path: string }[] = [
    { id: 'home', label: 'Trang chủ', glyph: '⌂', path: '/(passenger)' },
    { id: 'bookings', label: 'Chuyến của tôi', glyph: '▤', path: '/(passenger)/bookings' },
    { id: 'account', label: 'Cá nhân', glyph: '◉', path: '/(passenger)/account' },
  ];

  return (
    <View style={uiStyles.tabBar}>
      {items.map(item => {
        const isActive = active === item.id;
        return (
          <Pressable
            key={item.id}
            style={uiStyles.tabItem}
            onPress={() => {
              if (!isActive) router.replace(item.path as never);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            {isActive ? <View style={uiStyles.tabIndicator} /> : null}
            <Text style={[uiStyles.tabGlyph, isActive && uiStyles.tabTextActive]}>
              {item.glyph}
            </Text>
            <Text style={[uiStyles.tabLabel, isActive && uiStyles.tabTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const uiStyles = StyleSheet.create({
  appBar: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.slate100,
  },
  backGlyph: { fontSize: 18, fontWeight: '700', color: COLORS.navy },
  appBarTitle: { fontSize: 17, fontWeight: '700', color: COLORS.navy },
  appBarSub: { fontSize: 12, color: COLORS.slate500, marginTop: 2 },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 16,
    ...CARD_SHADOW,
  },
  sectionH: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: COLORS.slate500,
    marginBottom: 10,
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 6,
  },
  kvLabel: { fontSize: 13, color: COLORS.slate500 },
  kvVal: { fontSize: 13, color: COLORS.navy, fontWeight: '500', textAlign: 'right', flexShrink: 1 },
  kvValStrong: { fontWeight: '700', fontSize: 15 },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingBottom: 14,
    paddingTop: 6,
    height: 70,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: -6,
    width: 32,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  tabGlyph: { fontSize: 18, color: COLORS.slate500, lineHeight: 20 },
  tabLabel: { fontSize: 11, fontWeight: '600', color: COLORS.slate500, marginTop: 2 },
  tabTextActive: { color: COLORS.primary },
});
