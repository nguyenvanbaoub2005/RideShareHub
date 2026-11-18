import React, { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import {
  ArrowUpDown,
  Building2,
  BusFront,
  Calendar,
  Car,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  Home,
  Info,
  LogOut,
  MapPin,
  Pencil,
  Phone,
  Route,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Ticket,
  User,
  X,
} from './LucideIcons';
import { CARD_SHADOW, COLORS } from '../theme/tokens';

export function BusGlyph({ size = 24, color = '#ffffff' }: { size?: number; color?: string }) {
  return <BusFront size={size} color={color} strokeWidth={2} />;
}

export function HomeGlyph({ size = 21, color }: { size?: number; color: string }) {
  return <Home size={size} color={color} strokeWidth={2} />;
}

export function TicketGlyph({ size = 21, color }: { size?: number; color: string }) {
  return <Ticket size={size} color={color} strokeWidth={2} />;
}

export function UserGlyph({ size = 21, color }: { size?: number; color: string }) {
  return <User size={size} color={color} strokeWidth={2} />;
}

export function EyeGlyph({
  open,
  size = 19,
  color = COLORS.slate500,
}: {
  open: boolean;
  size?: number;
  color?: string;
}) {
  return open ? (
    <Eye size={size} color={color} strokeWidth={2} />
  ) : (
    <EyeOff size={size} color={color} strokeWidth={2} />
  );
}

export function CheckGlyph({ size = 18, color = '#ffffff' }: { size?: number; color?: string }) {
  return <Check size={size} color={color} strokeWidth={2.6} />;
}

export function FilterGlyph({ size = 16, color = COLORS.navy }: { size?: number; color?: string }) {
  return <SlidersHorizontal size={size} color={color} strokeWidth={2} />;
}

export function PinGlyph({ size = 18, color = COLORS.primary }: { size?: number; color?: string }) {
  return <MapPin size={size} color={color} strokeWidth={2} />;
}

export function BuildingGlyph({ size = 22, color = '#ffffff' }: { size?: number; color?: string }) {
  return <Building2 size={size} color={color} strokeWidth={1.9} />;
}

export function CarGlyph({ size = 18, color = COLORS.primary }: { size?: number; color?: string }) {
  return <Car size={size} color={color} strokeWidth={2} />;
}

export function CalendarGlyph({ size = 18, color = COLORS.primary }: { size?: number; color?: string }) {
  return <Calendar size={size} color={color} strokeWidth={2} />;
}

export function SearchGlyph({ size = 18, color = '#ffffff' }: { size?: number; color?: string }) {
  return <Search size={size} color={color} strokeWidth={2.2} />;
}

export function InfoGlyph({ size = 16, color = COLORS.slate500 }: { size?: number; color?: string }) {
  return <Info size={size} color={color} strokeWidth={2} />;
}

export function SwapGlyph({ size = 16, color = COLORS.primary }: { size?: number; color?: string }) {
  return <ArrowUpDown size={size} color={color} strokeWidth={2} />;
}

export function ChevronDownGlyph({
  size = 18,
  color = COLORS.slate400,
}: {
  size?: number;
  color?: string;
}) {
  return <ChevronDown size={size} color={color} strokeWidth={2} />;
}

export function ChevronRightGlyph({
  size = 18,
  color = COLORS.slate400,
}: {
  size?: number;
  color?: string;
}) {
  return <ChevronRight size={size} color={color} strokeWidth={2} />;
}

export function PhoneGlyph({ size = 18, color = COLORS.primary }: { size?: number; color?: string }) {
  return <Phone size={size} color={color} strokeWidth={2} />;
}

export function RouteGlyph({ size = 56, color = 'rgba(255,255,255,0.16)' }: { size?: number; color?: string }) {
  return <Route size={size} color={color} strokeWidth={1.6} />;
}

export function ClockGlyph({ size = 16, color = COLORS.slate500 }: { size?: number; color?: string }) {
  return <Clock size={size} color={color} strokeWidth={2} />;
}

export function EditGlyph({ size = 16, color = COLORS.primary }: { size?: number; color?: string }) {
  return <Pencil size={size} color={color} strokeWidth={2} />;
}

export function LogOutGlyph({ size = 18, color = COLORS.danger }: { size?: number; color?: string }) {
  return <LogOut size={size} color={color} strokeWidth={2} />;
}

export function ShieldCheckGlyph({ size = 16, color = COLORS.tealDark }: { size?: number; color?: string }) {
  return <ShieldCheck size={size} color={color} strokeWidth={2} />;
}

/** Brand Logo matching Figma PA-01 / PA-02 */
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
          ...CARD_SHADOW,
        }}
      >
        <BusGlyph
          size={Math.round(size * 0.5)}
          color={inverted ? COLORS.primary : COLORS.surface}
        />
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

