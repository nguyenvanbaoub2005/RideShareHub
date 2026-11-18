import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../src/session/AuthContext';
import { BrandLogo, Card } from '../../src/components/UI';
import { COLORS } from '../../src/theme/tokens';

export default function AdminHome() {
  const { signOut, loading } = useAuth();
  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <BrandLogo size={44} inverted />
        <View>
          <Text style={styles.brand}>RideShareHub</Text>
          <Text style={styles.role}>Trung tâm quản trị</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Card>
          <Text style={styles.title}>Dành cho ứng dụng Web Admin</Text>
          <Text style={styles.text}>
            Phê duyệt hồ sơ nhà xe và giám sát vận hành được thực hiện trên cổng Web quản trị.
          </Text>
        </Card>
        <Pressable
          style={[styles.logoutBtn, loading && { opacity: 0.5 }]}
          onPress={signOut}
          disabled={loading}
        >
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.canvas },
  hero: {
    backgroundColor: COLORS.navy,
    paddingTop: 60,
    paddingBottom: 28,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  brand: { color: '#ffffff', fontSize: 20, fontWeight: '800' },
  role: { color: COLORS.teal, fontSize: 13, fontWeight: '600', marginTop: 2 },
  body: { padding: 20, gap: 16 },
  title: { color: COLORS.navy, fontSize: 18, fontWeight: '700' },
  text: { color: COLORS.slate500, fontSize: 14, marginTop: 8, lineHeight: 21 },
  logoutBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutText: { color: COLORS.danger, fontSize: 15, fontWeight: '600' },
});
