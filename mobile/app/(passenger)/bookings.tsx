/**
 * SP2-P2-03 & SP2-P2-05: Passenger Bookings Screen — Figma PA-11 Tabs + PA-12 Detail Modal & Cancel Confirm.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
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
  Card,
  KeyValueRow,
  PassengerTabBar,
  SectionHeading,
  StatusBadge,
} from '../../src/components/UI';
import { CARD_SHADOW, COLORS } from '../../src/theme/tokens';
import { formatDeparture, formatVND } from '../../src/trips/tripFormatters';

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

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [tab, setTab] = useState<TabGroup>('UPCOMING');
  const [selected, setSelected] = useState<BookingRecord | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    if (!session?.accessToken) return;
    setLoading(true);
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
    }
  }, [session?.accessToken]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

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

  const list = bookings.filter(b => groupOf(b.status) === tab);
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
          {formatDeparture(item.departureTime)} · {item.companyName}
        </Text>
        <View style={styles.footerRow}>
          <Text style={styles.seatText}>{item.seatCount} chỗ · {item.vehiclePlate}</Text>
          <Text style={styles.fareText}>{formatVND(item.fareEstimate)}</Text>
        </View>
      </Pressable>
    );
  }

  const canCancelSelected =
    selected != null && (selected.status === 'CONFIRMED' || selected.status === 'PENDING');

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
                  {label} {counts[key]}
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
          <Pressable style={styles.retryBtn} onPress={loadBookings}>
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={b => String(b.id)}
          renderItem={renderBookingItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Chưa có chuyến nào</Text>
              <Text style={styles.emptyText}>Các chuyến thuộc nhóm này sẽ hiển thị tại đây.</Text>
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

              <Card>
                <SectionHeading>Chuyến đi</SectionHeading>
                <Text style={styles.detailRoute}>
                  {selected.origin} → {selected.destination}
                </Text>
                <KeyValueRow label="Khởi hành" value={formatDeparture(selected.departureTime)} />
                <KeyValueRow label="Nhà xe" value={selected.companyName} />
                <KeyValueRow label="Số ghế" value={`${selected.seatCount} chỗ`} />
              </Card>

              <Card>
                <SectionHeading>Điểm đón · Điểm trả</SectionHeading>
                <KeyValueRow label="Điểm đón" value={selected.pickup.label} />
                <KeyValueRow label="Điểm trả" value={selected.dropoff.label} />
              </Card>

              <Card>
                <SectionHeading>Tài xế &amp; phương tiện</SectionHeading>
                <KeyValueRow label="Tài xế" value={selected.driverName} />
                <KeyValueRow label="Phương tiện" value={`${selected.vehicleType} · ${selected.vehiclePlate}`} />
              </Card>

              <Card>
                <SectionHeading>Thanh toán</SectionHeading>
                <KeyValueRow label="Tổng giá vé" value={formatVND(selected.fareEstimate)} strong />
                <Text style={styles.payNote}>Thanh toán trực tiếp cho tài xế khi lên xe.</Text>
              </Card>

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

            {canCancelSelected ? (
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
  routeText: { fontSize: 17, fontWeight: '700', color: COLORS.navy, marginTop: 8 },
  depText: { fontSize: 13, color: COLORS.slate500, marginTop: 4 },
  footerRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seatText: { fontSize: 13, color: COLORS.slate600, fontWeight: '500' },
  fareText: { fontSize: 16, fontWeight: '800', color: COLORS.navy },

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
  emptyBox: { alignItems: 'center', paddingTop: 56 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.navy },
  emptyText: { fontSize: 14, color: COLORS.slate500, marginTop: 6 },

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
  detailRoute: { fontSize: 17, fontWeight: '700', color: COLORS.navy, marginBottom: 8 },
  payNote: { fontSize: 12, color: COLORS.slate500, marginTop: 6 },
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
