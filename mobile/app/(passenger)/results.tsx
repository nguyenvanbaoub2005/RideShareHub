/**
 * SP2-P1-03 & SP2-P1-04: Search results screen — Figma PA-05 light canvas cards + sort pills.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { AppBar, StatusBadge } from '../../src/components/UI';
import { CARD_SHADOW, COLORS } from '../../src/theme/tokens';
import {
  formatArrivalTime,
  formatDeparture,
  formatDuration,
  formatTimeOnly,
  formatVND,
  seatColor,
  surchargePercent,
} from '../../src/trips/tripFormatters';
import { useTripSearch } from '../../src/trips/useTripSearch';

type SortKey = 'time' | 'price' | 'seats';

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
  const [sortBy, setSortBy] = useState<SortKey>('time');

  useEffect(() => {
    search({
      origin: params.origin,
      destination: params.destination,
      date: params.date,
      minSeats: params.minSeats ? parseInt(params.minSeats, 10) : undefined,
    });
  }, []);

  const routeTitle =
    [params.origin, params.destination].filter(Boolean).join(' → ') || 'Tất cả tuyến';
  const subLabel = `${params.date || 'Tất cả ngày'} · ${params.minSeats || '1'} khách`;

  const sortedResults =
    state.status === 'success'
      ? [...state.results].sort((a, b) => {
          if (sortBy === 'price') return a.estimatedFare - b.estimatedFare;
          if (sortBy === 'seats') return b.availableSeats - a.availableSeats;
          return new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime();
        })
      : [];

  function renderItem({ item }: { item: TripSearchResult }) {
    const pct = surchargePercent(item);
    const totalSeatsText = item.seatCapacity
      ? `Còn ${item.availableSeats}/${item.seatCapacity} chỗ`
      : `Còn ${item.availableSeats} chỗ`;

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
        <View style={styles.cardTop}>
          <Text style={styles.companyName} numberOfLines={1}>
            {item.companyName ?? item.routeName}
          </Text>
          {pct > 0 ? (
            <View style={styles.surchargeChip}>
              <Text style={styles.surchargeChipText}>Nhu cầu cao +{pct}%</Text>
            </View>
          ) : (
            <StatusBadge status={item.status} label="Đang mở bán" />
          )}
        </View>

        <View style={styles.timelineRow}>
          <View>
            <Text style={styles.timeBig}>{formatTimeOnly(item.departureTime)}</Text>
            <Text style={styles.cityText}>{item.origin}</Text>
          </View>
          <View style={styles.midTimeline}>
            <Text style={styles.durationLabel}>{formatDuration(item.estimatedMinutes)}</Text>
            <View style={styles.dashRow}>
              <View style={[styles.dot, { backgroundColor: COLORS.teal }]} />
              <View style={styles.dashedLine} />
              <View style={[styles.dot, { backgroundColor: COLORS.danger }]} />
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.timeBig}>
              {formatArrivalTime(item.departureTime, item.estimatedMinutes)}
            </Text>
            <Text style={styles.cityText}>{item.destination}</Text>
          </View>
        </View>

        <Text style={styles.metaLine}>
          {formatDeparture(item.departureTime)} · {item.vehicleType} · Tài xế {item.driverName}
        </Text>

        <View style={styles.cardBottom}>
          <Text style={[styles.seatsText, { color: seatColor(item.availableSeats) }]}>
            {totalSeatsText}
          </Text>
          <View style={{ alignItems: 'flex-end' }}>
            {pct > 0 ? (
              <Text style={styles.baseStrike}>{formatVND(item.fare)}</Text>
            ) : null}
            <Text style={styles.fareBig}>
              {formatVND(item.estimatedFare)}
              <Text style={styles.perSeat}>/chỗ</Text>
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.root}>
      <AppBar title={routeTitle} sub={subLabel} onBack={() => router.back()} />

      <View style={styles.sortBar}>
        {(
          [
            ['time', 'Giờ đi sớm'],
            ['price', 'Giá thấp nhất'],
            ['seats', 'Nhiều chỗ trống'],
          ] as [SortKey, string][]
        ).map(([key, label]) => {
          const active = sortBy === key;
          return (
            <Pressable
              key={key}
              onPress={() => setSortBy(key)}
              style={[styles.sortPill, active && styles.sortPillActive]}
            >
              <Text style={[styles.sortText, active && styles.sortTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {state.status === 'loading' && (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>Đang tìm chuyến xe…</Text>
        </View>
      )}

      {state.status === 'error' && (
        <View style={styles.center}>
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
          data={sortedResults}
          keyExtractor={t => String(t.tripId)}
          ListHeaderComponent={
            <Text style={styles.resultCount}>
              {sortedResults.length === 0
                ? 'Không tìm thấy chuyến phù hợp'
                : `${sortedResults.length} chuyến phù hợp`}
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Không có chuyến nào</Text>
              <Text style={styles.emptyText}>
                Thử thay đổi điểm đi/đến, ngày khởi hành hoặc số lượng khách.
              </Text>
              <Pressable style={styles.retryBtn} onPress={() => router.back()}>
                <Text style={styles.retryText}>Chọn lại điều kiện</Text>
              </Pressable>
            </View>
          }
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.canvas },
  sortBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sortPill: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
  },
  sortPillActive: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  sortText: { fontSize: 13, fontWeight: '600', color: COLORS.slate600 },
  sortTextActive: { color: '#ffffff' },

  listContent: { paddingHorizontal: 16, paddingBottom: 36 },
  resultCount: { fontSize: 13, color: COLORS.slate500, marginBottom: 10 },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 16,
    marginBottom: 12,
    ...CARD_SHADOW,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  companyName: { fontSize: 14, fontWeight: '700', color: COLORS.navy, flex: 1 },
  surchargeChip: {
    backgroundColor: COLORS.warningSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  surchargeChipText: { color: COLORS.warningText, fontSize: 11, fontWeight: '700' },

  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
  },
  timeBig: { fontSize: 22, fontWeight: '800', color: COLORS.navy, lineHeight: 24 },
  cityText: { fontSize: 12, color: COLORS.slate500, marginTop: 3 },
  midTimeline: { flex: 1, alignItems: 'center' },
  durationLabel: { fontSize: 11, color: COLORS.slate500, marginBottom: 4 },
  dashRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dashedLine: {
    flex: 1,
    height: 1,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.slate300,
    marginHorizontal: 4,
  },

  metaLine: { fontSize: 12, color: COLORS.slate500, marginTop: 12 },

  cardBottom: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  seatsText: { fontSize: 13, fontWeight: '700' },
  baseStrike: {
    fontSize: 12,
    color: COLORS.slate400,
    textDecorationLine: 'line-through',
  },
  fareBig: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  perSeat: { fontSize: 12, fontWeight: '500', color: COLORS.slate500 },

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
  emptyBox: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.navy },
  emptyText: { fontSize: 14, color: COLORS.slate500, textAlign: 'center', marginTop: 6, lineHeight: 20 },
});
