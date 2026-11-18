import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ApiError } from '../src/api/client';
import { useAuth } from '../src/session/AuthContext';
import { COLORS } from '../src/theme/tokens';

type Role = 'PASSENGER' | 'TRANSPORT_COMPANY';

const ROLES: { value: Role; label: string; desc: string }[] = [
  { value: 'PASSENGER', label: 'Hành khách', desc: 'Tìm và đặt chuyến xe' },
  { value: 'TRANSPORT_COMPANY', label: 'Nhà xe', desc: 'Quản lý xe và chuyến đi' },
];

export default function RegisterScreen() {
  const { signUp, loading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role>('PASSENGER');
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    setError(null);
    if (!email.trim() || !password || !fullName.trim()) {
      setError('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    try {
      await signUp(email.trim(), password, fullName.trim(), role);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.statusCode === 409 ? 'Email này đã được đăng ký.' : e.message);
      } else {
        setError('Không thể kết nối tới máy chủ. Thử lại sau.');
      }
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <Text style={styles.backGlyph}>←</Text>
        </Pressable>

        <Text style={styles.heading}>Tạo tài khoản</Text>
        <Text style={styles.sub}>Chỉ mất một phút để bắt đầu hành trình.</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Họ và tên</Text>
        <TextInput
          style={styles.input}
          placeholder="Nguyễn Minh Anh"
          placeholderTextColor={COLORS.slate400}
          value={fullName}
          onChangeText={setFullName}
          editable={!loading}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="minhanh@email.com"
          placeholderTextColor={COLORS.slate400}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />

        <Text style={styles.label}>Mật khẩu</Text>
        <TextInput
          style={styles.input}
          placeholder="Tối thiểu 8 ký tự"
          placeholderTextColor={COLORS.slate400}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!loading}
        />

        <Text style={styles.label}>Xác nhận mật khẩu</Text>
        <TextInput
          style={styles.input}
          placeholder="Nhập lại mật khẩu"
          placeholderTextColor={COLORS.slate400}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          editable={!loading}
        />

        <Text style={styles.label}>Loại tài khoản</Text>
        <View style={styles.roleRow}>
          {ROLES.map(r => {
            const active = role === r.value;
            return (
              <Pressable
                key={r.value}
                style={[styles.roleCard, active && styles.roleCardActive]}
                onPress={() => setRole(r.value)}
                disabled={loading}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.roleLabel, active && styles.roleLabelActive]}>{r.label}</Text>
                <Text style={styles.roleDesc}>{r.desc}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Đăng ký"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Tạo tài khoản</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.linkRow}
          onPress={() => router.back()}
          accessibilityRole="link"
        >
          <Text style={styles.linkText}>
            Đã có tài khoản? <Text style={styles.link}>Đăng nhập</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.canvas },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 52, paddingBottom: 36 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  backGlyph: { fontSize: 18, fontWeight: '700', color: COLORS.navy },
  heading: { color: COLORS.navy, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  sub: { color: COLORS.slate500, fontSize: 15, marginTop: 6, marginBottom: 12 },
  errorBox: {
    backgroundColor: COLORS.dangerSoft,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { color: COLORS.danger, fontSize: 13, fontWeight: '500' },
  label: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    color: COLORS.navy,
    fontSize: 15,
  },
  roleRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  roleCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: COLORS.line,
  },
  roleCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  roleLabel: { color: COLORS.navy, fontSize: 14, fontWeight: '700' },
  roleLabelActive: { color: COLORS.primary },
  roleDesc: { color: COLORS.slate500, fontSize: 11, marginTop: 4, lineHeight: 15 },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  linkRow: { alignItems: 'center', marginTop: 22 },
  linkText: { color: COLORS.slate600, fontSize: 14 },
  link: { color: COLORS.primary, fontWeight: '700' },
});
