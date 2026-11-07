/**
 * SP2-P1-03: Search results screen.
 * SP2-P1-04: Each card shows fare + estimated fare (demand surcharge).
 *
 * Route: /(passenger)/results?origin=...&destination=...&date=...&minSeats=...
 * Navigates to /(passenger)/trip/[tripId] on card press.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../../src/session/AuthContext';
import type { TripSearchResult } from '../../src/api/client';
import {
  formatDeparture,
  formatVND,
  seatColor,
  surchargePercent,
} from '../../src/trips/tripFormatters';
import { useTripSearch } from '../../src/trips/useTripSearch';

export default function SearchResultsScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{
    origin?: string;
    destination?: string;
    date?: string;
    minSeats?: string;
  }>();

  const { state, search } = useTripSearch(session?.accessToken ?? '');

  useEffect(() => {
    search({
      origin: params.origin,
      destination: params.destination,
      date: params.date,
      minSeats: params.minSeats ? parseInt(params.minSeats, 10) : undefined,
    });
  }, []);

  function renderHeader() {
    const parts: string[] = [];
    if (params.origin) parts.push(params.origin);
    if (params.destination) parts.push(params.destination);
    const route = parts.length ? parts.join(' → ') : 'Tất cả tuyến';
    const dateLabel = params.date ?? 'Tất cả ngày';
    return (
      <View style={styles.headerBox}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Quay lại">
          <Text style={styles.back}>← Quay lại</Text>
        </Pressable>
        <Text style={styles.routeLabel}>{route}</Text>
        <Text style={styles.dateMeta}>{dateLabel}</Text>
      </View>
    );
  }

  function renderItem({ item }: { item: TripSearchResult }) {
    const pct = surchargePercent(item);
    return (
      <Pressable
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: '/(passenger)/trip/[tripId]',
            params: { tripId: String(item.tripId), data: JSON.stringify(item) },
          })
        }
        accessibilityRole="button"
        accessibilityLabel={`Chuyến ${item.origin} đến ${item.destination}`}
      >
        {/* Route + time */}
        <Text style={styles.cardRoute}>
          {item.origin} → {item.destination}
        </Text>
        <Text style={styles.cardDep}>{formatDeparture(item.departureTime)}</Text>

        <View style={styles.row}>
          {/* Fare block */}
          <View>
            <Text style={styles.fareBase}>{formatVND(item.fare)}</Text>
            {pct > 0 ? (
              <Text style={styles.fareEst}>
                ~{formatVND(item.estimatedFare)}
                <Text style={styles.surcharge}> +{pct}%</Text>
              </Text>
            ) : null}
          </View>

          {/* Seat + vehicle */}
          <View style={styles.right}>
            <Text style={[styles.seats, { color: seatColor(item.availableSeats) }]}>
              {item.availableSeats} ghế
            </Text>
            <Text style={styles.vehicle}>{item.vehicleType}</Text>
          </View>
        </View>

        <Text style={styles.driver}>👤 {item.driverName}</Text>
        <Text style={styles.duration}>⏱ ~{item.estimatedMinutes} phút</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.root}>
      {state.status === 'loading' && (
        <View style={styles.center}>
          {renderHeader()}
          <ActivityIndicator color="#6366f1" size="large" style={{ marginTop: 48 }} />
          <Text style={styles.loadingText}>Đang tìm chuyến xe…</Text>
        </View>
      )}

      {state.status === 'error' && (
        <View style={styles.center}>
          {renderHeader()}
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{state.message}</Text>
          <Pressable
            style={styles.retryBtn}
            onPress={() =>
              search({
                origin: params.origin,
                destination: params.destination,
                date: params.date,
                minSeats: params.minSeats ? parseInt(params.minSeats, 10) : undefined,
              })
            }
          >
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      )}

      {state.status === 'success' && (
        <FlatList
          data={state.results}
          keyExtractor={(t) => String(t.tripId)}
          ListHeaderComponent={
            <>
              {renderHeader()}
              <Text style={styles.resultCount}>
                {state.results.length === 0
                  ? 'Không tìm thấy chuyến phù hợp'
                  : `${state.results.length} chuyến xe`}
              </Text>
            </>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🚌</Text>
              <Text style={styles.emptyText}>
                Không có chuyến nào khớp với bộ lọc.{'\n'}Hãy thử điều chỉnh lại điều kiện tìm kiếm.
              </Text>
            </View>
          }
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, paddingHorizontal: 24 },
  headerBox: { paddingTop: 60, paddingBottom: 16 },
  back: { color: '#6366f1', fontSize: 14, marginBottom: 12 },
  routeLabel: { color: '#f1f5f9', fontSize: 22, fontWeight: '700' },
  dateMeta: { color: '#64748b', fontSize: 13, marginTop: 4 },
  resultCount: { color: '#94a3b8', fontSize: 13, marginBottom: 12, paddingHorizontal: 24 },
  list: { paddingHorizontal: 24, paddingBottom: 40 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardRoute: { color: '#f1f5f9', fontSize: 16, fontWeight: '700' },
  cardDep: { color: '#6366f1', fontSize: 13, marginTop: 4, marginBottom: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  fareBase: { color: '#f1f5f9', fontSize: 18, fontWeight: '700' },
  fareEst: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  surcharge: { color: '#f59e0b', fontWeight: '600' },
  right: { alignItems: 'flex-end' },
  seats: { fontSize: 15, fontWeight: '700' },
  vehicle: { color: '#64748b', fontSize: 12, marginTop: 2 },
  driver: { color: '#94a3b8', fontSize: 13, marginTop: 10 },
  duration: { color: '#64748b', fontSize: 12, marginTop: 4 },
  loadingText: { color: '#64748b', textAlign: 'center', marginTop: 12 },
  errorIcon: { fontSize: 48, textAlign: 'center', marginTop: 48 },
  errorText: { color: '#ef4444', textAlign: 'center', marginTop: 12, fontSize: 14 },
  retryBtn: {
    marginTop: 20,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  retryText: { color: '#fff', fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 48 },
  emptyIcon: { fontSize: 56 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 16, lineHeight: 22 },
});
