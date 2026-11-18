/**
 * SP2-P1-04 & SP2-P2-03: Trip Detail + Booking Form + PA-10 Success celebration.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ApiError,
  type BookingRecord,
  createBooking,
  generateIdempotencyKey,
  type TripSearchResult,
} from '../../../src/api/client';
import { useAuth } from '../../../src/session/AuthContext';
import {
  AppBar,
  Card,
  KeyValueRow,
  SectionHeading,
  StatusBadge,
} from '../../../src/components/UI';
import { COLORS } from '../../../src/theme/tokens';
import {
  formatArrivalTime,
  formatDeparture,
  formatDuration,
  formatTimeOnly,
  formatVND,
  seatColor,
  surchargePercent,
} from '../../../src/trips/tripFormatters';

export default function TripDetailScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { data } = useLocalSearchParams<{ tripId: string; data: string }>();

  let trip: TripSearchResult | null = null;
  try {
    trip = data ? (JSON.parse(data) as TripSearchResult) : null;
  } catch {
    trip = null;
  }

  const [seatCount, setSeatCount] = useState(1);
  const [pickupLabel, setPickupLabel] = useState('');
  const [dropoffLabel, setDropoffLabel] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(() => generateIdempotencyKey('book'));
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdBooking, setCreatedBooking] = useState<BookingRecord | null>(null);

  if (!trip) {
    return (
      <View style={styles.root}>
        <AppBar title="Chi tiết chuyến" onBack={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.errorText}>Không tải được thông tin chuyến xe.</Text>
        </View>
      </View>
    );
  }

  const pct = surchargePercent(trip);
  const unitFare = pct > 0 ? trip.estimatedFare : trip.fare;
  const remainingAfterBooking = createdBooking
    ? Math.max(0, trip.availableSeats - createdBooking.seatCount)
    : trip.availableSeats;
  const maxSelectableSeats = Math.max(1, remainingAfterBooking);
  const totalEstimatedFare = unitFare * seatCount;
  const totalSeats = trip.seatCapacity ?? Math.max(trip.availableSeats, 1);
  const occupancyPct = Math.min(100, Math.round(((totalSeats - remainingAfterBooking) / totalSeats) * 100));

  function adjustSeats(delta: number) {
    const next = Math.min(maxSelectableSeats, Math.max(1, seatCount + delta));
    if (next !== seatCount) {
      setSeatCount(next);
      setIdempotencyKey(generateIdempotencyKey('book'));
      setErrorMsg(null);
    }
  }

  function handlePickupChange(text: string) {
    setPickupLabel(text);
    setIdempotencyKey(generateIdempotencyKey('book'));
    if (errorMsg) setErrorMsg(null);
  }

  function handleDropoffChange(text: string) {
    setDropoffLabel(text);
    setIdempotencyKey(generateIdempotencyKey('book'));
    if (errorMsg) setErrorMsg(null);
  }

  async function handleConfirmBooking() {
    if (!trip) return;
    if (!session?.accessToken) {
      setErrorMsg('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      return;
    }
    const pickup = pickupLabel.trim();
    const dropoff = dropoffLabel.trim();
    if (!pickup) {
      setErrorMsg('Vui lòng nhập địa điểm đón khách.');
      return;
    }
    if (!dropoff) {
      setErrorMsg('Vui lòng nhập địa điểm trả khách.');
      return;
    }
    if (pickup.toLowerCase() === dropoff.toLowerCase()) {
      setErrorMsg('Điểm đón và điểm trả phải khác nhau.');
      return;
    }
    if (seatCount < 1 || seatCount > remainingAfterBooking) {
      setErrorMsg(`Số ghế đặt phải từ 1 đến ${remainingAfterBooking}.`);
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const booking = await createBooking(
        session.accessToken,
        trip.tripId,
        {
          seatCount,
          pickup: { label: pickup },
          dropoff: { label: dropoff },
        },
        idempotencyKey,
      );
      setCreatedBooking(booking);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.statusCode === 409) {
          setIdempotencyKey(generateIdempotencyKey('book'));
          setErrorMsg(
            err.message ||
              'Chuyến xe không còn đủ số ghế bạn chọn. Vui lòng giảm số ghế hoặc chọn chuyến khác.',
          );
        } else {
          setErrorMsg(err.message);
        }
      } else {
        setErrorMsg('Không thể kết nối máy chủ. Bạn có thể bấm xác nhận lại an toàn.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  /* Figma PA-10 Success View */
  if (createdBooking) {
    return (
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.successScroll}>
          <View style={styles.checkOuter}>
            <View style={styles.checkInner}>
              <Text style={styles.checkMark}>✓</Text>
            </View>
          </View>
          <Text style={styles.successHeading}>Đặt chỗ thành công!</Text>
          <Text style={styles.successSub}>
            Nhà xe đã nhận yêu cầu của bạn. Hãy có mặt đúng giờ tại điểm đón.
          </Text>

          <View style={styles.ticketCodeBox}>
            <Text style={styles.ticketCodeLabel}>Mã đặt chỗ</Text>
            <Text style={styles.ticketCodeValue}>{createdBooking.bookingCode}</Text>
          </View>

          <Card style={{ width: '100%', marginTop: 16 }}>
            <View style={styles.successSummaryTop}>
              <Text style={styles.successRoute}>
                {createdBooking.origin} → {createdBooking.destination}
              </Text>
              <StatusBadge status={createdBooking.status} />
            </View>
            <KeyValueRow label="Nhà xe" value={createdBooking.companyName} />
            <KeyValueRow label="Khởi hành" value={formatDeparture(createdBooking.departureTime)} />
            <KeyValueRow label="Số ghế" value={`${createdBooking.seatCount} ghế`} />
            <KeyValueRow label="Điểm đón" value={createdBooking.pickup.label} />
            <KeyValueRow label="Điểm trả" value={createdBooking.dropoff.label} />
            <View style={styles.divider} />
            <KeyValueRow label="Tổng cước" value={formatVND(createdBooking.fareEstimate)} strong />
          </Card>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerButtons}>
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => router.replace('/(passenger)')}
            >
              <Text style={styles.secondaryBtnText}>Trang chủ</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, { flex: 1 }]}
              onPress={() => router.replace('/(passenger)/bookings')}
            >
              <Text style={styles.primaryBtnText}>Xem chuyến của tôi</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppBar
        title="Chi tiết chuyến"
        sub={`${trip.origin} → ${trip.destination}`}
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Operator Card */}
        <Card>
          <View style={styles.operatorRow}>
            <View style={styles.navyBadge}>
              <Text style={styles.navyBadgeText}>NX</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.operatorName}>{trip.companyName ?? trip.routeName}</Text>
              <Text style={styles.operatorMeta}>
                {trip.vehicleType}
                {trip.vehiclePlate ? ` · ${trip.vehiclePlate}` : ''} · Tài xế {trip.driverName}
              </Text>
            </View>
            <StatusBadge status={trip.status} label="Đã xác minh" />
          </View>
        </Card>

        {/* Schedule Card */}
        <Card>
          <SectionHeading>{`Lịch trình · ${formatDeparture(trip.departureTime)}`}</SectionHeading>
          <View style={styles.timelineRow}>
            <View>
              <Text style={styles.timeBig}>{formatTimeOnly(trip.departureTime)}</Text>
              <Text style={styles.citySub}>{trip.origin}</Text>
            </View>
            <View style={styles.midTimeline}>
              <Text style={styles.durationText}>{formatDuration(trip.estimatedMinutes)}</Text>
              <View style={styles.dashedLine} />
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.timeBig}>
                {formatArrivalTime(trip.departureTime, trip.estimatedMinutes)}
              </Text>
              <Text style={styles.citySub}>{trip.destination}</Text>
            </View>
          </View>
        </Card>

        {/* Seat Availability Card */}
        <Card>
          <SectionHeading>Chỗ trống</SectionHeading>
          <View style={styles.seatRow}>
            <Text style={[styles.seatRemain, { color: seatColor(remainingAfterBooking) }]}>
              {remainingAfterBooking}
              <Text style={styles.seatTotal}> / {totalSeats} chỗ</Text>
            </Text>
            <Text style={styles.seatBooked}>Đã đặt {Math.max(0, totalSeats - remainingAfterBooking)}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${occupancyPct}%` }]} />
          </View>
        </Card>

        {/* Fare Breakdown Card */}
        <Card>
          <SectionHeading>Thông tin giá vé</SectionHeading>
          <KeyValueRow label="Giá niêm yết / ghế" value={formatVND(trip.fare)} />
          {pct > 0 ? (
            <KeyValueRow label="Phụ thu nhu cầu cao" value={`+${pct}%`} />
          ) : null}
          <View style={styles.divider} />
          <KeyValueRow label="Đơn giá áp dụng / ghế" value={formatVND(unitFare)} strong />
          {pct > 0 ? (
            <Text style={styles.fareNote}>* Giá ước tính áp dụng khi chuyến gần đầy chỗ.</Text>
          ) : null}
        </Card>

        {/* Booking Form Card */}
        <Card>
          <SectionHeading>Đặt chỗ trên chuyến này</SectionHeading>

          <View style={styles.stepperRow}>
            <View>
              <Text style={styles.fieldTitle}>Số lượng ghế</Text>
              <Text style={styles.fieldSub}>Còn {remainingAfterBooking} chỗ trống</Text>
            </View>
            <View style={styles.stepper}>
              <Pressable
                style={[styles.stepBtn, styles.stepBtnMinus, (seatCount <= 1 || submitting) && { opacity: 0.4 }]}
                onPress={() => adjustSeats(-1)}
                disabled={seatCount <= 1 || submitting}
                accessibilityRole="button"
                accessibilityLabel="Giảm số ghế"
              >
                <Text style={styles.stepMinusText}>−</Text>
              </Pressable>
              <Text style={styles.stepCount}>{seatCount}</Text>
              <Pressable
                style={[
                  styles.stepBtn,
                  styles.stepBtnPlus,
                  (seatCount >= maxSelectableSeats || submitting) && { opacity: 0.4 },
                ]}
                onPress={() => adjustSeats(1)}
                disabled={seatCount >= maxSelectableSeats || submitting}
                accessibilityRole="button"
                accessibilityLabel="Tăng số ghế"
              >
                <Text style={styles.stepPlusText}>+</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.inputLabel}>Điểm đón ({trip.origin}) *</Text>
          <TextInput
            style={styles.input}
            placeholder={`VD: 123 Nguyễn Văn Linh, ${trip.origin}`}
            placeholderTextColor={COLORS.slate400}
            value={pickupLabel}
            onChangeText={handlePickupChange}
            editable={!submitting}
          />

          <Text style={styles.inputLabel}>Điểm trả ({trip.destination}) *</Text>
          <TextInput
            style={styles.input}
            placeholder={`VD: 45 Lê Lợi, ${trip.destination}`}
            placeholderTextColor={COLORS.slate400}
            value={dropoffLabel}
            onChangeText={handleDropoffChange}
            editable={!submitting}
          />

          <Text style={styles.payNote}>
            Thanh toán trực tiếp cho tài xế khi lên xe. Ứng dụng chưa thu tiền trực tuyến.
          </Text>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{errorMsg}</Text>
            </View>
          ) : null}
        </Card>
      </ScrollView>

      {/* Sticky Footer */}
      <View style={styles.footer}>
        <View style={styles.footerInner}>
          <View>
            <Text style={styles.footerSub}>Tạm tính ({seatCount} chỗ)</Text>
            <Text style={styles.footerPrice}>{formatVND(totalEstimatedFare)}</Text>
          </View>
          <Pressable
            style={[
              styles.primaryBtn,
              { flex: 1 },
              (submitting || remainingAfterBooking <= 0) && { opacity: 0.5 },
            ]}
            onPress={handleConfirmBooking}
            disabled={submitting || remainingAfterBooking <= 0}
            accessibilityRole="button"
            accessibilityLabel="Xác nhận đặt vé"
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {remainingAfterBooking <= 0 ? 'Hết ghế trống' : 'Xác nhận đặt chỗ'}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: COLORS.danger, fontSize: 15 },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 28 },

  operatorRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navyBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navyBadgeText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  operatorName: { fontSize: 15, fontWeight: '700', color: COLORS.navy },
  operatorMeta: { fontSize: 12, color: COLORS.slate500, marginTop: 2 },

  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeBig: { fontSize: 22, fontWeight: '800', color: COLORS.navy },
  citySub: { fontSize: 12, color: COLORS.slate500, marginTop: 2 },
  midTimeline: { flex: 1, alignItems: 'center' },
  durationText: { fontSize: 11, color: COLORS.slate500, marginBottom: 4 },
  dashedLine: {
    width: '100%',
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.slate300,
  },

  seatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  seatRemain: { fontSize: 22, fontWeight: '800' },
  seatTotal: { fontSize: 13, fontWeight: '500', color: COLORS.slate500 },
  seatBooked: { fontSize: 12, color: COLORS.slate500 },
  progressTrack: {
    marginTop: 10,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.slate100,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },

  divider: { height: 1, backgroundColor: COLORS.line, marginVertical: 8 },
  fareNote: { fontSize: 11, color: COLORS.slate500, marginTop: 6 },

  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  fieldTitle: { fontSize: 15, fontWeight: '700', color: COLORS.navy },
  fieldSub: { fontSize: 12, color: COLORS.slate500, marginTop: 2 },
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
  stepBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  stepBtnMinus: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line },
  stepBtnPlus: { backgroundColor: COLORS.primary },
  stepMinusText: { fontSize: 18, fontWeight: '600', color: COLORS.navy },
  stepPlusText: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  stepCount: { minWidth: 22, textAlign: 'center', fontSize: 16, fontWeight: '800', color: COLORS.navy },

  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.navy, marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
    color: COLORS.navy,
  },
  payNote: { fontSize: 12, color: COLORS.slate500, marginTop: 12, lineHeight: 18 },
  errorBox: {
    marginTop: 12,
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
  },
  errorBoxText: { color: COLORS.danger, fontSize: 13, fontWeight: '500' },

  footer: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  footerInner: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  footerButtons: { flexDirection: 'row', gap: 12 },
  footerSub: { fontSize: 11, color: COLORS.slate500 },
  footerPrice: { fontSize: 19, fontWeight: '800', color: COLORS.primary },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  secondaryBtnText: { color: COLORS.navy, fontSize: 15, fontWeight: '700' },

  /* PA-10 Success */
  successScroll: {
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 24,
    alignItems: 'center',
  },
  checkOuter: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: 'rgba(22,163,74,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: '#ffffff', fontSize: 36, fontWeight: '800' },
  successHeading: { fontSize: 25, fontWeight: '800', color: COLORS.navy, marginTop: 18 },
  successSub: { fontSize: 14, color: COLORS.slate500, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  ticketCodeBox: {
    width: '100%',
    backgroundColor: COLORS.navy,
    borderRadius: 20,
    padding: 18,
    marginTop: 22,
    alignItems: 'center',
  },
  ticketCodeLabel: { color: COLORS.slate300, fontSize: 12 },
  ticketCodeValue: {
    color: COLORS.teal,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  successSummaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  successRoute: { fontSize: 16, fontWeight: '700', color: COLORS.navy },
});
