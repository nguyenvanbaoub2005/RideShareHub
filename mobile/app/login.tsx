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

export default function LoginScreen() {
  const { signIn, loading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Email và mật khẩu không được để trống.');
      return;
    }
    try {
      await signIn(email.trim(), password);
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
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoBox}>
            <Text style={styles.logoIcon}>🚌</Text>
          </View>
          <View style={styles.logoDot} />
        </View>

        {/* Heading */}
        <Text style={styles.heading}>Chào mừng trở lại</Text>
        <Text style={styles.sub}>Đăng nhập để tìm và đặt chuyến xe ghép.</Text>

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠ {error}</Text>
          </View>
        )}

        {/* Email */}
        <Text style={styles.label}>Email hoặc số điện thoại</Text>
        <TextInput
          style={styles.input}
          placeholder="0905 123 456"
          placeholderTextColor={C.placeholder}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />

        {/* Password */}
        <Text style={styles.label}>Mật khẩu</Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.inputInner}
            placeholder="Nhập mật khẩu"
            placeholderTextColor={C.placeholder}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            editable={!loading}
            onSubmitEditing={handleLogin}
            returnKeyType="done"
          />
          <Pressable
            style={styles.eyeBtn}
            onPress={() => setShowPassword(v => !v)}
            accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
          </Pressable>
        </View>

        {/* Forgot password */}
        <Pressable style={styles.forgotRow} accessibilityRole="link">
          <Text style={styles.forgotText}>Quên mật khẩu?</Text>
        </Pressable>

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
            <Text style={styles.link}>Đăng ký ngay</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const C = {
  bg: '#ffffff',
  text: '#0f172a',
  sub: '#64748b',
  primary: '#2563eb',
  placeholder: '#94a3b8',
  border: '#e2e8f0',
  inputBg: '#f8fafc',
  error: '#dc2626',
  errorBg: '#fef2f2',
  logoBg: '#2563eb',
  dotGreen: '#22c55e',
  forgot: '#2563eb',
} as const;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 48,
  },

  // Logo
  logoWrap: {
    width: 64,
    height: 64,
    marginBottom: 32,
  },
  logoBox: {
    width: 56,
    height: 56,
    backgroundColor: C.logoBg,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: { fontSize: 28 },
  logoDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    backgroundColor: C.dotGreen,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: C.bg,
  },

  // Heading
  heading: {
    color: C.text,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  sub: {
    color: C.sub,
    fontSize: 15,
    marginBottom: 32,
    lineHeight: 22,
  },

  // Error
  errorBox: {
    backgroundColor: C.errorBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  errorText: { color: C.error, fontSize: 14, lineHeight: 20 },

  // Fields
  label: {
    color: C.text,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: C.text,
    fontSize: 15,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
  },
  inputInner: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: C.text,
    fontSize: 15,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  eyeIcon: { fontSize: 18 },

  // Forgot
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: 10,
    marginBottom: 4,
  },
  forgotText: {
    color: C.forgot,
    fontSize: 14,
    fontWeight: '600',
  },

  // Button
  btn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: C.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },

  // Register link
  linkRow: { alignItems: 'center', marginTop: 32 },
  linkText: { color: C.sub, fontSize: 14 },
  link: { color: C.primary, fontWeight: '700' },
});
