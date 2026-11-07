/**
 * SP2-P1-04: Trip detail screen — fare breakdown and seat info.
 *
 * Route: /(passenger)/trip/[tripId]?data=<JSON TripSearchResult>
 * Data is passed as serialised JSON to avoid a second API call.
 * A future slice (SP2-P2-03) will add the Booking action here.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { TripSearchResult } from '../../../src/api/client';
import {
  formatDeparture,
  formatVND,
  seatColor,
  surchargePercent,
} from '../../../src/trips/tripFormatters';

export default function TripDetailScreen() {
  const router = useRouter();
  const { data } = useLocalSearchParams<{ tripId: string; data: string }>();

  let trip: TripSearchResult | null = null;
  try {
    trip = data ? (JSON.parse(data) as TripSearchResult) : null;
  } catch {
    trip = null;
  }

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

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
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
          value={`${trip.availableSeats} ghế`}
          icon="💺"
          valueColor={seatColor(trip.availableSeats)}
        />
      </View>

      {/* Fare card */}
      <View style={styles.fareCard}>
        <Text style={styles.fareTitle}>Thông tin giá vé</Text>
        <View style={styles.fareRow}>
          <Text style={styles.fareLabel}>Giá niêm yết</Text>
          <Text style={styles.fareValue}>{formatVND(trip.fare)}</Text>
        </View>
        {pct > 0 ? (
          <>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Phụ thu nhu cầu cao</Text>
              <Text style={styles.surchargeValue}>+{pct}%</Text>
            </View>
            <View style={[styles.fareRow, styles.fareTotal]}>
              <Text style={styles.fareTotalLabel}>Giá ước tính</Text>
              <Text style={styles.fareTotalValue}>{formatVND(trip.estimatedFare)}</Text>
            </View>
            <Text style={styles.fareNote}>
              * Giá ước tính áp dụng khi chuyến gần đầy chỗ.
                Giá chính thức xác nhận khi đặt vé.
            </Text>
          </>
        ) : (
          <View style={[styles.fareRow, styles.fareTotal]}>
            <Text style={styles.fareTotalLabel}>Giá áp dụng</Text>
            <Text style={styles.fareTotalValue}>{formatVND(trip.fare)}</Text>
          </View>
        )}
      </View>

      {/* Booking placeholder — SP2-P2-03 */}
      <View style={styles.bookingPlaceholder}>
        <Text style={styles.bookingNote}>
          Tính năng đặt vé sẽ có ở Sprint 2 (SP2-P2-03)
        </Text>
      </View>
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

  bookingPlaceholder: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    borderStyle: 'dashed',
  },
  bookingNote: { color: '#475569', fontSize: 13 },
});
