/**
 * SP2-P2-03 & SP2-P2-05: Passenger Bookings Screen — Figma PA-11 Tabs + PA-12 Detail Modal & Cancel Policy.
 */

import { useFocusEffect, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ApiError,
  type BookingRecord,
  cancelBooking,
  generateIdempotencyKey,
  getMyBookings,
} from '../../src/api/client';
import { useAuth } from '../../src/session/AuthContext';
import {
  AppBar,
  BusGlyph,
  CarGlyph,
  Card,
  KeyValueRow,
  PassengerTabBar,
  PhoneGlyph,
  PinGlyph,
  SectionHeading,
  StatusBadge,
  TicketGlyph,
} from '../../src/components/UI';
import { CARD_SHADOW, COLORS } from '../../src/theme/tokens';
import {
  formatArrivalTime,
  formatDateShort,
  formatDeparture,
  formatTimeOnly,
  formatVND,
} from '../../src/trips/tripFormatters';

type TabGroup = 'UPCOMING' | 'COMPLETED' | 'CANCELLED';

const TABS: [TabGroup, string][] = [
  ['UPCOMING', 'Sắp đi'],
  ['COMPLETED', 'Hoàn thành'],
  ['CANCELLED', 'Đã hủy'],
];

function groupOf(status: BookingRecord['status']): TabGroup {
  if (status === 'COMPLETED') return 'COMPLETED';
  if (status === 'CANCELLED' || status === 'NO_SHOW') return 'CANCELLED';
  return 'UPCOMING';
}

