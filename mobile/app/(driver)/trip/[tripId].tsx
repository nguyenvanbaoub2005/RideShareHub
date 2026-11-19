import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  getTripBookings,
  type BookingRecord,
  type DriverTripSummary,
} from '../../../src/api/client';
import {
  AppBar,
  Card,
  KeyValueRow,
  PinGlyph,
  SectionHeading,
  StatusBadge,
} from '../../../src/components/UI';
import { useAuth } from '../../../src/session/AuthContext';
import { COLORS } from '../../../src/theme/tokens';
import { formatDeparture, formatVND } from '../../../src/trips/tripFormatters';

export default function DriverTripDetailScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { tripId, data } = useLocalSearchParams<{ tripId: string; data?: string }>();

  let trip: DriverTripSummary | null = null;
  try {
    trip = data ? (JSON.parse(data) as DriverTripSummary) : null;
  } catch {
    trip = null;
  }

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  useEffect(() => {
    const idNum = Number(tripId ?? trip?.id);
    if (!session?.accessToken || !idNum) return;
    setLoadingBookings(true);
    getTripBookings(session.accessToken, idNum)
      .then(list => setBookings(list.filter(b => b.status !== 'CANCELLED')))
      .catch(() => {})
      .finally(() => setLoadingBookings(false));
  }, [session?.accessToken, tripId, trip?.id]);

  return (
    <View style={styles.root}>
      <AppBar
        title={`Chi tiết chuyến #${tripId ?? ''}`}
        sub={trip ? `${trip.origin} → ${trip.destination}` : undefined}
        onBack={() => router.back()}
        right={trip ? <StatusBadge status={trip.status} /> : undefined}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {!trip ? (
          <Card>
            <Text style={styles.emptyText}>Không tìm thấy dữ liệu chuyến xe.</Text>
          </Card>
        ) : (
          <>
            <View style={styles.navyHero}>
              <Text style={styles.heroEyebrow}>Hành trình được phân công</Text>
              <Text style={styles.heroRoute}>
                {trip.origin} → {trip.destination}
              </Text>
              <Text style={styles.heroTime}>{formatDeparture(trip.departureTime)}</Text>
            </View>

            <Card>
              <SectionHeading>Thông tin vận hành</SectionHeading>
              <KeyValueRow label="Tuyến đường" value={trip.routeName ?? `${trip.origin} → ${trip.destination}`} />
              <KeyValueRow label="Biển số xe" value={trip.vehiclePlate} strong />
              {trip.vehicleType ? <KeyValueRow label="Loại xe" value={trip.vehicleType} /> : null}
              <KeyValueRow label="Hành khách đã đặt" value={`${trip.bookedSeats ?? 0} / ${trip.seatCapacity} khách`} />
              {trip.estimatedMinutes ? (
                <KeyValueRow label="Thời gian dự kiến" value={`~${trip.estimatedMinutes} phút`} />
              ) : null}
              {trip.fare != null ? <KeyValueRow label="Giá vé niêm yết" value={formatVND(trip.fare)} /> : null}
            </Card>

            {trip.note ? (
              <Card>
                <SectionHeading>Ghi chú từ nhà xe</SectionHeading>
                <Text style={styles.noteText}>{trip.note}</Text>
              </Card>
            ) : null}

            <Card>
              <SectionHeading>
                {`Danh sách điểm đón / trả hành khách (${bookings.length})`}
              </SectionHeading>
              {loadingBookings ? (
                <ActivityIndicator color={COLORS.primary} style={{ paddingVertical: 12 }} />
              ) : bookings.length === 0 ? (
                <Text style={styles.emptyText}>
                  Chưa có hành khách đặt chỗ trên chuyến xe này.
                </Text>
              ) : (
                <View style={{ gap: 12 }}>
                  {bookings.map((b, idx) => (
                    <View key={b.id} style={styles.paxCard}>
                      <View style={styles.paxTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.paxName}>
                            {idx + 1}. {b.passengerName} ({b.seatCount} ghế)
                          </Text>
                          <Text style={styles.paxCode}>
                            Mã vé: {b.bookingCode}
                            {b.passengerPhone ? ` · ${b.passengerPhone}` : ''}
                          </Text>
                        </View>
                        <StatusBadge status={b.status} />
                      </View>
                      <View style={styles.stopRow}>
                        <PinGlyph size={14} color={COLORS.tealDark} />
                        <Text style={styles.stopText}>Đón: {b.pickup?.label ?? '—'}</Text>
                      </View>
                      <View style={styles.stopRow}>
                        <PinGlyph size={14} color={COLORS.danger} />
                        <Text style={styles.stopText}>Trả: {b.dropoff?.label ?? '—'}</Text>
                      </View>
                      {b.passengerPhone ? (
                        <Pressable
                          style={styles.callPaxBtn}
                          onPress={() => Linking.openURL(`tel:${b.passengerPhone}`)}
                        >
                          <Text style={styles.callPaxText}>Gọi hành khách: {b.passengerPhone}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
            </Card>

            <View style={styles.infoBanner}>
              <Text style={styles.infoTitle}>Thao tác thực hiện chuyến (Sprint 3)</Text>
              <Text style={styles.infoBody}>
                Nhận chuyến, bắt đầu hành trình, tối ưu thứ tự đón/trả và cập nhật GPS realtime sẽ được kích hoạt ở Sprint 3.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.canvas },
  content: { padding: 16, gap: 14, paddingBottom: 36 },
  navyHero: {
    backgroundColor: COLORS.navy,
    borderRadius: 20,
    padding: 20,
  },
  heroEyebrow: { color: COLORS.teal, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  heroRoute: { color: '#ffffff', fontSize: 22, fontWeight: '800', marginTop: 6 },
  heroTime: { color: COLORS.slate300, fontSize: 14, marginTop: 6 },
  noteText: { color: COLORS.navy, fontSize: 14, lineHeight: 20 },
  paxCard: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 12,
    gap: 8,
    backgroundColor: COLORS.canvas,
  },
  paxTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  paxName: { color: COLORS.navy, fontSize: 14, fontWeight: '700' },
  paxCode: { color: COLORS.slate500, fontSize: 12, marginTop: 2 },
  stopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  stopText: { flex: 1, color: COLORS.navy, fontSize: 13, lineHeight: 18 },
  callPaxBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.primarySoft,
  },
  callPaxText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  infoBanner: {
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 16,
    padding: 16,
  },
  infoTitle: { color: COLORS.primaryDark, fontSize: 13, fontWeight: '700' },
  infoBody: { color: COLORS.navy, fontSize: 13, marginTop: 4, lineHeight: 19 },
  emptyText: { color: COLORS.slate500, fontSize: 14, textAlign: 'center', paddingVertical: 16 },
});
