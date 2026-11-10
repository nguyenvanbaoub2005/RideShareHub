/**
 * SP2-P1-03: Passenger home — search form.
 *
 * Fields: origin, destination, date (YYYY-MM-DD), minSeats.
 * All fields optional — blank search returns all PUBLISHED trips.
 * Navigates to /(passenger)/results with serialised params.
 */

import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../../src/session/AuthContext';

export default function PassengerHomeScreen() {
  const { session, signOut, loading } = useAuth();
  const router = useRouter();

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [minSeats, setMinSeats] = useState('');

  function handleSearch() {
    router.push({
      pathname: '/(passenger)/results',
      params: {
        origin: origin.trim(),
        destination: destination.trim(),
        date: date.trim(),
        minSeats: minSeats.trim(),
      },
    });
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>RIDESHAREHUB</Text>
          <Text style={styles.role}>🚌 Hành khách</Text>
        </View>

        {/* Search card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tìm chuyến xe</Text>

          <Text style={styles.label}>Điểm đi</Text>
          <TextInput
            style={styles.input}
            placeholder="VD: Hà Nội"
            placeholderTextColor="#475569"
            value={origin}
            onChangeText={setOrigin}
            returnKeyType="next"
            autoCapitalize="words"
          />

          <Text style={styles.label}>Điểm đến</Text>
          <TextInput
            style={styles.input}
            placeholder="VD: Đà Nẵng"
            placeholderTextColor="#475569"
            value={destination}
            onChangeText={setDestination}
            returnKeyType="next"
            autoCapitalize="words"
          />

          <Text style={styles.label}>Ngày khởi hành</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD (bỏ trống = tất cả)"
            placeholderTextColor="#475569"
            value={date}
            onChangeText={setDate}
            keyboardType="numbers-and-punctuation"
            returnKeyType="next"
            maxLength={10}
          />

          <Text style={styles.label}>Số ghế tối thiểu</Text>
          <TextInput
            style={styles.input}
            placeholder="1"
            placeholderTextColor="#475569"
            value={minSeats}
            onChangeText={setMinSeats}
            keyboardType="number-pad"
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />

          <Pressable
            style={styles.searchBtn}
            onPress={handleSearch}
            accessibilityRole="button"
            accessibilityLabel="Tìm kiếm chuyến xe"
          >
            <Text style={styles.searchBtnText}>🔍  Tìm kiếm</Text>
          </Pressable>
        </View>

        {/* My Bookings (SP2-P2-03) */}
        <Pressable
          style={styles.bookingsBtn}
          onPress={() => router.push('/(passenger)/bookings')}
          accessibilityRole="button"
          accessibilityLabel="Xem danh sách vé đã đặt"
        >
          <Text style={styles.bookingsBtnText}>🎫  Vé đã đặt của tôi</Text>
        </Pressable>

        {/* Sign-out */}
        <Pressable
          style={[styles.logoutBtn, loading && { opacity: 0.5 }]}
          onPress={signOut}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Đăng xuất"
        >
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0f172a' },
  root: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  brand: { color: '#6366f1', fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  role: { color: '#94a3b8', fontSize: 13 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
  },
  cardTitle: {
    color: '#f1f5f9',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  label: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#f1f5f9',
    fontSize: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  searchBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  bookingsBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  bookingsBtnText: { color: '#a5b4fc', fontSize: 15, fontWeight: '700' },
  logoutBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  logoutText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
});