/** Figma PA-01 Dark Navy Splash Screen with gradient & animated progress bar */
export function SplashScreenView({ onContinue }: { onContinue?: () => void }) {
  const translateX = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: 160,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -80,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [translateX]);

  return (
    <Pressable
      style={uiStyles.splashWrap}
      onPress={onContinue}
      accessibilityRole={onContinue ? 'button' : undefined}
      accessibilityLabel="RideShareHub đang khởi động"
    >
      <LinearGradient
        colors={['#0b1120', '#181446', '#0f172a']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={uiStyles.splash}
      >
        <StatusBar style="light" />
        <View style={uiStyles.splashGlowPurple} />
        <View style={uiStyles.splashGlowTeal} />

        <View style={uiStyles.splashCenter}>
          <BrandLogo size={96} inverted />
          <Text style={uiStyles.splashBrand}>RideShareHub</Text>
          <Text style={uiStyles.splashTag}>
            Đi chung thông minh,{'\n'}tiết kiệm mỗi chuyến
          </Text>
          <View style={uiStyles.cityRow}>
            {['Đà Nẵng', 'Huế', 'Hội An', 'Quảng Nam'].map(c => (
              <View key={c} style={uiStyles.cityChip}>
                <Text style={uiStyles.cityText}>{c}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={uiStyles.splashBottom}>
          <View style={uiStyles.progressTrack}>
            <Animated.View style={[uiStyles.progressBar, { transform: [{ translateX }] }]} />
          </View>
          <Text style={uiStyles.splashHint}>Đang khởi động...</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

/** White surface AppBar matching Figma PA-05..PA-15 */
export function AppBar({
  title,
  sub,
  onBack,
  backIcon = 'back',
  right,
}: {
  title: string;
  sub?: string;
  onBack?: () => void;
  backIcon?: 'back' | 'close';
  right?: ReactNode;
}) {
  return (
    <View style={uiStyles.appBar}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          style={uiStyles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={backIcon === 'close' ? 'Đóng' : 'Quay lại'}
        >
          {backIcon === 'close' ? (
            <X size={21} color={COLORS.navy} strokeWidth={2.2} />
          ) : (
            <ChevronLeft size={25} color={COLORS.navy} strokeWidth={2.2} />
          )}
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
  CONFIRMED: { label: 'Đã xác nhận', bg: '#eef2ff', text: '#4328d6', dot: COLORS.primary },
  PENDING: { label: 'Chờ xác nhận', bg: '#fffbeb', text: '#b45309', dot: COLORS.warning },
  PICKED_UP: { label: 'Đã lên xe', bg: '#f0fdfa', text: '#0f766e', dot: COLORS.teal },
  COMPLETED: { label: 'Hoàn thành', bg: '#f0fdfa', text: '#0f766e', dot: COLORS.teal },
  CANCELLED: { label: 'Đã hủy', bg: '#fef2f2', text: '#b91c1c', dot: COLORS.danger },
  NO_SHOW: { label: 'Vắng mặt', bg: '#f1f5f9', text: '#475569', dot: COLORS.slate400 },
  PUBLISHED: { label: 'Chờ khởi hành', bg: '#fffbeb', text: '#b45309', dot: COLORS.warning },
  FULL: { label: 'Đủ chỗ', bg: '#eef2ff', text: '#4328d6', dot: COLORS.primary },
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
  const items: { id: 'home' | 'bookings' | 'account'; label: string; path: string }[] = [
    { id: 'home', label: 'Trang chủ', path: '/(passenger)' },
    { id: 'bookings', label: 'Chuyến của tôi', path: '/(passenger)/bookings' },
    { id: 'account', label: 'Cá nhân', path: '/(passenger)/account' },
  ];

  return (
    <View style={uiStyles.tabBar}>
      {items.map(item => {
        const isActive = active === item.id;
        const color = isActive ? COLORS.primary : COLORS.slate500;
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
            {item.id === 'home' ? (
              <HomeGlyph size={21} color={color} />
            ) : item.id === 'bookings' ? (
              <TicketGlyph size={21} color={color} />
            ) : (
              <UserGlyph size={21} color={color} />
            )}
            <Text style={[uiStyles.tabLabel, isActive && uiStyles.tabTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Dark Navy Driver Bottom Bar matching Figma DR-02 */
export function DriverTabBar({
  active,
  onChange,
}: {
  active: 'home' | 'trips';
  onChange: (tab: 'home' | 'trips') => void;
}) {
  const items: { id: 'home' | 'trips'; label: string }[] = [
    { id: 'home', label: 'Trang chủ' },
    { id: 'trips', label: 'Chuyến được giao' },
  ];

  return (
    <View style={uiStyles.driverTabBar}>
      {items.map(item => {
        const isActive = active === item.id;
        const color = isActive ? COLORS.teal : COLORS.slate400;
        return (
          <Pressable
            key={item.id}
            style={uiStyles.driverTabItem}
            onPress={() => onChange(item.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            {item.id === 'home' ? (
              <HomeGlyph size={22} color={color} />
            ) : (
              <BusGlyph size={22} color={color} />
            )}
            <Text style={[uiStyles.driverTabLabel, isActive && uiStyles.driverTabLabelActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const uiStyles = StyleSheet.create({
  splashWrap: { flex: 1 },
  splash: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    overflow: 'hidden',
  },
  splashGlowPurple: {
    position: 'absolute',
    top: -90,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(84, 56, 245, 0.32)',
  },
  splashGlowTeal: {
    position: 'absolute',
    bottom: 40,
    left: -100,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(20, 184, 166, 0.2)',
  },
  splashCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 32,
  },
  splashBrand: {
    color: COLORS.surface,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginTop: 26,
  },
  splashTag: {
    color: COLORS.slate300,
    fontSize: 15,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 22,
  },
  cityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  cityChip: {
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cityText: { color: COLORS.slate300, fontSize: 12, fontWeight: '600' },
  splashBottom: {
    paddingBottom: 56,
    alignItems: 'center',
    gap: 12,
  },
  progressTrack: {
    width: 164,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
  },
  progressBar: {
    width: 82,
    height: '100%',
    borderRadius: 2,
    backgroundColor: COLORS.teal,
  },
  splashHint: { color: COLORS.slate400, fontSize: 12, fontWeight: '500' },

  appBar: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#edf1f7',
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    borderColor: '#eaedf3',
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
  kvVal: { fontSize: 13, color: COLORS.navy, fontWeight: '600', textAlign: 'right', flexShrink: 1 },
  kvValStrong: { fontWeight: '800', fontSize: 15 },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: '#edf1f7',
    paddingBottom: 18,
    paddingTop: 8,
    height: 74,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    gap: 4,
  },
  tabIndicator: {
    position: 'absolute',
    top: -8,
    width: 34,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  tabLabel: { fontSize: 11, fontWeight: '600', color: COLORS.slate500 },
  tabTextActive: { color: COLORS.primary },

  driverTabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.navy,
    paddingBottom: 18,
    paddingTop: 8,
    height: 76,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  driverTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  driverTabLabel: { fontSize: 12, fontWeight: '600', color: COLORS.slate400 },
  driverTabLabelActive: { color: COLORS.teal },
});
