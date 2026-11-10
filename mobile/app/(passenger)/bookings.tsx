/**
 * SP2-P2-03: Passenger Bookings Screen — view booking status & cancel bookings.
 *
 * Route: /(passenger)/bookings
 */

import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ApiError,
  type BookingRecord,
  type BookingStatus,
  cancelBooking,
  generateIdempotencyKey,
  getMyBookings,
} from '../../src/api/client';
import { useAuth } from '../../src/session/AuthContext';
import { formatDeparture, formatVND } from '../../src/trips/tripFormatters';

function statusMeta(status: BookingStatus): { label: string; color: string; bg: string } {
  switch (status) {
    case 'CONFIRMED':
      return { label: 'Đã xác nhận', color: '#34d399', bg: '#064e3b' };
    case 'PENDING':
      return { label: 'Chờ xác nhận', color: '#fbbf24', bg: '#451a03' };
    case 'PICKED_UP':
      return { label: 'Đã lên xe', color: '#60a5fa', bg: '#1e3a8a' };
    case 'COMPLETED':
      return { label: 'Hoàn thành', color: '#a5b4fc', bg: '#312e81' };
    case 'CANCELLED':
      return { label: 'Đã hủy', color: '#f87171', bg: '#450a0a' };
    case 'NO_SHOW':
      return { label: 'Vắng mặt', color: '#94a3b8', bg: '#1e293b' };
  }
}

export default function PassengerBookingsScreen() {
  const router = useRouter();
  const { session } = useAuth();

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const list = await getMyBookings(session.accessToken);
      setBookings(list);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiError
          ? err.message
          : 'Không thể tải danh sách vé đã đặt',
      );
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  async function handleCancelBooking(bookingId: number) {
    if (!session?.accessToken) return;
    setCancellingId(bookingId);
    setActionError(null);
    try {
      const updated = await cancelBooking(
        session.accessToken,
        bookingId,
        generateIdempotencyKey('cancel'),
        'Hành khách chủ động hủy vé',
      );
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? updated : b)),
      );
      setConfirmCancelId(null);
    } catch (err: unknown) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : 'Không thể hủy vé lúc này. Vui lòng thử lại.',
      );
    } finally {
      setCancellingId(null);
    }
  }

  function renderHeader() {
    return (
      <View style={styles.headerBox}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <Text style={styles.back}>← Quay lại</Text>
        </Pressable>
        <Text style={styles.title}>Vé đã đặt của tôi</Text>
        {actionError ? (
          <View style={styles.actionErrorBox}>
            <Text style={styles.actionErrorText}>⚠️ {actionError}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  function renderBookingItem({ item }: { item: BookingRecord }) {
    const badge = statusMeta(item.status);
    const canCancel = item.status === 'CONFIRMED' || item.status === 'PENDING';
    const isConfirming = confirmCancelId === item.id;
    const isCancelling = cancellingId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.bookingCode}>{item.bookingCode}</Text>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>
              {badge.label}
            </Text>
          </View>
        </View>

        <Text style={styles.routeText}>
          {item.origin} → {item.destination}
        </Text>
        <Text style={styles.depText}>{formatDeparture(item.departureTime)}</Text>

        <View style={styles.detailBox}>
          <Text style={styles.detailRow}>📍 Đón: {item.pickup.label}</Text>
          <Text style={styles.detailRow}>🏁 Trả: {item.dropoff.label}</Text>
          <Text style={styles.detailRow}>
            🚌 {item.companyName} • {item.vehicleType} ({item.vehiclePlate})
          </Text>
          <Text style={styles.detailRow}>👤 Tài xế: {item.driverName}</Text>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.seatText}>💺 {item.seatCount} ghế</Text>
          <Text style={styles.fareText}>{formatVND(item.fareEstimate)}</Text>
        </View>

        {item.cancelReason ? (
          <Text style={styles.cancelReasonText}>
            Lý do hủy: {item.cancelReason}
          </Text>
        ) : null}

        {canCancel ? (
          isConfirming ? (
            <View style={styles.confirmRow}>
              <Text style={styles.confirmPrompt}>
                Bạn chắc chắn muốn hủy vé này?
              </Text>
              <View style={styles.confirmActions}>
                <Pressable
                  style={styles.keepBtn}
                  onPress={() => setConfirmCancelId(null)}
                  disabled={isCancelling}
                >
                  <Text style={styles.keepBtnText}>Giữ vé</Text>
                </Pressable>
                <Pressable
                  style={styles.dangerBtn}
                  onPress={() => handleCancelBooking(item.id)}
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.dangerBtnText}>Xác nhận hủy</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={styles.cancelBtn}
              onPress={() => {
                setActionError(null);
                setConfirmCancelId(item.id);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Hủy vé ${item.bookingCode}`}
            >
              <Text style={styles.cancelBtnText}>Hủy đặt vé</Text>
            </Pressable>
          )
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {loading ? (
        <View style={styles.center}>
          {renderHeader()}
          <ActivityIndicator color="#6366f1" size="large" style={{ marginTop: 48 }} />
          <Text style={styles.loadingText}>Đang tải danh sách vé…</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.center}>
          {renderHeader()}
          <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
          <Pressable style={styles.retryBtn} onPress={loadBookings}>
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(b) => String(b.id)}
          ListHeaderComponent={renderHeader()}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🎫</Text>
              <Text style={styles.emptyText}>
                Bạn chưa có đặt chỗ nào.{'\n'}Hãy tìm chuyến xe và đặt vé ngay!
              </Text>
            </View>
          }
          renderItem={renderBookingItem}
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
  title: { color: '#f1f5f9', fontSize: 22, fontWeight: '700' },
  list: { paddingHorizontal: 24, paddingBottom: 40 },

  actionErrorBox: {
    backgroundColor: '#450a0a',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  actionErrorText: { color: '#fca5a5', fontSize: 13 },

  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bookingCode: { color: '#94a3b8', fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '700' },

  routeText: { color: '#f1f5f9', fontSize: 17, fontWeight: '700' },
  depText: { color: '#6366f1', fontSize: 13, marginTop: 4, marginBottom: 12 },

  detailBox: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  detailRow: { color: '#cbd5e1', fontSize: 13, marginBottom: 4 },

  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seatText: { color: '#e2e8f0', fontSize: 14, fontWeight: '600' },
  fareText: { color: '#10b981', fontSize: 17, fontWeight: '800' },
  cancelReasonText: { color: '#f87171', fontSize: 12, marginTop: 8 },

  cancelBtn: {
    marginTop: 14,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  cancelBtnText: { color: '#ef4444', fontSize: 13, fontWeight: '700' },

  confirmRow: {
    marginTop: 14,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  confirmPrompt: { color: '#fca5a5', fontSize: 13, marginBottom: 10, fontWeight: '600' },
  confirmActions: { flexDirection: 'row', gap: 10 },
  keepBtn: {
    flex: 1,
    backgroundColor: '#334155',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  keepBtnText: { color: '#f1f5f9', fontSize: 13, fontWeight: '600' },
  dangerBtn: {
    flex: 1,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  dangerBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  loadingText: { color: '#64748b', textAlign: 'center', marginTop: 12 },
  errorText: { color: '#ef4444', textAlign: 'center', marginTop: 32, fontSize: 14 },
  retryBtn: {
    marginTop: 16,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  retryText: { color: '#fff', fontWeight: '600' },
  emptyBox: { alignItems: 'center', paddingTop: 48 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 14, lineHeight: 22 },
});

