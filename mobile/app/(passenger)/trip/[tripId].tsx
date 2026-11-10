/**
 * SP2-P1-04: Trip detail screen — fare breakdown and seat info.
 * SP2-P2-03: Booking creation panel — select seatCount, pickup/dropoff,
 *            confirm booking with Idempotency-Key and navigate to My Bookings.
 *
 * Route: /(passenger)/trip/[tripId]?data=<JSON TripSearchResult>
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ApiError,
  BookingRecord,
  createBooking,
  generateIdempotencyKey,
  type TripSearchResult,
} from '../../../src/api/client';
import { useAuth } from '../../../src/session/AuthContext';
import {
  formatDeparture,
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

  const [seatCount, setSeatCount] = useState<number>(1);
  const [pickupLabel, setPickupLabel] = useState<string>('');
  const [dropoffLabel, setDropoffLabel] = useState<string>('');
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() =>
    generateIdempotencyKey('book'),
  );
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdBooking, setCreatedBooking] = useState<BookingRecord | null>(null);

  if (!trip) {
    return (
      <View style={styles.root}>
        <Pressable onPress={() => router.back()} style={styles.backRow}>
          <Text style={styles.back}>← Quay lại</Text>
        </Pressable>
        <Text style={styles.errorText}>Không tải được thông tin chuyến xe.</Text>
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
          // Rotate idempotency key on capacity conflict so user can adjust seat count and retry
          setIdempotencyKey(generateIdempotencyKey('book'));
          setErrorMsg(
            err.message ||
              'Chuyến xe không còn đủ số ghế bạn chọn. Vui lòng giảm số ghế hoặc chọn chuyến khác.',
          );
        } else {
          setErrorMsg(err.message);
        }
      } else {
        // Keep the same idempotencyKey so network retry is safe against duplicate bookings
        setErrorMsg('Không thể kết nối máy chủ. Bạn có thể bấm xác nhận lại an toàn.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Back */}
      <Pressable onPress={() => router.back()} style={styles.backRow}>
        <Text style={styles.back}>← Kết quả tìm kiếm</Text>
      </Pressable>

      {/* Route hero */}
      <View style={styles.heroCard}>
        <Text style={styles.heroRoute}>
          {trip.origin} → {trip.destination}
        </Text>
        <Text style={styles.heroName}>{trip.routeName}</Text>
        <Text style={styles.heroDep}>{formatDeparture(trip.departureTime)}</Text>
      </View>

      {/* Info rows */}
      <View style={styles.section}>
        <InfoRow label="Tài xế" value={trip.driverName} icon="👤" />
        <InfoRow label="Loại xe" value={trip.vehicleType} icon="🚌" />
        <InfoRow label="Thời gian dự kiến" value={`~${trip.estimatedMinutes} phút`} icon="⏱" />
        <InfoRow
          label="Ghế còn trống"
          value={`${remainingAfterBooking} ghế`}
          icon="💺"
          valueColor={seatColor(remainingAfterBooking)}
        />
      </View>

      {/* Fare card */}
      <View style={styles.fareCard}>
        <Text style={styles.fareTitle}>Thông tin giá vé</Text>
        <View style={styles.fareRow}>
          <Text style={styles.fareLabel}>Giá niêm yết / ghế</Text>
          <Text style={styles.fareValue}>{formatVND(trip.fare)}</Text>
        </View>
        {pct > 0 ? (
          <>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Phụ thu nhu cầu cao</Text>
              <Text style={styles.surchargeValue}>+{pct}%</Text>
            </View>
            <View style={[styles.fareRow, styles.fareTotal]}>
              <Text style={styles.fareTotalLabel}>Đơn giá ước tính / ghế</Text>
              <Text style={styles.fareTotalValue}>{formatVND(trip.estimatedFare)}</Text>
            </View>
            <Text style={styles.fareNote}>
              * Giá ước tính áp dụng khi chuyến gần đầy chỗ.
            </Text>
          </>
        ) : (
          <View style={[styles.fareRow, styles.fareTotal]}>
            <Text style={styles.fareTotalLabel}>Đơn giá áp dụng / ghế</Text>
            <Text style={styles.fareTotalValue}>{formatVND(trip.fare)}</Text>
          </View>
        )}
      </View>

      {/* SP2-P2-03: Booking Form or Confirmation Result */}
      {createdBooking ? (
        <View style={styles.successCard}>
          <Text style={styles.successBadge}>✅ ĐẶT VÉ THÀNH CÔNG</Text>
          <Text style={styles.successCode}>Mã vé: {createdBooking.bookingCode}</Text>
          <Text style={styles.successMeta}>
            Trạng thái: {createdBooking.status} • {createdBooking.seatCount} ghế
          </Text>
          <Text style={styles.successMeta}>
            Đón: {createdBooking.pickup.label}
          </Text>
          <Text style={styles.successMeta}>
            Trả: {createdBooking.dropoff.label}
          </Text>
          <Text style={styles.successFare}>
            Tổng cước: {formatVND(createdBooking.fareEstimate)}
          </Text>

          <Pressable
            style={styles.manageBtn}
            onPress={() => router.push('/(passenger)/bookings')}
            accessibilityRole="button"
            accessibilityLabel="Xem và quản lý vé đã đặt"
          >
            <Text style={styles.manageBtnText}>🎫 Xem danh sách vé / Hủy vé</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.bookingCard}>
          <Text style={styles.bookingTitle}>Đặt chỗ trên chuyến này</Text>

          {/* Seat count stepper */}
          <View style={styles.stepperRow}>
            <Text style={styles.fieldLabel}>Số lượng ghế</Text>
            <View style={styles.stepperControls}>
              <Pressable
                style={[
                  styles.stepBtn,
                  (seatCount <= 1 || submitting) && styles.stepBtnDisabled,
                ]}
                onPress={() => adjustSeats(-1)}
                disabled={seatCount <= 1 || submitting}
                accessibilityRole="button"
                accessibilityLabel="Giảm số ghế"
              >
                <Text style={styles.stepBtnText}>−</Text>
              </Pressable>
              <Text style={styles.seatCountValue}>{seatCount}</Text>
              <Pressable
                style={[
                  styles.stepBtn,
                  (seatCount >= maxSelectableSeats || submitting) &&
                    styles.stepBtnDisabled,
                ]}
                onPress={() => adjustSeats(1)}
                disabled={seatCount >= maxSelectableSeats || submitting}
                accessibilityRole="button"
                accessibilityLabel="Tăng số ghế"
              >
                <Text style={styles.stepBtnText}>+</Text>
              </Pressable>
            </View>
          </View>

          {/* Pickup Input */}
          <Text style={styles.inputLabel}>Điểm đón ({trip.origin})</Text>
          <TextInput
            style={styles.input}
            placeholder={`VD: 123 Nguyễn Văn Linh, ${trip.origin}`}
            placeholderTextColor="#475569"
            value={pickupLabel}
            onChangeText={handlePickupChange}
            editable={!submitting}
          />

          {/* Dropoff Input */}
          <Text style={styles.inputLabel}>Điểm trả ({trip.destination})</Text>
          <TextInput
            style={styles.input}
            placeholder={`VD: 45 Lê Lợi, ${trip.destination}`}
            placeholderTextColor="#475569"
            value={dropoffLabel}
            onChangeText={handleDropoffChange}
            editable={!submitting}
          />

          {/* Total Fare Preview */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              Tổng tạm tính ({seatCount} ghế)
            </Text>
            <Text style={styles.totalAmount}>
              {formatVND(totalEstimatedFare)}
            </Text>
          </View>

          {/* Error Banner */}
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>⚠️ {errorMsg}</Text>
            </View>
          ) : null}

          {/* Confirm Button */}
          <Pressable
            style={[
              styles.confirmBtn,
              (submitting || remainingAfterBooking <= 0) &&
                styles.confirmBtnDisabled,
            ]}
            onPress={handleConfirmBooking}
            disabled={submitting || remainingAfterBooking <= 0}
            accessibilityRole="button"
            accessibilityLabel="Xác nhận đặt vé"
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmBtnText}>
                {remainingAfterBooking <= 0
                  ? 'Hết ghế trống'
                  : 'Xác nhận đặt vé'}
              </Text>
            )}
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function InfoRow({
  label,
  value,
  icon,
  valueColor,
}: {
  label: string;
  value: string;
  icon: string;
  valueColor?: string;
}) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.icon}>{icon}</Text>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={[infoStyles.value, valueColor ? { color: valueColor } : {}]}>
        {value}
      </Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  icon: { fontSize: 18, marginRight: 10 },
  label: { flex: 1, color: '#94a3b8', fontSize: 14 },
  value: { color: '#f1f5f9', fontSize: 14, fontWeight: '600' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  content: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 48 },
  backRow: { marginBottom: 20 },
  back: { color: '#6366f1', fontSize: 14 },
  errorText: { color: '#ef4444', textAlign: 'center', marginTop: 48 },

  heroCard: {
    backgroundColor: '#6366f1',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
  },
  heroRoute: { color: '#fff', fontSize: 22, fontWeight: '800' },
  heroName: { color: '#c7d2fe', fontSize: 13, marginTop: 4 },
  heroDep: { color: '#e0e7ff', fontSize: 15, marginTop: 10, fontWeight: '600' },

  section: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    paddingHorizontal: 20,
    marginBottom: 20,
  },

  fareCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  fareTitle: { color: '#f1f5f9', fontSize: 16, fontWeight: '700', marginBottom: 16 },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  fareLabel: { color: '#94a3b8', fontSize: 14 },
  fareValue: { color: '#f1f5f9', fontSize: 14 },
  surchargeValue: { color: '#f59e0b', fontSize: 14, fontWeight: '600' },
  fareTotal: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10,
    marginTop: 4,
  },
  fareTotalLabel: { color: '#f1f5f9', fontSize: 15, fontWeight: '700' },
  fareTotalValue: { color: '#6366f1', fontSize: 18, fontWeight: '800' },
  fareNote: { color: '#64748b', fontSize: 11, lineHeight: 16, marginTop: 8 },

  bookingCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  bookingTitle: {
    color: '#f1f5f9',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 16,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  fieldLabel: { color: '#cbd5e1', fontSize: 14, fontWeight: '600' },
  stepperControls: { flexDirection: 'row', alignItems: 'center' },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: { opacity: 0.4 },
  stepBtnText: { color: '#f1f5f9', fontSize: 18, fontWeight: '700' },
  seatCountValue: {
    color: '#f1f5f9',
    fontSize: 17,
    fontWeight: '800',
    minWidth: 36,
    textAlign: 'center',
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f1f5f9',
    fontSize: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  totalLabel: { color: '#cbd5e1', fontSize: 14, fontWeight: '600' },
  totalAmount: { color: '#10b981', fontSize: 19, fontWeight: '800' },
  errorBox: {
    backgroundColor: '#450a0a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  errorBoxText: { color: '#fca5a5', fontSize: 13, lineHeight: 18 },
  confirmBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  successCard: {
    backgroundColor: '#064e3b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  successBadge: { color: '#34d399', fontSize: 14, fontWeight: '800', marginBottom: 8 },
  successCode: { color: '#ecfdf5', fontSize: 18, fontWeight: '800', marginBottom: 6 },
  successMeta: { color: '#a7f3d0', fontSize: 13, marginBottom: 4 },
  successFare: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 16,
  },
  manageBtn: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  manageBtnText: { color: '#064e3b', fontSize: 14, fontWeight: '800' },
});
