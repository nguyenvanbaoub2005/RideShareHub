/**
 * SP2-P1-04 & SP2-P2-03: 4-Step Figma Passenger Booking Flow:
 * PA-07 Chi tiết chuyến -> PA-08 Biểu mẫu đặt chỗ -> PA-09 Xác nhận đặt chỗ -> PA-10 Đặt chỗ thành công.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
  getMyBookings,
  getMyProfile,
  type LocationInput,
  type TripSearchResult,
  updateMyProfile,
} from '../../../src/api/client';
import { LocationPickerField } from '../../../src/components/LocationPickerField';
import { useAuth } from '../../../src/session/AuthContext';
import { decodeAccessTokenClaims } from '../../../src/session/jwt';
import {
  AppBar,
  BuildingGlyph,
  BusGlyph,
  CarGlyph,
  Card,
  CheckGlyph,
  ClockGlyph,
  InfoGlyph,
  KeyValueRow,
  PinGlyph,
  SectionHeading,
  StatusBadge,
} from '../../../src/components/UI';
import { COLORS, PRIMARY_SHADOW } from '../../../src/theme/tokens';
import {
  formatArrivalTime,
  formatDateLong,
  formatDateShort,
  formatDuration,
  formatSeatLabels,
  formatTimeOnly,
  formatVehicleLabel,
  formatVND,
  seatColor,
  surchargePercent,
} from '../../../src/trips/tripFormatters';

type BookingStep = 'details' | 'form' | 'confirm' | 'success';

const BOOK_CUTOFF_MINUTES = 15;

function combineLabelWithNote(label: string, note: string): string {
  const cleanLabel = label.trim();
  const cleanNote = note.trim();
  if (!cleanNote) return cleanLabel.slice(0, 500);
  return `${cleanLabel} (${cleanNote})`.slice(0, 500);
}

function formatCountdownLabel(minutesUntil: number): string {
  if (minutesUntil <= 0) return 'Đã khởi hành';
  if (minutesUntil < 60) return `Còn ${minutesUntil} phút`;
  const h = Math.floor(minutesUntil / 60);
  const m = minutesUntil % 60;
  return m > 0 ? `Còn ${h}g ${m}p` : `Còn ${h} giờ`;
}

export default function TripDetailScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { data, pax } = useLocalSearchParams<{
    tripId: string;
    data: string;
    pax?: string;
  }>();

  let trip: TripSearchResult | null = null;
  try {
    trip = data ? (JSON.parse(data) as TripSearchResult) : null;
  } catch {
    trip = null;
  }

  const parsedPax = pax ? Math.max(1, parseInt(pax, 10) || 1) : 1;

  const [step, setStep] = useState<BookingStep>('details');
  const [seatCount, setSeatCount] = useState(() =>
    trip ? Math.min(Math.max(1, trip.availableSeats), parsedPax) : 1,
  );
  const [pickupLoc, setPickupLoc] = useState<LocationInput>({ label: '' });
  const [dropoffLoc, setDropoffLoc] = useState<LocationInput>({ label: '' });
  const [pickupNote, setPickupNote] = useState('');
  const [dropoffNote, setDropoffNote] = useState('');

  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [passengerEmail, setPassengerEmail] = useState('');
  const [initialProfileName, setInitialProfileName] = useState('');
  const [initialProfilePhone, setInitialProfilePhone] = useState('');

  const [myBookings, setMyBookings] = useState<BookingRecord[]>([]);
  const [idempotencyKey, setIdempotencyKey] = useState(() => generateIdempotencyKey('book'));
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdBooking, setCreatedBooking] = useState<BookingRecord | null>(null);

  const claims = useMemo(
    () => decodeAccessTokenClaims(session?.accessToken),
    [session?.accessToken],
  );

  useEffect(() => {
    if (!session?.accessToken) return;
    Promise.allSettled([
      getMyProfile(session.accessToken),
      getMyBookings(session.accessToken),
    ]).then(([profileRes, bookingsRes]) => {
      if (bookingsRes.status === 'fulfilled') {
        setMyBookings(bookingsRes.value);
      }
      if (profileRes.status === 'fulfilled') {
        const p = profileRes.value;
        setPassengerName(p.fullName || '');
        setPassengerPhone(p.phone || '');
        setPassengerEmail(p.email || claims.email || '');
        setInitialProfileName(p.fullName || '');
        setInitialProfilePhone(p.phone || '');
      } else {
        setPassengerEmail(claims.email || '');
      }
    });
  }, [session?.accessToken, claims.email]);

  const recentPickupLocations = useMemo(() => {
    const seen = new Set<string>();
    const list: LocationInput[] = [];
    for (const b of myBookings) {
      if (b.pickup?.label && !seen.has(b.pickup.label)) {
        seen.add(b.pickup.label);
        list.push(b.pickup);
      }
    }
    return list.slice(0, 4);
  }, [myBookings]);

  const recentDropoffLocations = useMemo(() => {
    const seen = new Set<string>();
    const list: LocationInput[] = [];
    for (const b of myBookings) {
      if (b.dropoff?.label && !seen.has(b.dropoff.label)) {
        seen.add(b.dropoff.label);
        list.push(b.dropoff);
      }
    }
    return list.slice(0, 4);
  }, [myBookings]);

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

  const companyName = trip.companyName ?? trip.routeName;
  const pct = surchargePercent(trip);
  const unitFare = pct > 0 ? trip.estimatedFare : trip.fare;
  const remainingAfterBooking = createdBooking
    ? Math.max(0, trip.availableSeats - createdBooking.seatCount)
    : trip.availableSeats;
  const maxSelectableSeats = Math.max(1, remainingAfterBooking);
  const totalEstimatedFare = unitFare * seatCount;
  const totalSeats = trip.seatCapacity ?? Math.max(trip.availableSeats, 1);
  const bookedSeatsCount = Math.max(0, totalSeats - remainingAfterBooking);
  const occupancyPct = Math.min(
    100,
    Math.round((bookedSeatsCount / Math.max(totalSeats, 1)) * 100),
  );
  const arrivalTime = formatArrivalTime(trip.departureTime, trip.estimatedMinutes);
  const brandModel = [trip.vehicleBrand, trip.vehicleModel].filter(Boolean).join(' ');
  const vehicleDisplay = [brandModel || null, formatVehicleLabel(trip.vehicleType, totalSeats)]
    .filter(Boolean)
    .join(' · ');
  const hasCompanyRating = (trip.companyRatingCount ?? 0) > 0 && (trip.companyRating ?? 0) > 0;

  const minutesUntilDeparture = Math.floor(
    (new Date(trip.departureTime).getTime() - Date.now()) / 60_000,
  );
  const isClosedForBooking =
    minutesUntilDeparture < BOOK_CUTOFF_MINUTES || remainingAfterBooking <= 0;
  const bookingBlockReason =
    remainingAfterBooking <= 0
      ? 'Chuyến xe đã hết chỗ trống.'
      : minutesUntilDeparture <= 0
        ? 'Chuyến xe đã khởi hành hoặc đang diễn ra, không thể đặt chỗ.'
        : minutesUntilDeparture < BOOK_CUTOFF_MINUTES
          ? `Đã đóng nhận đặt chỗ (chỉ nhận đặt trước giờ khởi hành ít nhất ${BOOK_CUTOFF_MINUTES} phút).`
          : null;

  function adjustSeats(delta: number) {
    const next = Math.min(maxSelectableSeats, Math.max(1, seatCount + delta));
    if (next !== seatCount) {
      setSeatCount(next);
      setIdempotencyKey(generateIdempotencyKey('book'));
      setErrorMsg(null);
    }
  }

  function handlePickupChange(next: LocationInput) {
    setPickupLoc(next);
    setIdempotencyKey(generateIdempotencyKey('book'));
    if (errorMsg) setErrorMsg(null);
  }

  function handleDropoffChange(next: LocationInput) {
    setDropoffLoc(next);
    setIdempotencyKey(generateIdempotencyKey('book'));
    if (errorMsg) setErrorMsg(null);
  }

  function handleProceedToConfirm() {
    if (bookingBlockReason) {
      setErrorMsg(bookingBlockReason);
      return;
    }
    const pickup = pickupLoc.label.trim();
    const dropoff = dropoffLoc.label.trim();
    if (!pickup) {
      setErrorMsg('Vui lòng chọn hoặc ghim địa điểm đón khách trên bản đồ.');
      return;
    }
    if (!dropoff) {
      setErrorMsg('Vui lòng chọn hoặc ghim địa điểm trả khách trên bản đồ.');
      return;
    }
    if (pickup.toLowerCase() === dropoff.toLowerCase()) {
      setErrorMsg('Điểm đón và điểm trả phải khác nhau.');
      return;
    }
    if (passengerName.trim().length < 2) {
      setErrorMsg('Vui lòng nhập họ và tên hành khách.');
      return;
    }
    if (
      passengerPhone.trim() &&
      !/^(0|\+84)\d{8,10}$/.test(passengerPhone.replace(/\s+/g, ''))
    ) {
      setErrorMsg('Số điện thoại không hợp lệ (ví dụ: 0905123456).');
      return;
    }
    if (seatCount < 1 || seatCount > remainingAfterBooking) {
      setErrorMsg(`Số ghế đặt phải từ 1 đến ${remainingAfterBooking}.`);
      return;
    }
    setErrorMsg(null);
    setStep('confirm');
  }

  async function handleConfirmBooking() {
    if (!trip) return;
    if (!session?.accessToken) {
      setErrorMsg('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      return;
    }
    if (bookingBlockReason) {
      setErrorMsg(bookingBlockReason);
      return;
    }

    const finalPickupLabel = combineLabelWithNote(pickupLoc.label, pickupNote);
    const finalDropoffLabel = combineLabelWithNote(dropoffLoc.label, dropoffNote);

    setSubmitting(true);
    setErrorMsg(null);
    try {
      // Persist updated name/phone on user profile in PostgreSQL if edited
      const cleanName = passengerName.trim();
      const cleanPhone = passengerPhone.trim();
      if (
        cleanName &&
        (cleanName !== initialProfileName || cleanPhone !== initialProfilePhone)
      ) {
        await updateMyProfile(session.accessToken, {
          fullName: cleanName,
          phone: cleanPhone || null,
        }).catch(() => { });
      }

      const booking = await createBooking(
        session.accessToken,
        trip.tripId,
        {
          seatCount,
          pickup: {
            label: finalPickupLabel,
            latitude: pickupLoc.latitude ?? null,
            longitude: pickupLoc.longitude ?? null,
          },
          dropoff: {
            label: finalDropoffLabel,
            latitude: dropoffLoc.latitude ?? null,
            longitude: dropoffLoc.longitude ?? null,
          },
        },
        idempotencyKey,
      );
      setCreatedBooking(booking);
      setStep('success');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.statusCode === 409) {
          setIdempotencyKey(generateIdempotencyKey('book'));
          setErrorMsg(
            err.message ||
            'Chuyến xe không còn khả dụng hoặc không đủ số ghế bạn chọn.',
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

  /* =========================================================================
   * PA-10 Đặt chỗ thành công
   * ========================================================================= */
  if (step === 'success' && createdBooking) {
    const bookedSeatsBeforeThis = Math.max(0, totalSeats - trip.availableSeats);
    const assignedSeatList = formatSeatLabels(createdBooking.seatCount, bookedSeatsBeforeThis);
    return (
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.successScroll}>
          <View style={styles.confettiStage}>
            <View style={[styles.confettiDot, { top: 8, left: 16, backgroundColor: COLORS.teal }]} />
            <View
              style={[styles.confettiDot, { top: 24, right: 8, backgroundColor: COLORS.primary }]}
            />
            <View
              style={[styles.confettiDot, { bottom: 16, left: 6, backgroundColor: COLORS.warning }]}
            />
            <View
              style={[styles.confettiDot, { bottom: 8, right: 20, backgroundColor: COLORS.teal }]}
            />

            <View style={styles.checkOuter}>
              <View style={styles.checkMiddle}>
                <View style={styles.checkInner}>
                  <CheckGlyph size={34} color="#ffffff" />
                </View>
              </View>
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
            <SectionHeading>Tóm tắt chuyến đi</SectionHeading>
            <View style={styles.successSummaryTop}>
              <Text style={styles.successRoute}>
                {createdBooking.origin} → {createdBooking.destination}
              </Text>
              <StatusBadge status={createdBooking.status} />
            </View>
            <KeyValueRow label="Nhà xe" value={createdBooking.companyName} />
            <KeyValueRow
              label="Khởi hành"
              value={`${formatTimeOnly(createdBooking.departureTime)} · ${formatDateShort(createdBooking.departureTime)}`}
            />
            <KeyValueRow label="Ghế" value={assignedSeatList.join(', ')} />
            <KeyValueRow label="Điểm đón" value={createdBooking.pickup.label} />
            <KeyValueRow label="Điểm trả" value={createdBooking.dropoff.label} />
            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tổng cộng</Text>
              <Text style={styles.totalValue}>{formatVND(createdBooking.fareEstimate)}</Text>
            </View>
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
              style={[styles.primaryBtnWrap, { flex: 1 }]}
              onPress={() => router.replace('/(passenger)/bookings')}
            >
              <LinearGradient
                colors={['#2563eb', '#1d4ed8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>Xem chuyến của tôi</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  /* =========================================================================
   * PA-09 Xác nhận đặt chỗ
   * ========================================================================= */
  if (step === 'confirm') {
    const finalPickupLabel = combineLabelWithNote(pickupLoc.label, pickupNote);
    const finalDropoffLabel = combineLabelWithNote(dropoffLoc.label, dropoffNote);
    const bookedSeatsBeforeThis = Math.max(0, totalSeats - trip.availableSeats);
    const previewSeatList = formatSeatLabels(seatCount, bookedSeatsBeforeThis);

    return (
      <View style={styles.root}>
        <AppBar
          title="Xác nhận đặt chỗ"
          sub="Kiểm tra lại thông tin trước khi đặt"
          onBack={() => {
            setErrorMsg(null);
            setStep('form');
          }}
        />

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card>
            <SectionHeading>Tóm tắt chuyến đi</SectionHeading>
            <Text style={styles.confirmCompany}>{companyName}</Text>
            <View style={styles.timelineRow}>
              <View>
                <Text style={styles.timeBig}>{formatTimeOnly(trip.departureTime)}</Text>
                <Text style={styles.citySub}>{trip.origin}</Text>
              </View>
              <View style={styles.midTimeline}>
                <Text style={styles.durationText}>{formatDuration(trip.estimatedMinutes)}</Text>
                <View style={styles.dashRow}>
                  <View style={[styles.dot, { backgroundColor: COLORS.teal }]} />
                  <View style={styles.dashedLine} />
                  <BusGlyph size={15} color={COLORS.primary} />
                  <View style={styles.dashedLine} />
                  <View style={[styles.dot, { backgroundColor: COLORS.danger }]} />
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.timeBig}>{arrivalTime}</Text>
                <Text style={styles.citySub}>{trip.destination}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <KeyValueRow label="Ngày đi" value={formatDateLong(trip.departureTime)} />
            <KeyValueRow label="Phương tiện" value={vehicleDisplay} />
            {trip.vehiclePlate ? <KeyValueRow label="Biển số" value={trip.vehiclePlate} /> : null}
            <KeyValueRow label="Tài xế" value={trip.driverName} />
          </Card>

          <Card>
            <SectionHeading>Ghế đã chọn</SectionHeading>
            <View style={styles.seatChipRow}>
              {previewSeatList.map(seatCode => (
                <View key={seatCode} style={styles.seatSquareBadge}>
                  <Text style={styles.seatSquareText}>{seatCode}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.seatSquareNote}>
              Ghế được xếp tự động theo thứ tự còn trống.
            </Text>
          </Card>

          <Card>
            <SectionHeading>Điểm đón · trả</SectionHeading>
            <KeyValueRow label="Điểm đón" value={finalPickupLabel} />
            {pickupLoc.latitude != null && pickupLoc.longitude != null ? (
              <KeyValueRow
                label="Tọa độ GPS đón"
                value={`${pickupLoc.latitude.toFixed(5)}, ${pickupLoc.longitude.toFixed(5)}`}
              />
            ) : null}
            <View style={styles.rowSpacer} />
            <KeyValueRow label="Điểm trả" value={finalDropoffLabel} />
            {dropoffLoc.latitude != null && dropoffLoc.longitude != null ? (
              <KeyValueRow
                label="Tọa độ GPS trả"
                value={`${dropoffLoc.latitude.toFixed(5)}, ${dropoffLoc.longitude.toFixed(5)}`}
              />
            ) : null}
          </Card>

          <Card>
            <SectionHeading>Hành khách</SectionHeading>
            <KeyValueRow label="Họ và tên" value={passengerName.trim()} />
            <KeyValueRow
              label="Số điện thoại"
              value={passengerPhone.trim() || 'Chưa cập nhật'}
            />
            {passengerEmail.trim() ? (
              <KeyValueRow label="Email" value={passengerEmail.trim()} />
            ) : null}
          </Card>

          <Card>
            <SectionHeading>Giá vé dự kiến</SectionHeading>
            <KeyValueRow
              label={`${formatVND(unitFare)} × ${seatCount} chỗ`}
              value={formatVND(totalEstimatedFare)}
            />
            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tổng cộng</Text>
              <Text style={styles.totalValue}>{formatVND(totalEstimatedFare)}</Text>
            </View>
            <View style={styles.infoNoteRow}>
              <InfoGlyph size={16} color={COLORS.slate500} />
              <Text style={styles.infoNoteText}>
                Thanh toán trực tiếp cho tài xế khi lên xe. Miễn phí hủy trước giờ khởi hành ít
                nhất 30 phút.
              </Text>
            </View>
          </Card>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{errorMsg}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerButtons}>
            <Pressable
              style={styles.secondaryBtn}
              disabled={submitting}
              onPress={() => {
                setErrorMsg(null);
                setStep('form');
              }}
            >
              <Text style={styles.secondaryBtnText}>Chỉnh sửa</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtnWrap, { flex: 1 }, (submitting || isClosedForBooking) && { opacity: 0.6 }]}
              onPress={handleConfirmBooking}
              disabled={submitting || isClosedForBooking}
              accessibilityRole="button"
              accessibilityLabel="Xác nhận đặt chỗ"
            >
              <LinearGradient
                colors={['#5438f5', '#4328d6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryBtn}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Xác nhận đặt chỗ</Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  /* =========================================================================
   * PA-08 Biểu mẫu đặt chỗ
   * ========================================================================= */
  if (step === 'form') {
    return (
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <AppBar
          title="Đặt chỗ"
          sub={`${companyName} · ${formatTimeOnly(trip.departureTime)} · ${trip.origin} → ${trip.destination}`}
          onBack={() => {
            setErrorMsg(null);
            setStep('details');
          }}
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Card 1: Số chỗ */}
          <Card>
            <SectionHeading>Số chỗ</SectionHeading>
            <View style={styles.stepperRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.fieldTitle}>Số lượng chỗ</Text>
                <Text style={styles.fieldSub}>
                  Còn {remainingAfterBooking} chỗ · tối đa {maxSelectableSeats} chỗ/lần
                </Text>
              </View>
              <View style={styles.stepper}>
                <Pressable
                  style={[styles.stepBtn, styles.stepBtnMinus, seatCount <= 1 && { opacity: 0.4 }]}
                  onPress={() => adjustSeats(-1)}
                  disabled={seatCount <= 1}
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
                    seatCount >= maxSelectableSeats && { opacity: 0.4 },
                  ]}
                  onPress={() => adjustSeats(1)}
                  disabled={seatCount >= maxSelectableSeats}
                  accessibilityRole="button"
                  accessibilityLabel="Tăng số ghế"
                >
                  <Text style={styles.stepPlusText}>+</Text>
                </Pressable>
              </View>
            </View>
            {seatCount >= maxSelectableSeats ? (
              <Text style={styles.maxSeatsNote}>Đã chọn tối đa số chỗ còn trống trên chuyến.</Text>
            ) : null}
          </Card>

          {/* Card 2: Điểm đón và điểm trả + GPS preview + Chỉ dẫn */}
          <Card>
            <SectionHeading>Điểm đón và điểm trả</SectionHeading>

            <LocationPickerField
              label={`Điểm đón (${trip.origin}) *`}
              cityHint={trip.origin}
              value={pickupLoc}
              onChange={handlePickupChange}
              recentLocations={recentPickupLocations}
            />

            {pickupLoc.label ? (
              <View style={styles.gpsPreviewCard}>
                <Text style={styles.gpsPreviewAddress}>{pickupLoc.label}</Text>
                {pickupLoc.latitude != null && pickupLoc.longitude != null ? (
                  <Text style={styles.gpsPreviewCoords}>
                    GPS: {pickupLoc.latitude.toFixed(6)}, {pickupLoc.longitude.toFixed(6)}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <Text style={styles.noteInputLabel}>Chỉ dẫn điểm đón (không bắt buộc)</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Ví dụ: đứng trước cổng, gọi trước 5 phút..."
              placeholderTextColor={COLORS.slate400}
              value={pickupNote}
              onChangeText={setPickupNote}
              maxLength={120}
            />

            <View style={styles.formFieldGap} />

            <LocationPickerField
              label={`Điểm trả (${trip.destination}) *`}
              cityHint={trip.destination}
              value={dropoffLoc}
              onChange={handleDropoffChange}
              recentLocations={recentDropoffLocations}
            />

            {dropoffLoc.label ? (
              <View style={styles.gpsPreviewCard}>
                <Text style={styles.gpsPreviewAddress}>{dropoffLoc.label}</Text>
                {dropoffLoc.latitude != null && dropoffLoc.longitude != null ? (
                  <Text style={styles.gpsPreviewCoords}>
                    GPS: {dropoffLoc.latitude.toFixed(6)}, {dropoffLoc.longitude.toFixed(6)}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <Text style={styles.noteInputLabel}>Chỉ dẫn điểm trả (không bắt buộc)</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Ví dụ: xuống ngay ngã tư, gần cổng bệnh viện..."
              placeholderTextColor={COLORS.slate400}
              value={dropoffNote}
              onChangeText={setDropoffNote}
              maxLength={120}
            />
          </Card>

          {/* Card 3: Thông tin hành khách (matching Figma PA-08!) */}
          <Card>
            <SectionHeading>Thông tin hành khách</SectionHeading>

            <Text style={styles.inputLabel}>Họ và tên *</Text>
            <TextInput
              style={styles.formTextInput}
              placeholder="Nguyễn Minh Anh"
              placeholderTextColor={COLORS.slate400}
              value={passengerName}
              onChangeText={setPassengerName}
            />

            <Text style={styles.inputLabel}>Số điện thoại liên hệ</Text>
            <TextInput
              style={styles.formTextInput}
              placeholder="0905 123 456"
              placeholderTextColor={COLORS.slate400}
              keyboardType="phone-pad"
              value={passengerPhone}
              onChangeText={setPassengerPhone}
            />

            <Text style={styles.inputLabel}>Email tài khoản</Text>
            <TextInput
              style={[styles.formTextInput, styles.formTextInputReadonly]}
              value={passengerEmail}
              editable={false}
            />

            <Text style={styles.payNote}>
              • Chính sách hủy vé: miễn phí hủy trước giờ khởi hành ít nhất 30 phút.
            </Text>
          </Card>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{errorMsg}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerEstimateRow}>
            <Text style={styles.footerSub}>Tạm tính ({seatCount} chỗ)</Text>
            <Text style={styles.footerPrice}>{formatVND(totalEstimatedFare)}</Text>
          </View>
          <Pressable
            onPress={handleProceedToConfirm}
            style={styles.primaryBtnWrap}
            accessibilityRole="button"
            accessibilityLabel="Xem lại đặt chỗ"
          >
            <LinearGradient
              colors={['#5438f5', '#4328d6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>Xem lại đặt chỗ</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  /* =========================================================================
   * PA-07 Chi tiết chuyến đi
   * ========================================================================= */
  return (
    <View style={styles.root}>
      <AppBar
        title="Chi tiết chuyến"
        sub={`${trip.origin} → ${trip.destination}`}
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Company Card */}
        <Card>
          <View style={styles.operatorRow}>
            <View style={styles.navyBadge}>
              <BuildingGlyph size={22} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.operatorName} numberOfLines={1}>
                {companyName}
              </Text>
              <Text style={styles.operatorMeta} numberOfLines={1}>
                {hasCompanyRating
                  ? `★ ${Number(trip.companyRating).toFixed(1)} (${trip.companyRatingCount} đánh giá) · `
                  : ''}
                Tài xế {trip.driverName} · {trip.routeName}
              </Text>
            </View>
            <StatusBadge status="COMPLETED" label="Đã xác minh" />
          </View>
        </Card>

        {/* Schedule Card */}
        <Card>
          <View style={styles.scheduleHeadRow}>
            <Text style={styles.scheduleSectionTitle}>
              {`Lịch trình · ${formatDateLong(trip.departureTime)}`.toUpperCase()}
            </Text>
            <View
              style={[
                styles.countdownPill,
                isClosedForBooking && { backgroundColor: COLORS.dangerSoft },
              ]}
            >
              <ClockGlyph
                size={12}
                color={isClosedForBooking ? COLORS.danger : COLORS.primary}
              />
              <Text
                style={[
                  styles.countdownText,
                  isClosedForBooking && { color: COLORS.danger },
                ]}
              >
                {formatCountdownLabel(minutesUntilDeparture)}
              </Text>
            </View>
          </View>
          <View style={styles.timelineRow}>
            <View>
              <Text style={styles.timeBig}>{formatTimeOnly(trip.departureTime)}</Text>
              <Text style={styles.citySub}>{trip.origin}</Text>
            </View>
            <View style={styles.midTimeline}>
              <Text style={styles.durationText}>{formatDuration(trip.estimatedMinutes)}</Text>
              <View style={styles.dashRow}>
                <View style={[styles.dot, { backgroundColor: COLORS.teal }]} />
                <View style={styles.dashedLine} />
                <BusGlyph size={16} color={COLORS.primary} />
                <View style={styles.dashedLine} />
                <View style={[styles.dot, { backgroundColor: COLORS.danger }]} />
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.timeBig}>{arrivalTime}</Text>
              <Text style={styles.citySub}>{trip.destination}</Text>
            </View>
          </View>
        </Card>

        {/* Vehicle Card */}
        <Card>
          <SectionHeading>Phương tiện</SectionHeading>
          <View style={styles.operatorRow}>
            <View style={styles.vehicleIconBox}>
              <CarGlyph size={21} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.vehicleName}>{vehicleDisplay}</Text>
              <Text style={styles.operatorMeta}>
                {trip.vehiclePlate ? `Biển số ${trip.vehiclePlate}` : 'Xe ghép liên tỉnh'}
              </Text>
            </View>
          </View>
          <View style={styles.featureChipsRow}>
            {[
              `${totalSeats} chỗ tiêu chuẩn`,
              'Đón trả theo điểm ghim',
              'Đặt trước 15 phút',
              'Hủy trước 30 phút',
            ].map(tag => (
              <View key={tag} style={styles.featureChip}>
                <Text style={styles.featureChipText}>{tag}</Text>
              </View>
            ))}
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
            <Text style={styles.seatBooked}>Đã đặt {bookedSeatsCount}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${occupancyPct}%` }]} />
          </View>
        </Card>

        {/* Route Stops & Pickup/Dropoff Policy Card */}
        <Card>
          <SectionHeading>Lộ trình &amp; đón trả</SectionHeading>
          <View style={styles.stopTimelineItem}>
            <View style={[styles.stopPinCircle, { backgroundColor: COLORS.tealSoft }]}>
              <PinGlyph size={16} color={COLORS.tealDark} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.stopHeaderRow}>
                <Text style={styles.stopTitle}>Xuất phát tại {trip.origin}</Text>
                <Text style={styles.stopTime}>{formatTimeOnly(trip.departureTime)}</Text>
              </View>
              <Text style={styles.stopSub}>
                Hỗ trợ chọn điểm đón linh hoạt bằng tìm kiếm hoặc ghim trực tiếp trên bản đồ.
              </Text>
            </View>
          </View>

          <View style={styles.stopVerticalLine} />

          <View style={styles.stopTimelineItem}>
            <View style={[styles.stopPinCircle, { backgroundColor: COLORS.dangerSoft }]}>
              <PinGlyph size={16} color={COLORS.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.stopHeaderRow}>
                <Text style={styles.stopTitle}>Trả khách tại {trip.destination}</Text>
                <Text style={styles.stopTime}>{arrivalTime}</Text>
              </View>
              <Text style={styles.stopSub}>
                Dự kiến di chuyển {formatDuration(trip.estimatedMinutes)} · Điểm trả do bạn chọn ở
                bước tiếp theo.
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>

      {/* PA-07 Sticky Footer */}
      <View style={styles.footer}>
        {bookingBlockReason ? (
          <View style={styles.blockAlertBanner}>
            <InfoGlyph size={15} color={COLORS.danger} />
            <Text style={styles.blockAlertText}>{bookingBlockReason}</Text>
          </View>
        ) : null}

        <View style={styles.footerInner}>
          <View>
            <Text style={styles.footerSub}>Giá mỗi chỗ</Text>
            {pct > 0 ? <Text style={styles.baseStrike}>{formatVND(trip.fare)}</Text> : null}
            <Text style={styles.footerPrice}>{formatVND(unitFare)}</Text>
          </View>
          <Pressable
            style={[
              styles.primaryBtnWrap,
              { flex: 1 },
              isClosedForBooking && { opacity: 0.45 },
            ]}
            onPress={() => {
              setErrorMsg(null);
              setStep('form');
            }}
            disabled={isClosedForBooking}
            accessibilityRole="button"
            accessibilityLabel="Đặt chỗ"
          >
            <LinearGradient
              colors={isClosedForBooking ? ['#94a3b8', '#64748b'] : ['#5438f5', '#4328d6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>
                {remainingAfterBooking <= 0
                  ? 'Hết chỗ'
                  : isClosedForBooking
                    ? 'Đã đóng đặt chỗ'
                    : 'Đặt chỗ'}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: COLORS.danger, fontSize: 15 },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 32 },

  operatorRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navyBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  operatorName: { fontSize: 16, fontWeight: '700', color: COLORS.navy },
  operatorMeta: { fontSize: 12, color: COLORS.slate500, marginTop: 2 },

  scheduleHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  scheduleSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: COLORS.slate500,
    flex: 1,
  },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  countdownText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },

  vehicleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleName: { fontSize: 15, fontWeight: '700', color: COLORS.navy },
  featureChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  featureChip: {
    backgroundColor: COLORS.slate100,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
  },
  featureChipText: { fontSize: 11, fontWeight: '600', color: COLORS.slate600 },

  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeBig: { fontSize: 22, fontWeight: '800', color: COLORS.navy },
  citySub: { fontSize: 12, color: COLORS.slate500, marginTop: 2 },
  midTimeline: { flex: 1, alignItems: 'center' },
  durationText: { fontSize: 11, color: COLORS.slate500, marginBottom: 4 },
  dashRow: { flexDirection: 'row', alignItems: 'center', gap: 4, width: '100%' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dashedLine: {
    flex: 1,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.slate300,
  },

  seatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  seatRemain: { fontSize: 23, fontWeight: '800' },
  seatTotal: { fontSize: 13, fontWeight: '500', color: COLORS.slate500 },
  seatBooked: { fontSize: 12, color: COLORS.slate500, fontWeight: '600' },
  progressTrack: {
    marginTop: 10,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.slate100,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },

  stopTimelineItem: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stopPinCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stopHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  stopTitle: { fontSize: 14, fontWeight: '700', color: COLORS.navy, flex: 1 },
  stopTime: { fontSize: 12, fontWeight: '700', color: COLORS.slate500 },
  stopSub: { fontSize: 12, color: COLORS.slate500, marginTop: 3, lineHeight: 17 },
  stopVerticalLine: {
    marginLeft: 16,
    height: 18,
    borderLeftWidth: 2,
    borderStyle: 'dotted',
    borderColor: COLORS.slate300,
    marginVertical: 4,
  },

  /* PA-08 Form */
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldTitle: { fontSize: 15, fontWeight: '700', color: COLORS.navy },
  fieldSub: { fontSize: 12, color: COLORS.slate500, marginTop: 2 },
  maxSeatsNote: { fontSize: 12, color: COLORS.warningText, marginTop: 10, fontWeight: '600' },
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
  stepBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  stepBtnMinus: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: '#e2e8f0' },
  stepBtnPlus: { backgroundColor: COLORS.primary },
  stepMinusText: { fontSize: 18, fontWeight: '600', color: COLORS.navy },
  stepPlusText: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  stepCount: { minWidth: 22, textAlign: 'center', fontSize: 16, fontWeight: '800', color: COLORS.navy },

  gpsPreviewCard: {
    marginTop: -6,
    marginBottom: 12,
    backgroundColor: COLORS.canvas,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  gpsPreviewAddress: { fontSize: 13, fontWeight: '600', color: COLORS.navy, lineHeight: 18 },
  gpsPreviewCoords: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: COLORS.primary,
    marginTop: 4,
    fontWeight: '700',
  },
  noteInputLabel: { fontSize: 12, fontWeight: '600', color: COLORS.slate600, marginBottom: 6 },
  noteInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: COLORS.canvas,
    paddingHorizontal: 14,
    fontSize: 14,
    color: COLORS.navy,
  },
  formFieldGap: { height: 18 },

  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.navy, marginBottom: 6, marginTop: 10 },
  formTextInput: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.navy,
  },
  formTextInputReadonly: {
    backgroundColor: COLORS.slate100,
    color: COLORS.slate500,
  },

  /* PA-09 Confirm */
  confirmCompany: { fontSize: 16, fontWeight: '800', color: COLORS.navy, marginBottom: 10 },
  seatChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  seatSquareBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatSquareText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  seatSquareNote: { fontSize: 12, color: COLORS.slate500, marginTop: 10 },
  rowSpacer: { height: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 15, fontWeight: '700', color: COLORS.navy },
  totalValue: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  infoNoteRow: { flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'flex-start' },
  infoNoteText: { flex: 1, fontSize: 12, color: COLORS.slate500, lineHeight: 17 },

  divider: { height: 1, backgroundColor: '#edf1f7', marginVertical: 10 },
  payNote: { fontSize: 12, color: COLORS.slate500, marginTop: 12, lineHeight: 18 },
  errorBox: {
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
  },
  errorBoxText: { color: COLORS.danger, fontSize: 13, fontWeight: '600' },

  blockAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.dangerSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
  },
  blockAlertText: { flex: 1, fontSize: 12, fontWeight: '600', color: COLORS.danger },

  footer: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: '#edf1f7',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  footerInner: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  footerEstimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  footerButtons: { flexDirection: 'row', gap: 12 },
  footerSub: { fontSize: 12, color: COLORS.slate500 },
  baseStrike: {
    fontSize: 12,
    color: COLORS.slate400,
    textDecorationLine: 'line-through',
  },
  footerPrice: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  primaryBtnWrap: { ...PRIMARY_SHADOW, borderRadius: 14 },
  primaryBtn: {
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  secondaryBtnText: { color: COLORS.navy, fontSize: 15, fontWeight: '700' },

  /* PA-10 Success */
  successScroll: {
    paddingHorizontal: 18,
    paddingTop: 56,
    paddingBottom: 24,
    alignItems: 'center',
  },
  confettiStage: {
    width: 148,
    height: 148,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  confettiDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  checkOuter: {
    width: 124,
    height: 124,
    borderRadius: 62,
    backgroundColor: 'rgba(22,163,74,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMiddle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(22,163,74,0.2)',
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
    shadowColor: COLORS.success,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  successHeading: { fontSize: 25, fontWeight: '800', color: COLORS.navy, marginTop: 12 },
  successSub: {
    fontSize: 14,
    color: COLORS.slate500,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  ticketCodeBox: {
    width: '100%',
    backgroundColor: COLORS.navy,
    borderRadius: 20,
    padding: 18,
    marginTop: 20,
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
