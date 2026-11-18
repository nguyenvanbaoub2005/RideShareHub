/**
 * SP2-P2: Passenger Profile & Account screen (Figma PA-16) backed by real /api/v1/auth/me & DB bookings.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  ApiError,
  type BookingRecord,
  getMyBookings,
  getMyProfile,
  updateMyProfile,
  type UserProfile,
} from '../../src/api/client';
import { useAuth } from '../../src/session/AuthContext';
import {
  decodeAccessTokenClaims,
  deriveDisplayNameAndInitials,
} from '../../src/session/jwt';
import {
  Card,
  ChevronRightGlyph,
  EditGlyph,
  InfoGlyph,
  KeyValueRow,
  LogOutGlyph,
  PassengerTabBar,
  PhoneGlyph,
  SectionHeading,
  TicketGlyph,
  UserGlyph,
} from '../../src/components/UI';
import { CARD_SHADOW, COLORS } from '../../src/theme/tokens';

export default function PassengerAccountScreen() {
  const { session, signOut, loading } = useAuth();
  const router = useRouter();

  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [fetchingStats, setFetchingStats] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftPhone, setDraftPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const loadAccountData = useCallback(async () => {
    if (!session?.accessToken) return;
    setFetchingStats(true);
    try {
      const [profileRes, bookingsRes] = await Promise.allSettled([
        getMyProfile(session.accessToken),
        getMyBookings(session.accessToken),
      ]);
      if (profileRes.status === 'fulfilled') {
        setProfileData(profileRes.value);
      }
      if (bookingsRes.status === 'fulfilled') {
        setBookings(bookingsRes.value);
      }
    } finally {
      setFetchingStats(false);
    }
  }, [session?.accessToken]);

  useFocusEffect(
    useCallback(() => {
      void loadAccountData();
    }, [loadAccountData]),
  );

  const claims = useMemo(
    () => decodeAccessTokenClaims(session?.accessToken),
    [session?.accessToken],
  );
  const profile = useMemo(
    () =>
      deriveDisplayNameAndInitials(
        profileData?.fullName ?? bookings[0]?.passengerName,
        profileData?.email ?? claims.email,
      ),
    [profileData?.fullName, profileData?.email, bookings, claims.email],
  );

  const stats = useMemo(() => {
    const upcoming = bookings.filter(
      b => b.status === 'PENDING' || b.status === 'CONFIRMED' || b.status === 'PICKED_UP',
    ).length;
    const completed = bookings.filter(b => b.status === 'COMPLETED').length;
    return {
      total: bookings.length,
      upcoming,
      completed,
    };
  }, [bookings]);

  function openEditModal() {
    setDraftName(profileData?.fullName ?? profile.displayName);
    setDraftPhone(profileData?.phone ?? '');
    setEditError(null);
    setEditModalOpen(true);
  }

  async function handleSaveProfile() {
    if (!session?.accessToken) return;
    if (draftName.trim().length < 2) {
      setEditError('Vui lòng nhập họ và tên hợp lệ.');
      return;
    }
    if (
      draftPhone.trim() &&
      !/^(0|\+84)\d{8,10}$/.test(draftPhone.replace(/\s+/g, ''))
    ) {
      setEditError('Số điện thoại không hợp lệ (vd: 0905123456).');
      return;
    }
    setSavingProfile(true);
    setEditError(null);
    try {
      const updated = await updateMyProfile(session.accessToken, {
        fullName: draftName.trim(),
        phone: draftPhone.trim() || null,
      });
      setProfileData(updated);
      setEditModalOpen(false);
    } catch (err: unknown) {
      setEditError(
        err instanceof ApiError ? err.message : 'Không thể cập nhật hồ sơ lúc này.',
      );
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Figma PA-16 Deep Navy Profile Hero */}
        <LinearGradient
          colors={['#0b1120', '#181446', '#0f172a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.9 }}
          style={styles.hero}
        >
          <StatusBar style="light" />
          <View style={styles.heroGlowPurple} />
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.initials}</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {profile.displayName}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {profileData?.email ?? claims.email ?? 'Hành khách RideShareHub'}
          </Text>
        </LinearGradient>

        {/* Overlapping 3-column Real DB Stat Strip */}
        <View style={styles.statStrip}>
          <Pressable
            style={styles.statCell}
            onPress={() => router.push('/(passenger)/bookings')}
          >
            {fetchingStats ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={styles.statNum}>{stats.completed}</Text>
            )}
            <Text style={styles.statLabel}>Hoàn thành</Text>
          </Pressable>

          <View style={styles.statDivider} />

          <Pressable
            style={styles.statCell}
            onPress={() => router.push('/(passenger)/bookings')}
          >
            <Text style={styles.statNum}>{stats.upcoming}</Text>
            <Text style={styles.statLabel}>Sắp tới</Text>
          </Pressable>

          <View style={styles.statDivider} />

          <Pressable
            style={styles.statCell}
            onPress={() => router.push('/(passenger)/bookings')}
          >
            <Text style={styles.statNum}>{stats.total}</Text>
            <Text style={styles.statLabel}>Tổng vé</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          {/* Personal Info Card */}
          <Card>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardSectionHeading}>Thông tin cá nhân</Text>
              <Pressable onPress={openEditModal} style={styles.editLinkBtn}>
                <EditGlyph size={14} color={COLORS.primary} />
                <Text style={styles.editLinkText}>Chỉnh sửa</Text>
              </Pressable>
            </View>

            <View style={styles.infoList}>
              <View style={styles.infoRow}>
                <UserGlyph size={18} color={COLORS.slate400} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoRowLabel}>Họ và tên</Text>
                  <Text style={styles.infoRowVal}>{profile.displayName}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <InfoGlyph size={18} color={COLORS.slate400} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoRowLabel}>Email</Text>
                  <Text style={styles.infoRowVal}>
                    {profileData?.email ?? claims.email ?? 'Chưa cập nhật'}
                  </Text>
                </View>
              </View>
              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <PhoneGlyph size={18} color={COLORS.slate400} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoRowLabel}>Số điện thoại</Text>
                  <Text style={styles.infoRowVal}>
                    {profileData?.phone || 'Chưa cập nhật (nhấn Chỉnh sửa)'}
                  </Text>
                </View>
              </View>
            </View>
          </Card>

          <Card>
            <SectionHeading>Lối tắt &amp; quy định</SectionHeading>
            <Pressable
              style={styles.shortcutRow}
              onPress={() => router.push('/(passenger)/bookings')}
            >
              <View style={styles.shortcutIcon}>
                <TicketGlyph size={18} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.shortcutTitle}>Quản lý vé đã đặt</Text>
                <Text style={styles.shortcutSub}>
                  Xem mã đặt chỗ, gọi tài xế hoặc hủy vé trước 30 phút
                </Text>
              </View>
              <ChevronRightGlyph size={18} color={COLORS.slate400} />
            </Pressable>

            <View style={styles.divider} />

            <KeyValueRow label="Đặt vé trực tuyến" value="Chốt trước 15 phút" />
            <KeyValueRow label="Hủy vé miễn phí" value="Trước 30 phút khởi hành" />
            <KeyValueRow label="Thanh toán" value="Trực tiếp cho tài xế" />
          </Card>

          <Pressable
            style={[styles.logoutBtn, loading && { opacity: 0.5 }]}
            onPress={() => setLogoutConfirmOpen(true)}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Đăng xuất"
          >
            <LogOutGlyph size={18} color={COLORS.danger} />
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </Pressable>
        </View>
      </ScrollView>

      <PassengerTabBar active="account" />

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditModalOpen(false)} />
          <View style={styles.modalCard}>
            <View style={styles.sheetHandle} />
            <Text style={styles.modalTitle}>Chỉnh sửa hồ sơ</Text>

            <Text style={styles.inputLabel}>Họ và tên *</Text>
            <TextInput
              style={styles.input}
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Nguyễn Minh Anh"
              placeholderTextColor={COLORS.slate400}
            />

            <Text style={styles.inputLabel}>Số điện thoại</Text>
            <TextInput
              style={styles.input}
              value={draftPhone}
              onChangeText={setDraftPhone}
              placeholder="0905 123 456"
              placeholderTextColor={COLORS.slate400}
              keyboardType="phone-pad"
            />

            {editError ? <Text style={styles.modalError}>{editError}</Text> : null}

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelModalBtn}
                onPress={() => setEditModalOpen(false)}
                disabled={savingProfile}
              >
                <Text style={styles.cancelModalText}>Hủy</Text>
              </Pressable>
              <Pressable
                style={[styles.saveModalBtn, savingProfile && { opacity: 0.6 }]}
                onPress={() => void handleSaveProfile()}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.saveModalText}>Lưu thay đổi</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Confirm Logout Modal */}
      <Modal
        visible={logoutConfirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutConfirmOpen(false)}
      >
        <View style={styles.centerBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Đăng xuất khỏi RideShareHub?</Text>
            <Text style={styles.confirmBody}>
              Bạn cần đăng nhập lại để tìm chuyến, đặt chỗ và xem vé của mình.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelModalBtn}
                onPress={() => setLogoutConfirmOpen(false)}
              >
                <Text style={styles.cancelModalText}>Ở lại</Text>
              </Pressable>
              <Pressable
                style={styles.dangerModalBtn}
                onPress={() => {
                  setLogoutConfirmOpen(false);
                  void signOut();
                }}
              >
                <Text style={styles.saveModalText}>Đăng xuất</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.canvas },
  scroll: { paddingBottom: 28 },
  hero: {
    paddingTop: 58,
    paddingBottom: 52,
    paddingHorizontal: 20,
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroGlowPurple: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(84, 56, 245, 0.34)',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  avatarText: { color: COLORS.navy, fontSize: 26, fontWeight: '800' },
  title: { color: '#ffffff', fontSize: 20, fontWeight: '800', marginTop: 12 },
  sub: { color: COLORS.slate300, fontSize: 13, marginTop: 2 },

  statStrip: {
    marginTop: -28,
    marginHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#eaedf3',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    ...CARD_SHADOW,
  },
  statCell: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 32, backgroundColor: '#edf1f7' },
  statNum: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: 11, fontWeight: '600', color: COLORS.slate500, marginTop: 2 },

  body: { padding: 16, gap: 14 },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardSectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: COLORS.slate500,
  },
  editLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 2 },
  editLinkText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  infoList: { marginTop: 2 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoRowLabel: { fontSize: 11, color: COLORS.slate500 },
  infoRowVal: { fontSize: 14, fontWeight: '600', color: COLORS.navy, marginTop: 1 },

  shortcutRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shortcutIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutTitle: { fontSize: 14, fontWeight: '700', color: COLORS.navy },
  shortcutSub: { fontSize: 12, color: COLORS.slate500, marginTop: 2, lineHeight: 16 },
  divider: { height: 1, backgroundColor: '#edf1f7', marginVertical: 10 },

  logoutBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
    height: 50,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: { color: COLORS.danger, fontSize: 15, fontWeight: '700' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 32,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.slate300,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.navy, marginBottom: 8 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.navy, marginTop: 12, marginBottom: 6 },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: COLORS.canvas,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.navy,
  },
  modalError: { color: COLORS.danger, fontSize: 13, fontWeight: '600', marginTop: 10 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancelModalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalText: { fontSize: 14, fontWeight: '700', color: COLORS.navy },
  saveModalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerModalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveModalText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },

  centerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  confirmCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 20,
  },
  confirmTitle: { fontSize: 17, fontWeight: '800', color: COLORS.navy },
  confirmBody: { fontSize: 13, color: COLORS.slate500, marginTop: 6, lineHeight: 19 },
});
