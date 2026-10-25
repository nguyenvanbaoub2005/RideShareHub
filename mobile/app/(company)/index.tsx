import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../src/session/AuthContext';

export default function CompanyHomeScreen() {
  const { signOut, loading } = useAuth();

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.brand}>RIDESHAREHUB</Text>
        <Text style={styles.role}>🏢 Công ty vận tải</Text>
      </View>

      <View style={styles.hero}>
        <Text style={styles.greeting}>Bảng điều khiển</Text>
        <Text style={styles.hint}>Quản lý xe và chuyến đi sẽ có ở đây (Sprint 1 – SP1-P2-02)</Text>
      </View>

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
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a', paddingHorizontal: 24, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 },
  brand: { color: '#6366f1', fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  role: { color: '#94a3b8', fontSize: 13 },
  hero: { backgroundColor: '#1e293b', borderRadius: 20, padding: 28, marginBottom: 24 },
  greeting: { color: '#f1f5f9', fontSize: 28, fontWeight: '700' },
  hint: { color: '#64748b', fontSize: 13, marginTop: 16, lineHeight: 20 },
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
