/**
 * SP2-P1-03 & SP2-P1-04: Search Results (PA-05) & Filters Modal (PA-06) matching Figma.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import type { TripSearchResult } from '../../src/api/client';
import {
  AppBar,
  BusGlyph,
  CarGlyph,
  Card,
  CheckGlyph,
  FilterGlyph,
  SectionHeading,
} from '../../src/components/UI';
import { useAuth } from '../../src/session/AuthContext';
import { CARD_SHADOW, COLORS, PRIMARY_SHADOW } from '../../src/theme/tokens';
import {
  formatArrivalTime,
  formatDateShort,
  formatDuration,
  formatTimeOnly,
  formatVehicleLabel,
  formatVND,
  seatColor,
  surchargePercent,
} from '../../src/trips/tripFormatters';
import { useTripSearch } from '../../src/trips/useTripSearch';

type SortKey = 'time' | 'price' | 'rating' | 'seats';
type TimeWindow = 'all' | 'morning' | 'afternoon' | 'evening';

interface TripFilters {
  sort: SortKey;
  timeWindow: TimeWindow;
  minPrice: number;
  maxPrice: number;
  minSeats: number;
  minRating: number;
  companies: string[];
  vehicleTypes: string[];
}

const TIME_OPTIONS: { key: TimeWindow; label: string; sub: string }[] = [
  { key: 'all', label: 'Tất cả', sub: 'Mọi khung giờ' },
  { key: 'morning', label: 'Sáng', sub: '05:00 – 12:00' },
  { key: 'afternoon', label: 'Chiều', sub: '12:00 – 18:00' },
  { key: 'evening', label: 'Tối', sub: 'Sau 18:00' },
];

function departureBucket(iso: string): Exclude<TimeWindow, 'all'> {
  const hour = new Date(iso).getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}

function applyTripFilters(
  list: TripSearchResult[],
  f: TripFilters,
  priceCeilingBound: number,
): TripSearchResult[] {
  const filtered = list.filter(item => {
    if (f.timeWindow !== 'all' && departureBucket(item.departureTime) !== f.timeWindow) {
      return false;
    }
    if (item.estimatedFare < f.minPrice) return false;
    if (f.maxPrice < priceCeilingBound && item.estimatedFare > f.maxPrice) return false;
    if (item.availableSeats < f.minSeats) return false;
    if (f.minRating > 0 && (item.companyRating ?? 0) < f.minRating) return false;
    if (f.companies.length > 0) {
      const company = item.companyName ?? item.routeName;
      if (!f.companies.includes(company)) return false;
    }
    if (f.vehicleTypes.length > 0) {
      if (!f.vehicleTypes.includes(item.vehicleType)) return false;
    }
    return true;
  });

  return filtered.sort((a, b) => {
    if (f.sort === 'price') return a.estimatedFare - b.estimatedFare;
    if (f.sort === 'rating') return (b.companyRating ?? 0) - (a.companyRating ?? 0);
    if (f.sort === 'seats') return b.availableSeats - a.availableSeats;
    return new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime();
  });
}

export default function SearchResultsScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{
    origin?: string;
    destination?: string;
    date?: string;
    minSeats?: string;
  }>();

  const initialSeats = params.minSeats ? Math.max(1, parseInt(params.minSeats, 10) || 1) : 1;
  const { state, search } = useTripSearch(session?.accessToken ?? '');

  const rawResults = state.status === 'success' ? state.results : [];

  const priceCeilingBound = useMemo(() => {
    if (rawResults.length === 0) return 300_000;
    const maxFare = Math.max(...rawResults.map(t => t.estimatedFare));
    return Math.max(100_000, Math.ceil(maxFare / 50_000) * 50_000);
  }, [rawResults]);

  const companyOptions = useMemo(() => {
    const names = rawResults.map(t => t.companyName ?? t.routeName).filter(Boolean);
    return Array.from(new Set(names));
  }, [rawResults]);

  const vehicleTypeOptions = useMemo(() => {
    const types = rawResults.map(t => t.vehicleType).filter(Boolean);
    return Array.from(new Set(types));
  }, [rawResults]);

  const maxSeatBound = useMemo(() => {
    if (rawResults.length === 0) return 16;
    return Math.max(1, ...rawResults.map(t => t.availableSeats));
  }, [rawResults]);

  const defaultFilters = useMemo<TripFilters>(
    () => ({
      sort: 'time',
      timeWindow: 'all',
      minPrice: 0,
      maxPrice: priceCeilingBound,
      minSeats: initialSeats,
      minRating: 0,
      companies: [],
      vehicleTypes: [],
    }),
    [priceCeilingBound, initialSeats],
  );

  const [filters, setFilters] = useState<TripFilters>(defaultFilters);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<TripFilters>(defaultFilters);

  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      maxPrice: prev.maxPrice < priceCeilingBound && prev.maxPrice > 0 ? prev.maxPrice : priceCeilingBound,
    }));
  }, [priceCeilingBound]);

  useEffect(() => {
    search({
      origin: params.origin,
      destination: params.destination,
      date: params.date,
      minSeats: initialSeats,
    });
  }, []);

  const filteredResults = useMemo(
    () => applyTripFilters(rawResults, filters, priceCeilingBound),
    [rawResults, filters, priceCeilingBound],
  );

  const draftMatchCount = useMemo(
    () => applyTripFilters(rawResults, draftFilters, priceCeilingBound).length,
    [rawResults, draftFilters, priceCeilingBound],
  );

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.timeWindow !== 'all') n += 1;
    if (filters.minPrice > 0 || filters.maxPrice < priceCeilingBound) n += 1;
    if (filters.minSeats > initialSeats) n += 1;
    if (filters.minRating > 0) n += 1;
    if (filters.companies.length > 0) n += 1;
    if (filters.vehicleTypes.length > 0) n += 1;
    return n;
  }, [filters, priceCeilingBound, initialSeats]);

  const routeTitle =
    [params.origin, params.destination].filter(Boolean).join(' → ') || 'Tất cả tuyến';
  const dateDisplay = params.date ? formatDateShort(params.date) : 'Tất cả ngày';
  const subLabel = `${dateDisplay} · ${filters.minSeats} khách`;

  function openFilterModal() {
    setDraftFilters(filters);
    setFilterModalOpen(true);
  }

  function renderItem({ item }: { item: TripSearchResult }) {
    const pct = surchargePercent(item);
    const totalSeatsText = item.seatCapacity
      ? `Còn ${item.availableSeats}/${item.seatCapacity} chỗ`
      : `Còn ${item.availableSeats} chỗ`;
    const brandModel = [item.vehicleBrand, item.vehicleModel].filter(Boolean).join(' ');
    const vehicleText = [
      brandModel || null,
      formatVehicleLabel(item.vehicleType, item.seatCapacity),
      item.vehiclePlate || '',
    ]
      .filter(Boolean)
      .join(' · ');
    const hasRating = (item.companyRatingCount ?? 0) > 0 && (item.companyRating ?? 0) > 0;

    return (
      <Pressable
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: '/(passenger)/trip/[tripId]',
            params: {
              tripId: String(item.tripId),
              data: JSON.stringify(item),
              pax: String(filters.minSeats),
            },
          })
        }
        accessibilityRole="button"
        accessibilityLabel={`Chuyến ${item.origin} đến ${item.destination}`}
      >
        <View style={styles.cardTop}>
          <Text style={styles.companyName} numberOfLines={1}>
            {item.companyName ?? item.routeName}
          </Text>
          {hasRating ? (
            <View style={styles.verifiedChip}>
              <Text style={styles.verifiedChipText}>
                ★ {Number(item.companyRating).toFixed(1)}
              </Text>
            </View>
          ) : (
            <View style={styles.verifiedChip}>
              <View style={styles.verifiedDot} />
              <Text style={styles.verifiedChipText}>Đã xác minh</Text>
            </View>
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
              <BusGlyph size={16} color={COLORS.primary} />
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

        <View style={styles.vehicleRow}>
          <CarGlyph size={14} color={COLORS.slate500} />
          <Text style={styles.metaLine} numberOfLines={1}>
            {vehicleText} · {formatDateShort(item.departureTime)}
          </Text>
        </View>

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
      {/* Figma PA-05 AppBar with Filter Pill */}
      <AppBar
        title={routeTitle}
        sub={subLabel}
        onBack={() => router.back()}
        right={
          <Pressable
            onPress={openFilterModal}
            style={[styles.filterPillBtn, activeFilterCount > 0 && styles.filterPillBtnActive]}
            accessibilityRole="button"
            accessibilityLabel="Mở bộ lọc tìm kiếm"
          >
            <FilterGlyph
              size={15}
              color={activeFilterCount > 0 ? COLORS.primary : COLORS.navy}
            />
            <Text
              style={[
                styles.filterPillText,
                activeFilterCount > 0 && { color: COLORS.primary },
              ]}
            >
              Lọc
            </Text>
            {activeFilterCount > 0 ? (
              <View style={styles.filterCountBadge}>
                <Text style={styles.filterCountText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </Pressable>
        }
      />

      {/* Sort Pill Bar matching Figma PA-05 */}
      <View style={styles.sortBar}>
        {(
          [
            ['time', 'Giờ đi sớm'],
            ['price', 'Giá thấp nhất'],
            ['rating', 'Đánh giá cao'],
            ['seats', 'Nhiều chỗ'],
          ] as [SortKey, string][]
        ).map(([key, label]) => {
          const active = filters.sort === key;
          return (
            <Pressable
              key={key}
              onPress={() => setFilters(prev => ({ ...prev, sort: key }))}
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
                minSeats: initialSeats,
              })
            }
          >
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      )}

      {state.status === 'success' && (
        <FlatList
          data={filteredResults}
          keyExtractor={t => String(t.tripId)}
          ListHeaderComponent={
            <Text style={styles.resultCount}>
              {filteredResults.length === 0
                ? 'Không tìm thấy chuyến phù hợp'
                : `${filteredResults.length} chuyến phù hợp`}
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Không có chuyến phù hợp</Text>
              <Text style={styles.emptyText}>
                {activeFilterCount > 0
                  ? 'Thử bỏ bớt bộ lọc hiện tại hoặc mở rộng khung giờ.'
                  : 'Thử thay đổi điểm đi/đến, ngày khởi hành hoặc số lượng khách.'}
              </Text>
              <Pressable
                style={styles.retryBtn}
                onPress={() => {
                  if (activeFilterCount > 0) {
                    setFilters(defaultFilters);
                  } else {
                    router.back();
                  }
                }}
              >
                <Text style={styles.retryText}>
                  {activeFilterCount > 0 ? 'Xóa bộ lọc' : 'Chọn lại điều kiện'}
                </Text>
              </Pressable>
            </View>
          }
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Figma PA-06 Filters Modal */}
      <Modal
        visible={filterModalOpen}
        animationType="slide"
        onRequestClose={() => setFilterModalOpen(false)}
      >
        <View style={styles.root}>
          <AppBar
            title="Bộ lọc"
            backIcon="close"
            onBack={() => setFilterModalOpen(false)}
            right={
              <Pressable onPress={() => setDraftFilters(defaultFilters)} style={styles.resetBtn}>
                <Text style={styles.resetBtnText}>Đặt lại</Text>
              </Pressable>
            }
          />

          <ScrollView contentContainerStyle={styles.filterScroll}>
            {/* Departure Time 2x2 Grid */}
            <Card>
              <SectionHeading>Giờ khởi hành</SectionHeading>
              <View style={styles.timeGrid}>
                {TIME_OPTIONS.map(opt => {
                  const active = draftFilters.timeWindow === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => setDraftFilters(prev => ({ ...prev, timeWindow: opt.key }))}
                      style={[styles.timeCard, active && styles.timeCardActive]}
                    >
                      <Text style={[styles.timeCardTitle, active && styles.timeCardTitleActive]}>
                        {opt.label}
                      </Text>
                      <Text style={styles.timeCardSub}>{opt.sub}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>

            {/* Price Range per seat */}
            <Card>
              <SectionHeading>Khoảng giá mỗi chỗ</SectionHeading>
              <Text style={styles.priceHeadline}>
                {formatVND(draftFilters.minPrice)} –{' '}
                {draftFilters.maxPrice >= priceCeilingBound
                  ? `${formatVND(priceCeilingBound)}+`
                  : formatVND(draftFilters.maxPrice)}
              </Text>
              <View style={styles.priceBarTrack}>
                <View
                  style={[
                    styles.priceBarFill,
                    {
                      left: `${(draftFilters.minPrice / priceCeilingBound) * 100}%`,
                      right: `${100 - (draftFilters.maxPrice / priceCeilingBound) * 100}%`,
                    },
                  ]}
                />
              </View>

              <View style={styles.pricePresetRow}>
                {[
                  { label: 'Tất cả', min: 0, max: priceCeilingBound },
                  { label: '≤ 100.000đ', min: 0, max: Math.min(100_000, priceCeilingBound) },
                  { label: '≤ 150.000đ', min: 0, max: Math.min(150_000, priceCeilingBound) },
                  { label: '≤ 200.000đ', min: 0, max: Math.min(200_000, priceCeilingBound) },
                ].map(preset => {
                  const active =
                    draftFilters.minPrice === preset.min && draftFilters.maxPrice === preset.max;
                  return (
                    <Pressable
                      key={preset.label}
                      style={[styles.pricePresetChip, active && styles.pricePresetChipActive]}
                      onPress={() =>
                        setDraftFilters(prev => ({ ...prev, minPrice: preset.min, maxPrice: preset.max }))
                      }
                    >
                      <Text style={[styles.pricePresetText, active && styles.pricePresetTextActive]}>
                        {preset.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.priceAdjustRow}>
                <Text style={styles.priceAdjustLabel}>Giá tối đa:</Text>
                <View style={styles.stepper}>
                  <Pressable
                    style={[styles.stepBtn, styles.stepBtnMinus]}
                    onPress={() =>
                      setDraftFilters(prev => ({
                        ...prev,
                        maxPrice: Math.max(prev.minPrice + 25_000, prev.maxPrice - 25_000),
                      }))
                    }
                  >
                    <Text style={styles.stepMinusText}>−</Text>
                  </Pressable>
                  <Text style={styles.priceAdjustVal}>{formatVND(draftFilters.maxPrice)}</Text>
                  <Pressable
                    style={[styles.stepBtn, styles.stepBtnPlus]}
                    onPress={() =>
                      setDraftFilters(prev => ({
                        ...prev,
                        maxPrice: Math.min(priceCeilingBound, prev.maxPrice + 25_000),
                      }))
                    }
                  >
                    <Text style={styles.stepPlusText}>+</Text>
                  </Pressable>
                </View>
              </View>
            </Card>

            {/* Min available seats stepper */}
            <Card>
              <SectionHeading>Số chỗ trống tối thiểu</SectionHeading>
              <View style={styles.minSeatRow}>
                <Text style={styles.minSeatText}>
                  Ít nhất <Text style={{ fontWeight: '800' }}>{draftFilters.minSeats}</Text> chỗ trống
                </Text>
                <View style={styles.stepper}>
                  <Pressable
                    style={[
                      styles.stepBtn,
                      styles.stepBtnMinus,
                      draftFilters.minSeats <= 1 && { opacity: 0.4 },
                    ]}
                    disabled={draftFilters.minSeats <= 1}
                    onPress={() =>
                      setDraftFilters(prev => ({ ...prev, minSeats: Math.max(1, prev.minSeats - 1) }))
                    }
                  >
                    <Text style={styles.stepMinusText}>−</Text>
                  </Pressable>
                  <Text style={styles.stepNum}>{draftFilters.minSeats}</Text>
                  <Pressable
                    style={[
                      styles.stepBtn,
                      styles.stepBtnPlus,
                      draftFilters.minSeats >= maxSeatBound && { opacity: 0.4 },
                    ]}
                    disabled={draftFilters.minSeats >= maxSeatBound}
                    onPress={() =>
                      setDraftFilters(prev => ({
                        ...prev,
                        minSeats: Math.min(maxSeatBound, prev.minSeats + 1),
                      }))
                    }
                  >
                    <Text style={styles.stepPlusText}>+</Text>
                  </Pressable>
                </View>
              </View>
            </Card>

            {/* Dynamic Companies from DB Search Results */}
            {companyOptions.length > 0 ? (
              <Card>
                <SectionHeading>Nhà xe</SectionHeading>
                <View style={{ gap: 12 }}>
                  {companyOptions.map(company => {
                    const checked = draftFilters.companies.includes(company);
                    return (
                      <Pressable
                        key={company}
                        style={styles.companyOptionRow}
                        onPress={() =>
                          setDraftFilters(prev => ({
                            ...prev,
                            companies: checked
                              ? prev.companies.filter(c => c !== company)
                              : [...prev.companies, company],
                          }))
                        }
                      >
                        <View style={[styles.checkboxBox, checked && styles.checkboxBoxChecked]}>
                          {checked ? <CheckGlyph size={14} color="#ffffff" /> : null}
                        </View>
                        <Text style={styles.companyOptionText}>{company}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Card>
            ) : null}

            {/* Vehicle Type Filter per Doc Section 5.7 */}
            {vehicleTypeOptions.length > 0 ? (
              <Card>
                <SectionHeading>Loại xe</SectionHeading>
                <View style={styles.pricePresetRow}>
                  {vehicleTypeOptions.map(vType => {
                    const active = draftFilters.vehicleTypes.includes(vType);
                    return (
                      <Pressable
                        key={vType}
                        style={[styles.pricePresetChip, active && styles.pricePresetChipActive]}
                        onPress={() =>
                          setDraftFilters(prev => ({
                            ...prev,
                            vehicleTypes: active
                              ? prev.vehicleTypes.filter(x => x !== vType)
                              : [...prev.vehicleTypes, vType],
                          }))
                        }
                      >
                        <Text style={[styles.pricePresetText, active && styles.pricePresetTextActive]}>
                          {vType}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Card>
            ) : null}

            {/* Minimum Rating Filter per Doc Section 5.7 */}
            <Card>
              <SectionHeading>Đánh giá nhà xe</SectionHeading>
              <View style={styles.pricePresetRow}>
                {[
                  { label: 'Tất cả', val: 0 },
                  { label: '★ 3.5+', val: 3.5 },
                  { label: '★ 4.0+', val: 4.0 },
                  { label: '★ 4.5+', val: 4.5 },
                ].map(opt => {
                  const active = draftFilters.minRating === opt.val;
                  return (
                    <Pressable
                      key={opt.label}
                      style={[styles.pricePresetChip, active && styles.pricePresetChipActive]}
                      onPress={() => setDraftFilters(prev => ({ ...prev, minRating: opt.val }))}
                    >
                      <Text style={[styles.pricePresetText, active && styles.pricePresetTextActive]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>
          </ScrollView>

          <View style={styles.filterFooter}>
            <Pressable
              style={styles.applyFilterBtn}
              onPress={() => {
                setFilters(draftFilters);
                setFilterModalOpen(false);
              }}
            >
              <Text style={styles.applyFilterBtnText}>
                Áp dụng · {draftMatchCount} chuyến
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.canvas },

  filterPillBtn: {
    height: 38,
    paddingHorizontal: 13,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterPillBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  filterPillText: { fontSize: 13, fontWeight: '700', color: COLORS.navy },
  filterCountBadge: {
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },

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
  companyName: { fontSize: 15, fontWeight: '700', color: COLORS.navy, flex: 1 },
  verifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.tealSoft,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  verifiedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.tealDark },
  verifiedChipText: { color: COLORS.tealDark, fontSize: 11, fontWeight: '700' },
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
  dashRow: { flexDirection: 'row', alignItems: 'center', gap: 4, width: '100%' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dashedLine: {
    flex: 1,
    height: 1,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.slate300,
  },

  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  metaLine: { fontSize: 12, color: COLORS.slate500, flex: 1 },

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
  fareBig: { fontSize: 19, fontWeight: '800', color: COLORS.primary },
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
  emptyText: {
    fontSize: 14,
    color: COLORS.slate500,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },

  /* PA-06 Filters Modal */
  resetBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  resetBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  filterScroll: { padding: 16, gap: 14, paddingBottom: 28 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeCard: {
    width: '48%',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  timeCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  timeCardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.navy },
  timeCardTitleActive: { color: COLORS.primary },
  timeCardSub: { fontSize: 11, color: COLORS.slate500, marginTop: 2 },

  priceHeadline: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 12,
  },
  priceBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.slate100,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 14,
  },
  priceBarFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  pricePresetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  pricePresetChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.canvas,
  },
  pricePresetChipActive: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary,
  },
  pricePresetText: { fontSize: 12, fontWeight: '600', color: COLORS.slate600 },
  pricePresetTextActive: { color: COLORS.primary, fontWeight: '700' },
  priceAdjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  priceAdjustLabel: { fontSize: 13, fontWeight: '600', color: COLORS.slate500 },
  priceAdjustVal: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.navy,
    minWidth: 82,
    textAlign: 'center',
  },

  minSeatRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  minSeatText: { fontSize: 14, color: COLORS.navy },
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
  stepBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepBtnMinus: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line },
  stepBtnPlus: { backgroundColor: COLORS.primary },
  stepMinusText: { fontSize: 17, fontWeight: '700', color: COLORS.navy },
  stepPlusText: { fontSize: 17, fontWeight: '700', color: '#ffffff' },
  stepNum: { minWidth: 22, textAlign: 'center', fontSize: 15, fontWeight: '800', color: COLORS.navy },

  companyOptionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.slate300,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  companyOptionText: { fontSize: 14, fontWeight: '600', color: COLORS.navy, flex: 1 },

  filterFooter: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 26,
  },
  applyFilterBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...PRIMARY_SHADOW,
  },
  applyFilterBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
