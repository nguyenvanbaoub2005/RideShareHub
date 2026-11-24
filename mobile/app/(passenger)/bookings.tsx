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
  TextInput,
  View,
} from 'react-native';
import {
  ApiError,
  type BookingRecord,
  cancelBooking,
  createBookingRating,
  generateIdempotencyKey,
  getMyBookings,
} from '../../src/api/client';
import { useAuth } from '../../src/session/AuthContext';
import {
  AppBar,
  BusGlyph,
  CarGlyph,
  Card,
  CheckGlyph,
  KeyValueRow,
  PassengerTabBar,
  PhoneGlyph,
  PinGlyph,
  SectionHeading,
  StarGlyph,
  StatusBadge,
  TicketGlyph,
} from '../../src/components/UI';
import { CARD_SHADOW, COLORS } from '../../src/theme/tokens';
import {
  formatArrivalTime,
  formatDateDMY,
  formatDateShort,
  formatSeatLabels,
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

function getBookingStatusBadgeProps(booking: BookingRecord): { status: string; label?: string } {
  if (booking.status === 'COMPLETED') return { status: 'COMPLETED', label: 'Hoàn thành' };
  if (booking.status === 'CANCELLED') return { status: 'CANCELLED', label: 'Đã hủy' };
  if (booking.status === 'NO_SHOW') return { status: 'NO_SHOW', label: 'Vắng mặt' };
  if (booking.status === 'PICKED_UP') return { status: 'PICKED_UP', label: 'Đang trên xe' };
  const minutesUntil = Math.floor(
    (new Date(booking.departureTime).getTime() - Date.now()) / 60_000,
  );
  if (minutesUntil <= 240) {
    return { status: 'CONFIRMED', label: 'Sắp khởi hành' };
  }
  return { status: 'NO_SHOW', label: 'Sắp đi' };
}

function getSeatDisplay(booking: BookingRecord): string {
  const startIdx = Math.max(0, (booking.id ?? 0) % 8);
  return formatSeatLabels(booking.seatCount, startIdx).join(', ');
}

const STAR_LABELS = ['', 'Rất tệ', 'Chưa tốt', 'Bình thường', 'Tốt', 'Tuyệt vời'];

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

  // SP4-P1-03: Figma PA-15 Rating Modal state
  const [ratingTarget, setRatingTarget] = useState<BookingRecord | null>(null);
  const [tripScore, setTripScore] = useState(0);
  const [driverScore, setDriverScore] = useState(0);
  const [companyScore, setCompanyScore] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingTried, setRatingTried] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);

  function openRatingModal(booking: BookingRecord) {
    if (booking.status !== 'COMPLETED' || booking.rated) return;
    setRatingTarget(booking);
    setTripScore(0);
    setDriverScore(0);
    setCompanyScore(0);
    setRatingComment('');
    setRatingTried(false);
    setRatingSubmitting(false);
    setRatingDone(false);
    setRatingError(null);
  }

  function closeRatingModal() {
    setRatingTarget(null);
    setRatingTried(false);
    setRatingSubmitting(false);
    setRatingDone(false);
    setRatingError(null);
  }

  async function handleSubmitRating() {
    if (!session?.accessToken || !ratingTarget) return;
    setRatingTried(true);
    setRatingError(null);
    if (!tripScore || !driverScore || !companyScore) {
      setRatingError('Vui lòng chọn đầy đủ số sao (1–5) cho chuyến đi, tài xế và nhà xe.');
      return;
    }
    if (ratingTarget.status !== 'COMPLETED' || ratingTarget.rated) {
      return;
    }
    setRatingSubmitting(true);
    try {
      const saved = await createBookingRating(session.accessToken, ratingTarget.id, {
        tripScore,
        driverScore,
        companyScore,
        comment: ratingComment.trim() || null,
      });
      setBookings(prev =>
        prev.map(b =>
          b.id === ratingTarget.id ? { ...b, rated: true, ratingScore: saved.score } : b,
        ),
      );
      setSelected(prev =>
        prev && prev.id === ratingTarget.id
          ? { ...prev, rated: true, ratingScore: saved.score }
          : prev,
      );
      setRatingDone(true);
    } catch (err: unknown) {
      setRatingError(
        err instanceof ApiError
          ? err.message
          : 'Không thể gửi đánh giá lúc này. Vui lòng thử lại.',
      );
    } finally {
      setRatingSubmitting(false);
    }
  }

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
    const badgeProps = getBookingStatusBadgeProps(item);
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
          <StatusBadge status={badgeProps.status} label={badgeProps.label} />
        </View>

        <Text style={styles.routeText}>
          {item.origin} → {item.destination}
        </Text>
        <Text style={styles.depText}>
          {formatDateDMY(item.departureTime)} · {formatTimeOnly(item.departureTime)} ·{' '}
          {item.companyName}
        </Text>

        <View style={styles.footerRow}>
          <View style={styles.seatMetaRow}>
            <TicketGlyph size={16} color={COLORS.slate500} />
            <Text style={styles.seatText}>Ghế {getSeatDisplay(item)}</Text>
          </View>
          <Text style={styles.fareText}>{formatVND(item.fareEstimate)}</Text>
        </View>

        {item.status === 'COMPLETED' ? (
          item.rated ? (
            <View style={styles.ratedBadgeRow}>
              <StarGlyph size={14} color={COLORS.warning} filled />
              <Text style={styles.ratedBadgeText}>
                Đã đánh giá ★ {item.ratingScore ?? 5}/5
              </Text>
            </View>
          ) : (
            <Pressable
              style={styles.unratedInlineRow}
              onPress={() => openRatingModal(item)}
              accessibilityRole="button"
              accessibilityLabel={`Đánh giá chuyến đi ${item.bookingCode}`}
            >
              <StarGlyph size={14} color={COLORS.primary} />
              <Text style={styles.unratedInlineText}>Chưa đánh giá</Text>
            </Pressable>
          )
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
              right={
                <StatusBadge
                  status={getBookingStatusBadgeProps(selected).status}
                  label={getBookingStatusBadgeProps(selected).label}
                />
              }
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
                <View style={styles.detailTimeline}>
                  <Text style={styles.detailTimeBig}>{formatTimeOnly(selected.departureTime)}</Text>
                  <View style={styles.detailDashedLine} />
                  <Text style={styles.detailTimeBig}>
                    {selected.estimatedMinutes
                      ? formatArrivalTime(selected.departureTime, selected.estimatedMinutes)
                      : formatDateShort(selected.departureTime)}
                  </Text>
                </View>
                <View style={styles.cardDivider} />
                <KeyValueRow label="Ngày" value={formatDateDMY(selected.departureTime)} />
                <KeyValueRow label="Nhà xe" value={selected.companyName} />
                <KeyValueRow label="Ghế" value={getSeatDisplay(selected)} />
              </Card>

              <Card>
                <SectionHeading>Hành khách</SectionHeading>
                <KeyValueRow label="Họ và tên" value={selected.passengerName} />
                <KeyValueRow
                  label="Số điện thoại"
                  value={selected.passengerPhone || 'Chưa cập nhật'}
                />
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
                          GPS: {Number(selected.pickup.latitude).toFixed(6)},{' '}
                          {Number(selected.pickup.longitude).toFixed(6)}
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
                          GPS: {Number(selected.dropoff.latitude).toFixed(6)},{' '}
                          {Number(selected.dropoff.longitude).toFixed(6)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              </Card>

              <Card>
                <SectionHeading>Tài xế và phương tiện</SectionHeading>
                <View style={styles.driverSummaryRow}>
                  <View style={styles.driverAvatarCircle}>
                    <Text style={styles.driverAvatarText}>
                      {(selected.driverName.trim().split(/\s+/).pop()?.[0] ?? 'T').toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.driverTitle}>{selected.driverName}</Text>
                    {selected.driverPhone ? (
                      <Text style={styles.driverSub}>{selected.driverPhone}</Text>
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
                <View style={styles.cardDivider} />
                <KeyValueRow label="Xe" value={selected.vehicleType} />
                <KeyValueRow label="Biển số" value={selected.vehiclePlate} />
              </Card>

              <Card>
                <SectionHeading>Thanh toán</SectionHeading>
                <View style={styles.fareTotalRow}>
                  <Text style={styles.fareTotalLabel}>Tổng giá vé</Text>
                  <Text style={styles.fareTotalVal}>{formatVND(selected.fareEstimate)}</Text>
                </View>
                <Text style={styles.payNote}>Thanh toán trực tiếp cho tài xế khi lên xe.</Text>
              </Card>

              {canCancelSelected && isWithinCancelCutoff ? (
                <View style={[styles.policyBox, styles.policyBoxBlocked]}>
                  <Text style={[styles.policyBoxTitle, styles.policyBoxTitleBlocked]}>
                    Đã khóa hủy đặt chỗ (còn dưới 30 phút)
                  </Text>
                  <Text style={[styles.policyBoxBody, styles.policyBoxBodyBlocked]}>
                    Chỉ có thể hủy vé trước giờ khởi hành ít nhất 30 phút. Chuyến này không còn đủ
                    điều kiện hủy.
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

            {selected.status === 'COMPLETED' ? (
              <View style={styles.detailFooter}>
                {selected.rated ? (
                  <View style={styles.detailRatedBanner}>
                    <StarGlyph size={18} color={COLORS.warning} filled />
                    <Text style={styles.detailRatedText}>
                      Bạn đã đánh giá chuyến này (★ {selected.ratingScore ?? 5}/5)
                    </Text>
                  </View>
                ) : (
                  <Pressable
                    style={styles.rateFullBtn}
                    onPress={() => openRatingModal(selected)}
                    accessibilityRole="button"
                    accessibilityLabel={`Đánh giá chuyến ${selected.bookingCode}`}
                  >
                    <StarGlyph size={18} color="#ffffff" filled />
                    <Text style={styles.rateFullBtnText}>Đánh giá chuyến đi</Text>
                  </Pressable>
                )}
              </View>
            ) : selected.status !== 'CANCELLED' && selected.status !== 'NO_SHOW' ? (
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
                  <View style={styles.footerActionRow}>
                    {canCancelSelected && !isWithinCancelCutoff ? (
                      <Pressable
                        style={[styles.cancelOutlineBtn, { flex: 1 }]}
                        onPress={() => setConfirmCancel(true)}
                        accessibilityRole="button"
                        accessibilityLabel={`Hủy vé ${selected.bookingCode}`}
                      >
                        <Text style={styles.cancelOutlineBtnText}>Hủy đặt chỗ</Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      style={[styles.trackFullBtn, { flex: 1.4 }]}
                      onPress={() => {
                        const tId = selected.tripId;
                        setSelected(null);
                        router.push({
                          pathname: '/(passenger)/tracking/[tripId]',
                          params: { tripId: String(tId) },
                        } as never);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Theo dõi chuyến"
                    >
                      <BusGlyph size={18} color="#ffffff" />
                      <Text style={styles.trackFullBtnText}>Theo dõi chuyến</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ) : null}
          </View>
        ) : null}
      </Modal>

      {/* SP4-P1-03: Figma PA-15 Passenger Rating Modal */}
      <Modal
        visible={!!ratingTarget}
        animationType="slide"
        onRequestClose={closeRatingModal}
      >
        {ratingTarget ? (
          <View style={styles.root}>
            {ratingDone ? (
              <>
                <View style={styles.ratingDoneCenter}>
                  <View style={styles.ratingSuccessOuter}>
                    <View style={styles.ratingSuccessInner}>
                      <CheckGlyph size={34} color="#ffffff" />
                    </View>
                  </View>
                  <Text style={styles.ratingDoneTitle}>Cảm ơn bạn đã đánh giá!</Text>
                  <Text style={styles.ratingDoneSub}>
                    Phản hồi của bạn giúp {ratingTarget.companyName} và cộng đồng RideShareHub cải
                    thiện chất lượng chuyến đi.
                  </Text>
                </View>
                <View style={styles.detailFooter}>
                  <Pressable
                    style={styles.rateFullBtn}
                    onPress={closeRatingModal}
                    accessibilityRole="button"
                  >
                    <Text style={styles.rateFullBtnText}>Về chuyến của tôi</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <AppBar
                  title="Đánh giá chuyến đi"
                  sub={`${ratingTarget.origin} → ${ratingTarget.destination} · ${formatDateShort(ratingTarget.departureTime)}`}
                  onBack={closeRatingModal}
                />
                <ScrollView contentContainerStyle={styles.detailScroll}>
                  {(
                    [
                      ['Chuyến đi', 'Trải nghiệm chung', tripScore, setTripScore],
                      ['Tài xế', ratingTarget.driverName, driverScore, setDriverScore],
                      ['Nhà xe', ratingTarget.companyName, companyScore, setCompanyScore],
                    ] as const
                  ).map(([title, subtitle, value, setter]) => (
                    <Card key={title}>
                      <Text style={styles.ratingCardTitle}>{title}</Text>
                      <Text style={styles.ratingCardSub}>{subtitle}</Text>
                      <View style={styles.starRow}>
                        {[1, 2, 3, 4, 5].map(star => (
                          <Pressable
                            key={star}
                            onPress={() => setter(star)}
                            accessibilityRole="button"
                            accessibilityLabel={`${title}: ${star} sao`}
                            style={styles.starHit}
                          >
                            <StarGlyph
                              size={32}
                              color={star <= value ? COLORS.warning : COLORS.slate300}
                              filled={star <= value}
                            />
                          </Pressable>
                        ))}
                      </View>
                      <Text
                        style={[
                          styles.ratingHint,
                          value
                            ? styles.ratingHintSelected
                            : ratingTried
                              ? styles.ratingHintError
                              : null,
                        ]}
                      >
                        {value
                          ? STAR_LABELS[value]
                          : ratingTried
                            ? 'Vui lòng chọn số sao'
                            : 'Chạm để đánh giá'}
                      </Text>
                    </Card>
                  ))}

                  <Card>
                    <Text style={styles.commentLabel}>
                      Nhận xét <Text style={styles.commentOpt}>(không bắt buộc)</Text>
                    </Text>
                    <TextInput
                      style={styles.commentInput}
                      multiline
                      maxLength={300}
                      value={ratingComment}
                      onChangeText={setRatingComment}
                      placeholder="Chia sẻ trải nghiệm của bạn về tài xế, xe và chuyến đi..."
                      placeholderTextColor={COLORS.slate400}
                      textAlignVertical="top"
                    />
                    <Text style={styles.commentCounter}>{ratingComment.length}/300</Text>
                  </Card>

                  {ratingError ? (
                    <View style={styles.cancelInfoBox}>
                      <Text style={styles.cancelInfoText}>{ratingError}</Text>
                    </View>
                  ) : null}
                </ScrollView>

                <View style={styles.detailFooter}>
                  <Pressable
                    style={[
                      styles.rateFullBtn,
                      (ratingSubmitting || ratingTarget.status !== 'COMPLETED' || ratingTarget.rated) &&
                        styles.rateFullBtnDisabled,
                    ]}
                    disabled={
                      ratingSubmitting || ratingTarget.status !== 'COMPLETED' || ratingTarget.rated
                    }
                    onPress={() => void handleSubmitRating()}
                    accessibilityRole="button"
                    accessibilityLabel="Gửi đánh giá"
                  >
                    {ratingSubmitting ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={styles.rateFullBtnText}>
                        {ratingTarget.rated ? 'Bạn đã đánh giá chuyến này' : 'Gửi đánh giá'}
                      </Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}
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
  footerActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelOutlineBtn: {
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: COLORS.dangerSoft,
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelOutlineBtnText: { color: COLORS.danger, fontSize: 14, fontWeight: '700' },
  trackFullBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  trackFullBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  unratedInlineRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unratedInlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
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
  rateCtaBtn: {
    marginTop: 10,
    backgroundColor: COLORS.warningSoft,
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 11,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  rateCtaText: { fontSize: 13, fontWeight: '700', color: COLORS.warningText },
  ratedBadgeRow: {
    marginTop: 10,
    backgroundColor: COLORS.successSoft,
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 11,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  ratedBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.success },
  detailRatedBanner: {
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.successSoft,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  detailRatedText: { fontSize: 14, fontWeight: '700', color: COLORS.success },
  rateFullBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  rateFullBtnDisabled: { opacity: 0.65 },
  rateFullBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  ratingCardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.navy, textAlign: 'center' },
  ratingCardSub: { fontSize: 12, color: COLORS.slate500, textAlign: 'center', marginTop: 2 },
  starRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  starHit: { padding: 4 },
  ratingHint: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    color: COLORS.slate400,
  },
  ratingHintSelected: { color: COLORS.warningText },
  ratingHintError: { color: COLORS.danger },
  commentLabel: { fontSize: 14, fontWeight: '700', color: COLORS.navy },
  commentOpt: { fontWeight: '400', color: COLORS.slate400 },
  commentInput: {
    marginTop: 10,
    minHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: COLORS.navy,
    backgroundColor: COLORS.surface,
  },
  commentCounter: {
    marginTop: 6,
    textAlign: 'right',
    fontSize: 12,
    color: COLORS.slate400,
  },
  ratingDoneCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  ratingSuccessOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingSuccessInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingDoneTitle: {
    marginTop: 20,
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.navy,
    textAlign: 'center',
  },
  ratingDoneSub: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.slate500,
    textAlign: 'center',
    lineHeight: 20,
  },
});
