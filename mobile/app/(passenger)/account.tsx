import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../src/session/AuthContext';
import { Card, KeyValueRow, PassengerTabBar, SectionHeading } from '../../src/components/UI';
import { COLORS } from '../../src/theme/tokens';

export default function PassengerAccountScreen() {
  const { session, signOut, loading } = useAuth();

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>HK</Text>
          </View>
          <View>
            <Text style={styles.title}>Tài khoản hành khách</Text>
            <Text style={styles.sub}>RideShareHub Mobile</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Card>
            <SectionHeading>Phiên đăng nhập</SectionHeading>
            <KeyValueRow label="Vai trò" value={session?.role ?? 'PASSENGER'} />
            <KeyValueRow label="Trạng thái" value="Đang hoạt động" />
          </Card>

          <Pressable
            style={[styles.logoutBtn, loading && { opacity: 0.5 }]}
            onPress={signOut}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Đăng xuất"
          >
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </Pressable>
        </View>
      </ScrollView>

      <PassengerTabBar active="account" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.canvas },
  scroll: { paddingBottom: 24 },
  hero: {
    backgroundColor: COLORS.navy,
    paddingTop: 58,
    paddingBottom: 28,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.navy, fontSize: 18, fontWeight: '800' },
  title: { color: '#ffffff', fontSize: 20, fontWeight: '800' },
  sub: { color: COLORS.slate300, fontSize: 13, marginTop: 2 },
  body: { padding: 16, gap: 16 },
  logoutBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: { color: COLORS.danger, fontSize: 15, fontWeight: '700' },
});
