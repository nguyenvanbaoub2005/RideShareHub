import * as Location from 'expo-location';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker, type MapPressEvent, type Region } from 'react-native-maps';
import type { LocationInput } from '../api/client';
import { COLORS } from '../theme/tokens';

export type PickedLocation = LocationInput;

interface SuggestionItem extends PickedLocation {
  title: string;
  subtitle: string;
  source?: 'recent' | 'photon' | 'native' | 'custom';
}

interface PhotonFeature {
  geometry?: {
    coordinates?: [number, number];
  };
  properties?: {
    name?: string;
    housenumber?: string;
    street?: string;
    district?: string;
    locality?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  'đà nẵng': { lat: 16.0544, lng: 108.2022 },
  'da nang': { lat: 16.0544, lng: 108.2022 },
  'huế': { lat: 16.4637, lng: 107.5909 },
  'hue': { lat: 16.4637, lng: 107.5909 },
  'hội an': { lat: 15.8801, lng: 108.338 },
  'hoi an': { lat: 15.8801, lng: 108.338 },
  'tam kỳ': { lat: 15.5736, lng: 108.474 },
  'tam ky': { lat: 15.5736, lng: 108.474 },
  'quảng nam': { lat: 15.8801, lng: 108.338 },
  'quảng ngãi': { lat: 15.1214, lng: 108.8044 },
  'hà nội': { lat: 21.0285, lng: 105.8542 },
  'hồ chí minh': { lat: 10.7769, lng: 106.7009 },
};

function resolveCityCenter(cityHint?: string): { lat: number; lng: number } {
  if (!cityHint) {
    return { lat: 16.0544, lng: 108.2022 };
  }
  const normalized = cityHint.trim().toLowerCase();
  for (const [key, coords] of Object.entries(CITY_CENTERS)) {
    if (normalized.includes(key)) {
      return coords;
    }
  }
  return { lat: 16.0544, lng: 108.2022 };
}

function formatPhotonFeature(f: PhotonFeature): SuggestionItem | null {
  const coords = f.geometry?.coordinates;
  if (!coords || coords.length < 2) {
    return null;
  }
  const lng = Number(Number(coords[0]).toFixed(6));
  const lat = Number(Number(coords[1]).toFixed(6));
  const p = f.properties ?? {};

  const streetPart = [p.housenumber, p.street].filter(Boolean).join(' ').trim();
  const title = (p.name || streetPart || p.locality || p.district || p.city || 'Địa điểm').trim();

  const subtitleParts = [
    streetPart && streetPart !== title ? streetPart : '',
    p.locality && p.locality !== title ? p.locality : '',
    p.district && p.district !== title ? p.district : '',
    p.city || p.state || '',
  ].filter(Boolean);

  const subtitle = subtitleParts.join(', ');
  const fullLabel = subtitle ? `${title}, ${subtitle}` : title;

  return {
    title,
    subtitle: subtitle || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    label: fullLabel,
    latitude: lat,
    longitude: lng,
    source: 'photon',
  };
}

async function fetchPhotonSuggestions(
  rawQuery: string,
  cityHint: string | undefined,
  biasCenter: { lat: number; lng: number },
): Promise<SuggestionItem[]> {
  const trimmed = rawQuery.trim();
  if (!trimmed) {
    return [];
  }

  const queries = [trimmed];
  if (cityHint && !trimmed.toLowerCase().includes(cityHint.toLowerCase())) {
    queries.unshift(`${trimmed} ${cityHint}`);
  }

  const responses = await Promise.allSettled(
    queries.map(async (q) => {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=${biasCenter.lat}&lon=${biasCenter.lng}&limit=7`;
      const res = await fetch(url);
      if (!res.ok) {
        return [] as SuggestionItem[];
      }
      const data = (await res.json()) as { features?: PhotonFeature[] };
      return (data.features ?? [])
        .map(formatPhotonFeature)
        .filter((item): item is SuggestionItem => item !== null);
    }),
  );

  const merged: SuggestionItem[] = [];
  const seen = new Set<string>();

  for (const r of responses) {
    if (r.status === 'fulfilled') {
      for (const item of r.value) {
        const dedupeKey = `${item.title.toLowerCase()}-${(item.latitude ?? 0).toFixed(3)}-${(item.longitude ?? 0).toFixed(3)}`;
        if (!seen.has(dedupeKey)) {
          seen.add(dedupeKey);
          merged.push(item);
        }
      }
    }
  }

  return merged.slice(0, 8);
}

async function fetchNativeGeocodeFallback(
  rawQuery: string,
  cityHint: string | undefined,
): Promise<SuggestionItem[]> {
  try {
    const fullQuery =
      cityHint && !rawQuery.toLowerCase().includes(cityHint.toLowerCase())
        ? `${rawQuery}, ${cityHint}, Việt Nam`
        : `${rawQuery}, Việt Nam`;
    const geocoded = await Location.geocodeAsync(fullQuery);
    if (!geocoded || geocoded.length === 0) {
      return [];
    }
    const first = geocoded[0];
    const lat = Number(first.latitude.toFixed(6));
    const lng = Number(first.longitude.toFixed(6));
    let resolvedLabel = cityHint ? `${rawQuery.trim()}, ${cityHint}` : rawQuery.trim();
    let subtitle = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

    try {
      const rev = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (rev && rev.length > 0) {
        const r = rev[0];
        const parts = [
          r.name,
          [r.streetNumber, r.street].filter(Boolean).join(' '),
          r.district || r.subregion,
          r.city || r.region,
        ].filter(Boolean);
        if (parts.length > 0) {
          resolvedLabel = Array.from(new Set(parts)).join(', ');
          subtitle = parts.slice(1).join(', ') || subtitle;
        }
      }
    } catch {
      // ignore reverse lookup error
    }

    return [
      {
        title: rawQuery.trim(),
        subtitle,
        label: resolvedLabel,
        latitude: lat,
        longitude: lng,
        source: 'native',
      },
    ];
  } catch {
    return [];
  }
}

export function LocationPickerField({
  label,
  placeholder,
  cityHint,
  value,
  recentLocations = [],
  disabled = false,
  onChange,
}: {
  label: string;
  placeholder?: string;
  cityHint?: string;
  value: PickedLocation;
  recentLocations?: PickedLocation[];
  disabled?: boolean;
  onChange: (next: PickedLocation) => void;
}) {
  const defaultCenter = useMemo(() => resolveCityCenter(cityHint), [cityHint]);
  const effectivePlaceholder =
    placeholder || `Tìm địa điểm, tên đường tại ${cityHint || 'đây'}...`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value.label);
  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);
  const [editingBottomAddress, setEditingBottomAddress] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, e => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const [pinCoords, setPinCoords] = useState<{ lat: number; lng: number }>(() => ({
    lat: value.latitude ?? defaultCenter.lat,
    lng: value.longitude ?? defaultCenter.lng,
  }));
  const [region, setRegion] = useState<Region>(() => ({
    latitude: value.latitude ?? defaultCenter.lat,
    longitude: value.longitude ?? defaultCenter.lng,
    latitudeDelta: 0.012,
    longitudeDelta: 0.012,
  }));
  const [resolvedAddress, setResolvedAddress] = useState<string>(value.label);

  const mapRef = useRef<MapView | null>(null);
  const skipNextAutocompleteRef = useRef(false);

  useEffect(() => {
    if (!open) {
      setQuery(value.label);
      setResolvedAddress(value.label);
    }
  }, [value.label, open]);

  useEffect(() => {
    const nextLat = value.latitude ?? defaultCenter.lat;
    const nextLng = value.longitude ?? defaultCenter.lng;
    setPinCoords({ lat: nextLat, lng: nextLng });
    setRegion((prev) => ({
      ...prev,
      latitude: nextLat,
      longitude: nextLng,
    }));
  }, [defaultCenter.lat, defaultCenter.lng, value.latitude, value.longitude]);

  // Live type-ahead autocomplete (Photon OSM + recent DB locations + native iOS/Android geocoder fallback)
  useEffect(() => {
    if (!open) {
      return;
    }
    if (skipNextAutocompleteRef.current) {
      skipNextAutocompleteRef.current = false;
      return;
    }
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const lower = trimmed.toLowerCase();
        const matchingRecents: SuggestionItem[] = recentLocations
          .filter((item) => item.label.toLowerCase().includes(lower))
          .map((item) => {
            const parts = item.label.split(',');
            return {
              title: parts[0]?.trim() || item.label,
              subtitle: parts.slice(1).join(',').trim() || 'Địa điểm đã đặt gần đây',
              label: item.label,
              latitude: item.latitude ?? defaultCenter.lat,
              longitude: item.longitude ?? defaultCenter.lng,
              source: 'recent' as const,
            };
          });

        const photonItems = await fetchPhotonSuggestions(trimmed, cityHint, defaultCenter);
        let combined = [...matchingRecents, ...photonItems];

        if (combined.length === 0) {
          const nativeFallback = await fetchNativeGeocodeFallback(trimmed, cityHint);
          combined = [...matchingRecents, ...nativeFallback];
        }

        if (!cancelled) {
          setSuggestions(combined);
        }
      } catch {
        if (!cancelled) {
          setSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setSearching(false);
        }
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, cityHint, defaultCenter, open, recentLocations]);

  async function reverseGeocode(lat: number, lng: number) {
    setReverseLoading(true);
    try {
      // 1. Try native iOS/Android reverse geocoder first (fast & reliable on physical devices)
      try {
        const rev = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (rev && rev.length > 0) {
          const r = rev[0];
          const streetLine = [r.streetNumber, r.street].filter(Boolean).join(' ').trim();
          const parts = [
            r.name && r.name !== streetLine ? r.name : '',
            streetLine,
            r.district || r.subregion || '',
            r.city || r.region || '',
          ].filter(Boolean);
          const uniqueParts = Array.from(new Set(parts));
          if (uniqueParts.length > 0) {
            const clean = uniqueParts.join(', ');
            setResolvedAddress(clean);
            skipNextAutocompleteRef.current = true;
            setQuery(clean);
            return;
          }
        }
      } catch {
        // Fallback to Photon reverse geocoding below
      }

      // 2. Fallback to Photon reverse geocoding
      const url = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = (await response.json()) as { features?: PhotonFeature[] };
        const first = data.features?.[0];
        if (first) {
          const formatted = formatPhotonFeature(first);
          if (formatted) {
            setResolvedAddress(formatted.label);
            skipNextAutocompleteRef.current = true;
            setQuery(formatted.label);
          }
        }
      }
    } catch {
      // Keep coordinates even if offline
    } finally {
      setReverseLoading(false);
    }
  }

  function flyToCoordinates(lat: number, lng: number, delta = 0.008) {
    const nextRegion: Region = {
      latitude: lat,
      longitude: lng,
      latitudeDelta: delta,
      longitudeDelta: delta,
    };
    setPinCoords({ lat, lng });
    setRegion(nextRegion);
    mapRef.current?.animateToRegion(nextRegion, 500);
  }

  function selectLocationOnMap(item: PickedLocation) {
    Keyboard.dismiss();
    setSearchFocused(false);
    skipNextAutocompleteRef.current = true;
    setQuery(item.label);
    setResolvedAddress(item.label);

    if (item.latitude != null && item.longitude != null) {
      flyToCoordinates(item.latitude, item.longitude, 0.007);
    }
  }

  // Executed when user presses "Tìm" (Search) on keyboard or taps the Search icon button
  async function handleSubmitSearch() {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }
    Keyboard.dismiss();

    // If we already have autocomplete suggestions, jump immediately to the top suggestion
    if (suggestions.length > 0) {
      selectLocationOnMap(suggestions[0]);
      return;
    }

    setSearching(true);
    try {
      const photonItems = await fetchPhotonSuggestions(trimmed, cityHint, defaultCenter);
      if (photonItems.length > 0) {
        selectLocationOnMap(photonItems[0]);
        return;
      }
      const nativeItems = await fetchNativeGeocodeFallback(trimmed, cityHint);
      if (nativeItems.length > 0) {
        selectLocationOnMap(nativeItems[0]);
        return;
      }
      // If no external match found, keep current pin and use typed address
      setResolvedAddress(trimmed);
      setSearchFocused(false);
    } finally {
      setSearching(false);
    }
  }

  function handleMapPress(event: MapPressEvent) {
    Keyboard.dismiss();
    setSearchFocused(false);
    const { latitude, longitude } = event.nativeEvent.coordinate;
    const lat = Number(latitude.toFixed(6));
    const lng = Number(longitude.toFixed(6));
    setPinCoords({ lat, lng });
    setRegion((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }));
    void reverseGeocode(lat, lng);
  }

  async function handleUseCurrentGps() {
    Keyboard.dismiss();
    setSearchFocused(false);
    setLocatingGps(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        flyToCoordinates(defaultCenter.lat, defaultCenter.lng, 0.012);
        void reverseGeocode(defaultCenter.lat, defaultCenter.lng);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lat = Number(pos.coords.latitude.toFixed(6));
      const lng = Number(pos.coords.longitude.toFixed(6));
      flyToCoordinates(lat, lng, 0.006);
      void reverseGeocode(lat, lng);
    } catch {
      flyToCoordinates(defaultCenter.lat, defaultCenter.lng, 0.012);
    } finally {
      setLocatingGps(false);
    }
  }

  function adjustZoom(factor: number) {
    const nextDelta = Math.min(Math.max(region.latitudeDelta * factor, 0.0015), 0.35);
    const nextRegion: Region = {
      latitude: pinCoords.lat,
      longitude: pinCoords.lng,
      latitudeDelta: nextDelta,
      longitudeDelta: nextDelta,
    };
    setRegion(nextRegion);
    mapRef.current?.animateToRegion(nextRegion, 280);
  }

  function handleConfirmSelection() {
    const finalLabel =
      resolvedAddress.trim() ||
      query.trim() ||
      `Điểm ghim (${pinCoords.lat.toFixed(5)}, ${pinCoords.lng.toFixed(5)})`;
    onChange({
      label: finalLabel,
      latitude: pinCoords.lat,
      longitude: pinCoords.lng,
    });
    setOpen(false);
    setSearchFocused(false);
  }

  const quickKeywords = useMemo(() => {
    const city = cityHint || 'Đà Nẵng';
    return [
      `Bến xe ${city}`,
      `Trung tâm ${city}`,
      `Đại học ${city}`,
      `Sân bay / Ga ${city}`,
      `Bệnh viện ${city}`,
    ];
  }, [cityHint]);

  const showDropdown =
    searchFocused ||
    searching ||
    (suggestions.length > 0 && query.trim() !== resolvedAddress.trim());

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        style={[styles.triggerBox, disabled && styles.triggerBoxDisabled]}
        disabled={disabled}
        onPress={() => {
          setOpen(true);
          if (!value.label && cityHint && !value.latitude) {
            void reverseGeocode(pinCoords.lat, pinCoords.lng);
          }
        }}>
        <View style={styles.triggerLeft}>
          <View style={styles.pinDot}>
            <View style={styles.pinDotInner} />
          </View>
          <View style={styles.triggerTextCol}>
            <Text
              style={[styles.triggerText, !value.label && styles.triggerPlaceholder]}
              numberOfLines={2}>
              {value.label || effectivePlaceholder}
            </Text>
            {value.latitude != null && value.longitude != null ? (
              <Text style={styles.coordsCaption}>
                GPS: {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}
              </Text>
            ) : (
              <Text style={styles.coordsHint}>
                Chạm để tìm địa chỉ hoặc ghim trên bản đồ {cityHint ? `(${cityHint})` : ''}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.mapQuickBtn}>
          <Text style={styles.mapQuickBtnText}>Bản đồ</Text>
        </View>
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.fullScreenRoot}>
          {/* 1. NATIVE APPLE MAPS / GOOGLE MAPS VIEW (60fps pinch-to-zoom, swipe, tap, marker drag) */}
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={region}
            showsUserLocation
            showsMyLocationButton={false}
            showsCompass
            zoomEnabled
            scrollEnabled
            rotateEnabled
            pitchEnabled
            zoomTapEnabled
            onPress={handleMapPress}
            onPoiClick={(e) => {
              Keyboard.dismiss();
              setSearchFocused(false);
              const { coordinate, name } = e.nativeEvent;
              const lat = Number(coordinate.latitude.toFixed(6));
              const lng = Number(coordinate.longitude.toFixed(6));
              flyToCoordinates(lat, lng, 0.006);
              if (name) {
                const cleanName = cityHint ? `${name.replace(/\n/g, ' ')}, ${cityHint}` : name;
                setResolvedAddress(cleanName);
                skipNextAutocompleteRef.current = true;
                setQuery(cleanName);
              } else {
                void reverseGeocode(lat, lng);
              }
            }}
            onRegionChangeComplete={(nextRegion) => {
              setRegion(nextRegion);
            }}>
            <Marker
              coordinate={{
                latitude: pinCoords.lat,
                longitude: pinCoords.lng,
              }}
              draggable
              onDragEnd={(e) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                const lat = Number(latitude.toFixed(6));
                const lng = Number(longitude.toFixed(6));
                setPinCoords({ lat, lng });
                void reverseGeocode(lat, lng);
              }}
              title={resolvedAddress || label}
              description={`${pinCoords.lat.toFixed(5)}, ${pinCoords.lng.toFixed(5)}`}
            />
          </MapView>

          {/* 2. FLOATING TOP GOOGLE-MAPS SEARCH BAR + QUICK CHIPS + AUTOCOMPLETE DROPDOWN */}
          <View pointerEvents="box-none" style={styles.floatingTopContainer}>
            <View style={styles.floatingSearchPill}>
              <Pressable
                style={styles.backIconBtn}
                onPress={() => {
                  Keyboard.dismiss();
                  setOpen(false);
                }}>
                <Text style={styles.backIconText}>←</Text>
              </Pressable>

              <TextInput
                value={query}
                onChangeText={(text) => {
                  setQuery(text);
                  setSearchFocused(true);
                }}
                onFocus={() => setSearchFocused(true)}
                onSubmitEditing={() => void handleSubmitSearch()}
                placeholder={effectivePlaceholder}
                placeholderTextColor={COLORS.slate400}
                style={styles.floatingSearchInput}
                returnKeyType="search"
                autoCorrect={false}
              />

              {searching ? (
                <ActivityIndicator
                  size="small"
                  color={COLORS.primary}
                  style={styles.iconActionBtn}
                />
              ) : query.length > 0 ? (
                <Pressable
                  onPress={() => {
                    setQuery('');
                    setSuggestions([]);
                    setSearchFocused(true);
                  }}
                  style={styles.iconActionBtn}>
                  <Text style={styles.clearIconText}>✕</Text>
                </Pressable>
              ) : null}

              <Pressable
                style={styles.searchGoBtn}
                onPress={() => void handleSubmitSearch()}>
                <Text style={styles.searchGoBtnText}>Tìm</Text>
              </Pressable>
            </View>

            {/* Horizontal Floating Filter/Quick Chips right under Search Bar */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.floatingChipsRow}>
              {recentLocations.slice(0, 3).map((item, idx) => (
                <Pressable
                  key={`recent-${idx}-${item.label}`}
                  style={[styles.floatingChip, styles.floatingChipRecent]}
                  onPress={() => selectLocationOnMap(item)}>
                  <Text style={styles.floatingChipRecentIcon}>↺</Text>
                  <Text style={styles.floatingChipRecentText} numberOfLines={1}>
                    {item.label.split(',')[0]}
                  </Text>
                </Pressable>
              ))}
              {quickKeywords.map((kw) => (
                <Pressable
                  key={kw}
                  style={styles.floatingChip}
                  onPress={() => {
                    setSearchFocused(true);
                    setQuery(kw);
                  }}>
                  <Text style={styles.floatingChipText}>{kw}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Floating Autocomplete Results Dropdown (Google Maps style) */}
            {showDropdown ? (
              <View style={styles.floatingDropdownCard}>
                <ScrollView
                  style={styles.dropdownScroll}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled>
                  {searching && suggestions.length === 0 ? (
                    <View style={styles.searchingRow}>
                      <ActivityIndicator size="small" color={COLORS.primary} />
                      <Text style={styles.searchingText}>
                        Đang tìm địa điểm "{query.trim()}"...
                      </Text>
                    </View>
                  ) : null}

                  {suggestions.map((item, index) => (
                    <Pressable
                      key={`${item.label}-${index}`}
                      style={styles.resultRow}
                      onPress={() => selectLocationOnMap(item)}>
                      <View
                        style={[
                          styles.resultBadge,
                          item.source === 'recent' && styles.resultBadgeRecent,
                        ]}>
                        <Text style={styles.resultBadgeText}>
                          {item.source === 'recent' ? '↺' : '📍'}
                        </Text>
                      </View>
                      <View style={styles.resultBody}>
                        <Text style={styles.resultTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.resultSub} numberOfLines={2}>
                          {item.subtitle}
                        </Text>
                      </View>
                      <Text style={styles.jumpMapTag}>Xem map →</Text>
                    </Pressable>
                  ))}

                  {query.trim().length > 0 ? (
                    <Pressable
                      style={styles.useTypedRow}
                      onPress={() =>
                        selectLocationOnMap({
                          label: query.trim(),
                          latitude: pinCoords.lat,
                          longitude: pinCoords.lng,
                        })
                      }>
                      <View style={styles.resultBadgeCustom}>
                        <Text style={styles.resultBadgeCustomText}>✎</Text>
                      </View>
                      <View style={styles.resultBody}>
                        <Text style={styles.useTypedTitle}>
                          Dùng tên địa chỉ: "{query.trim()}"
                        </Text>
                        <Text style={styles.resultSub}>
                          Giữ tại tọa độ ghim hiện tại ({pinCoords.lat.toFixed(4)},{' '}
                          {pinCoords.lng.toFixed(4)})
                        </Text>
                      </View>
                    </Pressable>
                  ) : null}

                  {!searching && suggestions.length === 0 && recentLocations.length > 0 ? (
                    <View style={styles.recentSectionInDropdown}>
                      <Text style={styles.dropdownSectionLabel}>ĐỊA ĐIỂM ĐÃ ĐẶT GẦN ĐÂY</Text>
                      {recentLocations.map((item, index) => (
                        <Pressable
                          key={`hist-${item.label}-${index}`}
                          style={styles.resultRow}
                          onPress={() => selectLocationOnMap(item)}>
                          <View style={[styles.resultBadge, styles.resultBadgeRecent]}>
                            <Text style={styles.resultBadgeText}>↺</Text>
                          </View>
                          <View style={styles.resultBody}>
                            <Text style={styles.resultTitle} numberOfLines={2}>
                              {item.label}
                            </Text>
                            {item.latitude != null && item.longitude != null ? (
                              <Text style={styles.resultSub}>
                                GPS: {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
                              </Text>
                            ) : null}
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}

                  <Pressable
                    style={styles.closeDropdownBar}
                    onPress={() => {
                      Keyboard.dismiss();
                      setSearchFocused(false);
                    }}>
                    <Text style={styles.closeDropdownText}>Ẩn gợi ý để thao tác bản đồ</Text>
                  </Pressable>
                </ScrollView>
              </View>
            ) : null}
          </View>

          {/* 3. FLOATING RIGHT MAP CONTROLS (My GPS Location, Center of City, Zoom +/-, Pin Center) */}
          <View pointerEvents="box-none" style={styles.floatingRightControls}>
            <Pressable
              style={styles.mapFab}
              onPress={() => adjustZoom(0.5)}>
              <Text style={styles.mapFabText}>＋</Text>
            </Pressable>
            <Pressable
              style={styles.mapFab}
              onPress={() => adjustZoom(2)}>
              <Text style={styles.mapFabText}>－</Text>
            </Pressable>
            <Pressable
              style={[styles.mapFab, styles.mapFabGps]}
              onPress={() => void handleUseCurrentGps()}>
              {locatingGps ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={styles.mapFabGpsText}>◎</Text>
              )}
            </Pressable>
          </View>

          {/* Floating button to drop pin at current visible map center after panning */}
          {Math.hypot(region.latitude - pinCoords.lat, region.longitude - pinCoords.lng) >
          0.0004 ? (
            <View pointerEvents="box-none" style={styles.pinHereFloatingWrap}>
              <Pressable
                style={styles.pinHereBtn}
                onPress={() => {
                  const lat = Number(region.latitude.toFixed(6));
                  const lng = Number(region.longitude.toFixed(6));
                  setPinCoords({ lat, lng });
                  void reverseGeocode(lat, lng);
                }}>
                <Text style={styles.pinHereBtnText}>📍 Ghim tại tâm màn hình này</Text>
              </Pressable>
            </View>
          ) : null}

          {/* 4. FLOATING BOTTOM SHEET CARD (Google Maps style place details & confirm) */}
          <View
            style={[
              styles.bottomSheetCard,
              editingBottomAddress && keyboardHeight > 0 ? { bottom: keyboardHeight } : null,
            ]}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeaderRow}>
              <View style={styles.sheetHeaderLeft}>
                <Text style={styles.sheetTitle}>{label.replace(/\s*\*$/, '')}</Text>
                <Text style={styles.sheetCoordsText}>
                  GPS: {pinCoords.lat.toFixed(6)}, {pinCoords.lng.toFixed(6)}
                </Text>
              </View>
              {reverseLoading ? (
                <View style={styles.resolvingBadge}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.resolvingText}>Đang lấy địa chỉ...</Text>
                </View>
              ) : (
                <View style={styles.dragHintBadge}>
                  <Text style={styles.dragHintText}>Chạm bản đồ hoặc kéo ghim đỏ</Text>
                </View>
              )}
            </View>

            <TextInput
              value={resolvedAddress}
              onFocus={() => setEditingBottomAddress(true)}
              onBlur={() => setEditingBottomAddress(false)}
              onChangeText={(text) => {
                setResolvedAddress(text);
                skipNextAutocompleteRef.current = true;
                setQuery(text);
              }}
              placeholder="Địa chỉ điểm đón/trả (có thể ghi thêm số nhà, ghi chú)..."
              placeholderTextColor={COLORS.slate400}
              style={styles.sheetAddressInput}
              returnKeyType="done"
            />

            <Pressable style={styles.confirmBtn} onPress={handleConfirmSelection}>
              <Text style={styles.confirmBtnText}>Xác nhận điểm này</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldWrap: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: 6,
  },
  triggerBox: {
    minHeight: 58,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  triggerBoxDisabled: {
    opacity: 0.6,
  },
  triggerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pinDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  triggerTextCol: {
    flex: 1,
  },
  triggerText: {
    fontSize: 15,
    color: COLORS.navy,
    fontWeight: '600',
  },
  triggerPlaceholder: {
    color: COLORS.slate400,
    fontWeight: '400',
  },
  coordsCaption: {
    fontSize: 11,
    color: COLORS.tealDark,
    fontWeight: '600',
    marginTop: 2,
  },
  coordsHint: {
    fontSize: 11,
    color: COLORS.slate400,
    marginTop: 2,
  },
  mapQuickBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.primarySoft,
  },
  mapQuickBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  fullScreenRoot: {
    flex: 1,
    backgroundColor: '#E5E3DF',
  },
  floatingTopContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 24,
    left: 14,
    right: 14,
    zIndex: 20,
  },
  floatingSearchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    minHeight: 52,
    paddingLeft: 8,
    paddingRight: 8,
    shadowColor: '#0F172A',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.95)',
  },
  backIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIconText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.navy,
  },
  floatingSearchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.navy,
    fontWeight: '500',
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  iconActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearIconText: {
    fontSize: 14,
    color: COLORS.slate500,
    fontWeight: '700',
  },
  searchGoBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    marginLeft: 4,
  },
  searchGoBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  floatingChipsRow: {
    paddingTop: 10,
    paddingBottom: 4,
    gap: 8,
  },
  floatingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
  },
  floatingChipRecent: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    maxWidth: 180,
    gap: 5,
  },
  floatingChipRecentIcon: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
  },
  floatingChipRecentText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  floatingChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.navy,
  },
  floatingDropdownCard: {
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    maxHeight: 300,
    shadowColor: '#0F172A',
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    overflow: 'hidden',
  },
  dropdownScroll: {
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  searchingText: {
    fontSize: 13,
    color: COLORS.slate500,
    fontWeight: '500',
  },
  useTypedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 12,
    marginVertical: 6,
  },
  resultBadgeCustom: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultBadgeCustomText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  useTypedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  recentSectionInDropdown: {
    paddingTop: 6,
  },
  dropdownSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.slate400,
    letterSpacing: 0.5,
    marginBottom: 4,
    marginTop: 4,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  resultBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultBadgeRecent: {
    backgroundColor: '#ECFDF5',
  },
  resultBadgeText: {
    fontSize: 15,
  },
  resultBody: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.navy,
    lineHeight: 19,
  },
  resultSub: {
    fontSize: 12,
    color: COLORS.slate500,
    marginTop: 2,
  },
  jumpMapTag: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  closeDropdownBar: {
    alignItems: 'center',
    paddingVertical: 11,
  },
  closeDropdownText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  floatingRightControls: {
    position: 'absolute',
    right: 14,
    bottom: 242,
    gap: 10,
    zIndex: 15,
  },
  mapFab: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.95)',
  },
  mapFabText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.navy,
  },
  mapFabGps: {
    backgroundColor: '#FFFFFF',
  },
  mapFabGpsText: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },
  pinHereFloatingWrap: {
    position: 'absolute',
    bottom: 242,
    left: 16,
    right: 74,
    alignItems: 'center',
    zIndex: 15,
  },
  pinHereBtn: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    shadowColor: '#0F172A',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  pinHereBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  bottomSheetCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
    shadowColor: '#0F172A',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
    zIndex: 18,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  sheetHeaderLeft: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.navy,
  },
  sheetCoordsText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.tealDark,
    marginTop: 2,
  },
  resolvingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  resolvingText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  dragHintBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  dragHintText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.slate500,
  },
  sheetAddressInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    backgroundColor: COLORS.canvas,
    paddingHorizontal: 14,
    fontSize: 14,
    color: COLORS.navy,
    fontWeight: '600',
    marginBottom: 12,
  },
  confirmBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
