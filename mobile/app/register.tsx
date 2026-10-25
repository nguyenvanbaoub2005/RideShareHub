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

type Role = 'PASSENGER' | 'TRANSPORT_COMPANY';

const ROLES: { value: Role; label: string; desc: string }[] = [
  { value: 'PASSENGER', label: '🚌 Hành khách', desc: 'Tìm và đặt chuyến xe' },
  { value: 'TRANSPORT_COMPANY', label: '🏢 Công ty vận tải', desc: 'Quản lý xe và chuyến đi' },
];

export default function RegisterScreen() {
  const { signUp, loading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    try {
      await signUp(email.trim(), password, fullName.trim(), role);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(
          e.statusCode === 409
            ? 'Email này đã được đăng ký.'
            : e.message,
        );
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
        <View style={styles.card}>
          <Text style={styles.brand}>RIDESHAREHUB</Text>
          <Text style={styles.heading}>Tạo tài khoản</Text>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.label}>Họ và tên</Text>
          <TextInput
            style={styles.input}
            placeholder="Nguyễn Văn A"
            placeholderTextColor="#9ba8b0"
            value={fullName}
            onChangeText={setFullName}
            editable={!loading}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#9ba8b0"
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
            placeholderTextColor="#9ba8b0"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!loading}
          />

          {/* Role picker */}
          <Text style={styles.label}>Loại tài khoản</Text>
          <View style={styles.roleRow}>
            {ROLES.map((r) => (
              <Pressable
                key={r.value}
                style={[styles.roleCard, role === r.value && styles.roleCardActive]}
                onPress={() => setRole(r.value)}
                disabled={loading}
                accessibilityRole="radio"
                accessibilityState={{ selected: role === r.value }}
              >
                <Text style={styles.roleLabel}>{r.label}</Text>
                <Text style={styles.roleDesc}>{r.desc}</Text>
              </Pressable>
            ))}
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
              <Text style={styles.btnText}>Đăng ký</Text>
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
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const C = {
  bg: '#0f172a',
  card: '#1e293b',
  primary: '#6366f1',
  surface: '#334155',
  surfaceActive: '#4338ca',
  text: '#f1f5f9',
  muted: '#94a3b8',
  error: '#ef4444',
  errorBg: '#450a0a',
} as const;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 },
  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 28,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  brand: {
    color: C.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 8,
  },
  heading: { color: C.text, fontSize: 28, fontWeight: '700', marginBottom: 24 },
  errorBox: {
    backgroundColor: C.errorBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.error,
  },
  errorText: { color: C.error, fontSize: 14 },
  label: {
    color: C.muted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: C.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: C.text,
    fontSize: 15,
  },
  roleRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  roleCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roleCardActive: {
    borderColor: C.primary,
    backgroundColor: '#312e81',
  },
  roleLabel: { color: C.text, fontSize: 13, fontWeight: '700' },
  roleDesc: { color: C.muted, fontSize: 11, marginTop: 4 },
  btn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 24,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  linkRow: { alignItems: 'center', marginTop: 20 },
  linkText: { color: C.muted, fontSize: 14 },
  link: { color: C.primary, fontWeight: '700' },
});
