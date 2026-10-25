import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ApiError } from '../src/api/client';
import { useAuth } from '../src/session/AuthContext';

export default function LoginScreen() {
  const { signIn, loading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Email và mật khẩu không được để trống.');
      return;
    }
    try {
      await signIn(email.trim(), password);
      // Navigation is handled by _layout.tsx via session state change
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.statusCode === 401 ? 'Sai email hoặc mật khẩu.' : e.message);
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
      <View style={styles.card}>
        {/* Header */}
        <Text style={styles.brand}>RIDESHAREHUB</Text>
        <Text style={styles.heading}>Đăng nhập</Text>

        {/* Error banner */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Fields */}
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
          placeholder="••••••••"
          placeholderTextColor="#9ba8b0"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!loading}
          onSubmitEditing={handleLogin}
          returnKeyType="done"
        />

        {/* Login button */}
        <Pressable
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Đăng nhập"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Đăng nhập</Text>
          )}
        </Pressable>

        {/* Register link */}
        <Pressable
          style={styles.linkRow}
          onPress={() => router.push('/register')}
          accessibilityRole="link"
        >
          <Text style={styles.linkText}>
            Chưa có tài khoản?{' '}
            <Text style={styles.link}>Đăng ký</Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const C = {
  bg: '#0f172a',
  card: '#1e293b',
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  surface: '#334155',
  text: '#f1f5f9',
  muted: '#94a3b8',
  error: '#ef4444',
  errorBg: '#450a0a',
} as const;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
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
  heading: {
    color: C.text,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
  },
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