export default function PassengerBookingsScreen() {
  const { session } = useAuth();
  const router = useRouter();

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [tab, setTab] = useState<TabGroup>('UPCOMING');
  const [selected, setSelected] = useState<BookingRecord | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadBookings = useCallback(
    async (isRefresh = false) => {
      if (!session?.accessToken) return;
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setErrorMsg(null);
      try {
        const list = await getMyBookings(session.accessToken);
        setBookings(list);
      } catch (err: unknown) {
        setErrorMsg(
          err instanceof ApiError ? err.message : 'Không thể tải danh sách vé đã đặt',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session?.accessToken],
  );

  useFocusEffect(
    useCallback(() => {
      void loadBookings(false);
    }, [loadBookings]),
  );

  async function handleCancelBooking(bookingId: number) {
    if (!session?.accessToken) return;
    setCancelling(true);
    setActionError(null);
    try {
      const updated = await cancelBooking(
        session.accessToken,
        bookingId,
        generateIdempotencyKey('cancel'),
        'Hành khách chủ động hủy vé',
      );
      setBookings(prev => prev.map(b => (b.id === bookingId ? updated : b)));
      setSelected(updated);
      setConfirmCancel(false);
    } catch (err: unknown) {
      setActionError(
        err instanceof ApiError ? err.message : 'Không thể hủy vé lúc này. Vui lòng thử lại.',
      );
    } finally {
      setCancelling(false);
    }
  }

  const list = bookings
    .filter(b => groupOf(b.status) === tab)
    .sort((a, b) => {
      const ta = new Date(a.departureTime).getTime();
      const tb = new Date(b.departureTime).getTime();
      return tab === 'UPCOMING' ? ta - tb : tb - ta;
    });

  const counts: Record<TabGroup, number> = {
    UPCOMING: bookings.filter(b => groupOf(b.status) === 'UPCOMING').length,
    COMPLETED: bookings.filter(b => groupOf(b.status) === 'COMPLETED').length,
    CANCELLED: bookings.filter(b => groupOf(b.status) === 'CANCELLED').length,
  };

  function renderBookingItem({ item }: { item: BookingRecord }) {
    return (
      <Pressable
        style={styles.card}
        onPress={() => {
          setActionError(null);
          setConfirmCancel(false);
          setSelected(item);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Xem chi tiết vé ${item.bookingCode}`}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.bookingCode}>{item.bookingCode}</Text>
          <StatusBadge status={item.status} />
        </View>

        <Text style={styles.routeText}>
          {item.origin} → {item.destination}
        </Text>
        <Text style={styles.depText}>
          {formatDateShort(item.departureTime)} · {formatTimeOnly(item.departureTime)} ·{' '}
          {item.companyName}
        </Text>

        {/* Compact Pickup/Dropoff visual summary */}
        <View style={styles.routeSnippetBox}>
          <View style={styles.snippetLine}>
            <View style={[styles.snippetDot, { backgroundColor: COLORS.teal }]} />
            <Text style={styles.snippetText} numberOfLines={1}>
              Đón: {item.pickup.label}
            </Text>
          </View>
          <View style={styles.snippetLine}>
            <View style={[styles.snippetDot, { backgroundColor: COLORS.danger }]} />
            <Text style={styles.snippetText} numberOfLines={1}>
              Trả: {item.dropoff.label}
            </Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          <View style={styles.seatMetaRow}>
            <TicketGlyph size={16} color={COLORS.slate500} />
            <Text style={styles.seatText}>
              {item.seatCount} chỗ · {item.vehiclePlate}
            </Text>
          </View>
          <Text style={styles.fareText}>{formatVND(item.fareEstimate)}</Text>
        </View>

        {item.status !== 'CANCELLED' && item.status !== 'NO_SHOW' ? (
          <Pressable
            style={{
              marginTop: 10,
              backgroundColor: item.status === 'PICKED_UP' ? '#ECFDF5' : '#EEF2FF',
              borderColor: item.status === 'PICKED_UP' ? '#6EE7B7' : '#C7D2FE',
              borderWidth: 1,
              borderRadius: 11,
              paddingVertical: 9,
              paddingHorizontal: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            onPress={() =>
              router.push({
                pathname: '/(passenger)/tracking/[tripId]',
                params: { tripId: String(item.tripId) },
              } as never)
            }
            accessibilityRole="button"
            accessibilityLabel="Theo dõi vị trí xe trực tiếp"
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                color: item.status === 'PICKED_UP' ? '#065F46' : COLORS.primary,
              }}
            >
              📡 Theo dõi xe & Lộ trình trực tiếp (Realtime)
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                color: item.status === 'PICKED_UP' ? '#065F46' : COLORS.primary,
              }}
            >
              Xem bản đồ →
            </Text>
          </Pressable>
        ) : null}
      </Pressable>
    );
  }

  const canCancelSelected =
    selected != null && (selected.status === 'CONFIRMED' || selected.status === 'PENDING');
  const minutesUntilSelected =
    selected != null
      ? Math.floor((new Date(selected.departureTime).getTime() - Date.now()) / 60_000)
      : 0;
  const isWithinCancelCutoff = canCancelSelected && minutesUntilSelected < 30;

  return (
    <View style={styles.root}>
      {/* Figma PA-11 Header + Segmented Pill Tabs */}
      <View style={styles.topHeader}>
        <Text style={styles.title}>Chuyến của tôi</Text>
        <View style={styles.segmentWrap}>
          {TABS.map(([key, label]) => {
            const active = tab === key;
            return (
              <Pressable
                key={key}
                onPress={() => setTab(key)}
                style={[styles.segmentBtn, active && styles.segmentBtnActive]}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {label}{' '}
                  <Text style={styles.segmentCountText}>{counts[key]}</Text>
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>Đang tải danh sách vé…</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <Pressable style={styles.retryBtn} onPress={() => void loadBookings(false)}>
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={b => String(b.id)}
          renderItem={renderBookingItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadBookings(true)}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconCircle}>
                <TicketGlyph size={28} color={COLORS.primary} />
              </View>
              <Text style={styles.emptyTitle}>Chưa có chuyến nào</Text>
              <Text style={styles.emptyText}>
                {tab === 'UPCOMING'
                  ? 'Các chuyến xe bạn đặt sẽ xuất hiện tại đây.'
                  : 'Chưa có chuyến nào thuộc nhóm này.'}
              </Text>
              {tab === 'UPCOMING' ? (
                <Pressable style={styles.retryBtn} onPress={() => router.replace('/(passenger)')}>
                  <Text style={styles.retryText}>Tìm chuyến ngay</Text>
                </Pressable>
              ) : null}
            </View>
          }
        />
      )}

      <PassengerTabBar active="bookings" />

      {/* Figma PA-12 Booking Detail Modal */}
      <Modal
        visible={!!selected}
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        {selected ? (
          <View style={styles.root}>
            <AppBar
              title="Chi tiết đặt chỗ"
              sub={selected.bookingCode}
              onBack={() => {
                setSelected(null);
                setConfirmCancel(false);
              }}
              right={<StatusBadge status={selected.status} />}
            />

            <ScrollView contentContainerStyle={styles.detailScroll}>
              <View style={styles.navyTicket}>
                <Text style={styles.navyTicketLabel}>Mã đặt chỗ</Text>
                <Text style={styles.navyTicketCode}>{selected.bookingCode}</Text>
              </View>

              {selected.status !== 'CANCELLED' && selected.status !== 'NO_SHOW' ? (
                <Pressable
                  style={{
                    backgroundColor: COLORS.primary,
                    borderRadius: 14,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginBottom: 4,
                  }}
                  onPress={() => {
                    const tId = selected.tripId;
                    setSelected(null);
                    router.push({
                      pathname: '/(passenger)/tracking/[tripId]',
                      params: { tripId: String(tId) },
                    } as never);
                  }}
                  accessibilityRole="button"
                >
                  <BusGlyph size={16} color="#ffffff" />
                  <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '800' }}>
                    📡 Mở bản đồ theo dõi xe trực tiếp (Realtime PA-13)
                  </Text>
                </Pressable>
              ) : null}

              <Card>
                <SectionHeading>Chuyến đi</SectionHeading>
                <Text style={styles.detailRoute}>
                  {selected.origin} → {selected.destination}
                </Text>
                <View style={styles.detailTimeline}>
                  <View>
                    <Text style={styles.detailTimeBig}>{formatTimeOnly(selected.departureTime)}</Text>
                    <Text style={styles.detailCitySub}>{selected.origin}</Text>
                  </View>
                  <View style={styles.detailDashWrap}>
                    <View style={[styles.snippetDot, { backgroundColor: COLORS.teal }]} />
                    <View style={styles.detailDashedLine} />
                    <BusGlyph size={16} color={COLORS.primary} />
                    <View style={styles.detailDashedLine} />
                    <View style={[styles.snippetDot, { backgroundColor: COLORS.danger }]} />
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.detailTimeBig}>
                      {selected.estimatedMinutes
                        ? formatArrivalTime(selected.departureTime, selected.estimatedMinutes)
                        : formatDateShort(selected.departureTime)}
                    </Text>
                    <Text style={styles.detailCitySub}>{selected.destination}</Text>
                  </View>
                </View>
                <View style={styles.cardDivider} />
                <KeyValueRow label="Khởi hành" value={formatDeparture(selected.departureTime)} />
                <KeyValueRow label="Nhà xe" value={selected.companyName} />
                <KeyValueRow label="Số chỗ" value={`${selected.seatCount} chỗ`} />
              </Card>

              <Card>
                <SectionHeading>Điểm đón · trả</SectionHeading>
                <View style={styles.locationBlock}>
                  <View style={styles.locationItem}>
                    <View style={[styles.locationBadge, { backgroundColor: COLORS.tealSoft }]}>
                      <PinGlyph size={16} color={COLORS.tealDark} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.locationRole}>Điểm đón</Text>
                      <Text style={styles.locationAddr}>{selected.pickup.label}</Text>
                      {selected.pickup.latitude != null && selected.pickup.longitude != null ? (
                        <Text style={styles.gpsBadgeText}>
                          GPS: {Number(selected.pickup.latitude).toFixed(5)},{' '}
                          {Number(selected.pickup.longitude).toFixed(5)}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.locationItem}>
                    <View style={[styles.locationBadge, { backgroundColor: COLORS.dangerSoft }]}>
                      <PinGlyph size={16} color={COLORS.danger} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.locationRole}>Điểm trả</Text>
                      <Text style={styles.locationAddr}>{selected.dropoff.label}</Text>
                      {selected.dropoff.latitude != null && selected.dropoff.longitude != null ? (
                        <Text style={styles.gpsBadgeText}>
                          GPS: {Number(selected.dropoff.latitude).toFixed(5)},{' '}
                          {Number(selected.dropoff.longitude).toFixed(5)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              </Card>

              <Card>
                <SectionHeading>Tài xế &amp; phương tiện</SectionHeading>
                <View style={styles.driverSummaryRow}>
                  <View style={styles.driverAvatarCircle}>
                    <Text style={styles.driverAvatarText}>
                      {(selected.driverName.trim().split(/\s+/).pop()?.[0] ?? 'T').toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.driverTitle}>{selected.driverName}</Text>
                    <Text style={styles.driverSub}>
                      {selected.vehicleType} · Biển số {selected.vehiclePlate}
                    </Text>
                    {selected.driverPhone ? (
                      <Text style={styles.driverPhoneSub}>{selected.driverPhone}</Text>
                    ) : null}
                  </View>
                  {selected.driverPhone ? (
                    <Pressable
                      style={styles.callDriverBtn}
                      onPress={() => {
                        const tel = selected.driverPhone?.replace(/\s+/g, '');
                        if (tel) void Linking.openURL(`tel:${tel}`);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Gọi tài xế"
                    >
                      <PhoneGlyph size={18} color={COLORS.primary} />
                    </Pressable>
                  ) : (
                    <View style={styles.vehicleIconBox}>
                      <CarGlyph size={20} color={COLORS.primary} />
                    </View>
                  )}
                </View>
              </Card>

              <Card>
                <SectionHeading>Thanh toán</SectionHeading>
                <View style={styles.fareTotalRow}>
                  <Text style={styles.fareTotalLabel}>Tổng giá vé</Text>
                  <Text style={styles.fareTotalVal}>{formatVND(selected.fareEstimate)}</Text>
                </View>
                <Text style={styles.payNote}>Thanh toán trực tiếp cho tài xế khi lên xe.</Text>
              </Card>

              {canCancelSelected ? (
                <View style={[styles.policyBox, isWithinCancelCutoff && styles.policyBoxBlocked]}>
                  <Text
                    style={[
                      styles.policyBoxTitle,
                      isWithinCancelCutoff && styles.policyBoxTitleBlocked,
                    ]}
                  >
                    {isWithinCancelCutoff
                      ? 'Đã khóa hủy đặt chỗ (còn dưới 30 phút)'
                      : 'Chính sách hủy đặt chỗ'}
                  </Text>
                  <Text
                    style={[
                      styles.policyBoxBody,
                      isWithinCancelCutoff && styles.policyBoxBodyBlocked,
                    ]}
                  >
                    {isWithinCancelCutoff
                      ? 'Hành khách chỉ được hủy vé trước giờ khởi hành ít nhất 30 phút. Vui lòng liên hệ trực tiếp nhà xe nếu cần hỗ trợ khẩn cấp.'
                      : `Bạn có thể hủy vé miễn phí trước giờ khởi hành ít nhất 30 phút (còn khoảng ${minutesUntilSelected} phút nữa tới giờ khởi hành).`}
                  </Text>
                </View>
              ) : null}

              {selected.cancelReason ? (
                <View style={styles.cancelInfoBox}>
                  <Text style={styles.cancelInfoText}>Lý do hủy: {selected.cancelReason}</Text>
                </View>
              ) : null}

              {actionError ? (
                <View style={styles.cancelInfoBox}>
                  <Text style={styles.cancelInfoText}>{actionError}</Text>
                </View>
              ) : null}
            </ScrollView>

            {canCancelSelected && !isWithinCancelCutoff ? (
              <View style={styles.detailFooter}>
                {confirmCancel ? (
                  <View style={styles.confirmBox}>
                    <Text style={styles.confirmTitle}>
                      Hủy đặt chỗ {selected.bookingCode}? Ghế sẽ được trả lại cho nhà xe.
                    </Text>
                    <View style={styles.confirmActions}>
                      <Pressable
                        style={styles.keepBtn}
                        onPress={() => setConfirmCancel(false)}
                        disabled={cancelling}
                      >
                        <Text style={styles.keepBtnText}>Giữ vé</Text>
                      </Pressable>
                      <Pressable
                        style={styles.dangerBtn}
                        onPress={() => handleCancelBooking(selected.id)}
                        disabled={cancelling}
                      >
                        {cancelling ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.dangerBtnText}>Xác nhận hủy</Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    style={styles.cancelFullBtn}
                    onPress={() => setConfirmCancel(true)}
                    accessibilityRole="button"
                    accessibilityLabel={`Hủy vé ${selected.bookingCode}`}
                  >
                    <Text style={styles.cancelFullBtnText}>Hủy đặt chỗ</Text>
                  </Pressable>
                )}
              </View>
            ) : null}
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.canvas },
  topHeader: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  title: { fontSize: 25, fontWeight: '800', color: COLORS.navy, letterSpacing: -0.4 },
  segmentWrap: {
    marginTop: 12,
    flexDirection: 'row',
    backgroundColor: COLORS.slate100,
    borderRadius: 999,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: COLORS.surface,
    ...CARD_SHADOW,
  },
  segmentText: { fontSize: 13, fontWeight: '600', color: COLORS.slate500 },
  segmentTextActive: { color: COLORS.primary, fontWeight: '700' },
  segmentCountText: { fontSize: 11, opacity: 0.8 },

  listContent: { padding: 16, paddingBottom: 28 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 16,
    marginBottom: 12,
    ...CARD_SHADOW,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bookingCode: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.slate500,
  },
  routeText: { fontSize: 17, fontWeight: '800', color: COLORS.navy, marginTop: 8 },
  depText: { fontSize: 13, color: COLORS.slate500, marginTop: 3 },

  routeSnippetBox: {
    marginTop: 10,
    backgroundColor: COLORS.canvas,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 5,
  },
  snippetLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  snippetDot: { width: 7, height: 7, borderRadius: 4 },
  snippetText: { fontSize: 12, color: COLORS.slate600, flex: 1 },

  footerRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seatMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  seatText: { fontSize: 13, color: COLORS.slate600, fontWeight: '500' },
  fareText: { fontSize: 17, fontWeight: '800', color: COLORS.navy },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { color: COLORS.slate500, marginTop: 12 },
  errorText: { color: COLORS.danger, textAlign: 'center', fontSize: 14 },
  retryBtn: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  retryText: { color: '#ffffff', fontWeight: '700' },
  emptyBox: { alignItems: 'center', paddingTop: 56, paddingHorizontal: 24 },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.navy },
  emptyText: { fontSize: 14, color: COLORS.slate500, marginTop: 6, textAlign: 'center' },

  detailScroll: { padding: 16, gap: 14, paddingBottom: 28 },
  navyTicket: {
    backgroundColor: COLORS.navy,
    borderRadius: 20,
    padding: 18,
  },
  navyTicketLabel: { color: COLORS.slate300, fontSize: 12 },
  navyTicketCode: {
    color: COLORS.teal,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginTop: 4,
  },
  detailRoute: { fontSize: 17, fontWeight: '800', color: COLORS.navy, marginBottom: 10 },
  detailTimeline: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailTimeBig: { fontSize: 16, fontWeight: '800', color: COLORS.navy },
  detailCitySub: { fontSize: 12, color: COLORS.slate500, marginTop: 2 },
  detailDashWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailDashedLine: {
    flex: 1,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.slate300,
  },
  cardDivider: { height: 1, backgroundColor: COLORS.line, marginVertical: 10 },

  locationBlock: { gap: 14 },
  locationItem: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  locationBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationRole: { fontSize: 11, fontWeight: '600', color: COLORS.slate500 },
  locationAddr: { fontSize: 14, fontWeight: '700', color: COLORS.navy, marginTop: 2, lineHeight: 19 },
  gpsBadgeText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: COLORS.primary,
    marginTop: 3,
    fontWeight: '700',
  },

  driverSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  driverAvatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarText: { fontSize: 17, fontWeight: '800', color: COLORS.tealDark },
  callDriverBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverTitle: { fontSize: 15, fontWeight: '700', color: COLORS.navy },
  driverSub: { fontSize: 12, color: COLORS.slate500, marginTop: 2 },
  driverPhoneSub: { fontSize: 12, color: COLORS.primary, fontWeight: '600', marginTop: 2 },

  fareTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fareTotalLabel: { fontSize: 14, color: COLORS.slate500, fontWeight: '600' },
  fareTotalVal: { fontSize: 19, fontWeight: '800', color: COLORS.primary },
  payNote: { fontSize: 12, color: COLORS.slate500, marginTop: 6 },

  policyBox: {
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 14,
    padding: 14,
  },
  policyBoxBlocked: {
    backgroundColor: COLORS.warningSoft,
    borderColor: '#fde68a',
  },
  policyBoxTitle: { fontSize: 13, fontWeight: '700', color: COLORS.primaryDark },
  policyBoxTitleBlocked: { color: COLORS.warningText },
  policyBoxBody: { fontSize: 12, color: COLORS.slate600, marginTop: 4, lineHeight: 18 },
  policyBoxBodyBlocked: { color: COLORS.warningText },
  cancelInfoBox: {
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
  },
  cancelInfoText: { color: COLORS.danger, fontSize: 13, fontWeight: '500' },

  detailFooter: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  cancelFullBtn: {
    backgroundColor: COLORS.danger,
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelFullBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  confirmBox: { gap: 12 },
  confirmTitle: { fontSize: 13, fontWeight: '600', color: COLORS.navy },
  confirmActions: { flexDirection: 'row', gap: 10 },
  keepBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.navy },
  dangerBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerBtnText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
});
