import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { DriverTripSummary } from '../../../src/api/client';
import { AppBar, Card, KeyValueRow, SectionHeading, StatusBadge } from '../../../src/components/UI';
import { COLORS } from '../../../src/theme/tokens';
import { formatDeparture, formatVND } from '../../../src/trips/tripFormatters';

export default function DriverTripDetailScreen() {
  const router = useRouter();
  const { tripId, data } = useLocalSearchParams<{ tripId: string; data?: string }>();

  let trip: DriverTripSummary | null = null;
  try {
    trip = data ? (JSON.parse(data) as DriverTripSummary) : null;
  } catch {
    trip = null;
  }

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

            <View style={styles.infoBanner}>
              <Text style={styles.infoTitle}>Thao tác thực hiện chuyến (Sprint 3)</Text>
              <Text style={styles.infoBody}>
                Nhận chuyến, bắt đầu hành trình và cập nhật điểm đón/trả sẽ được kích hoạt ở giai đoạn tiếp theo.
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
