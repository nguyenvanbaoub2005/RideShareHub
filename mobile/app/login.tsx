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
import { BrandLogo } from '../src/components/UI';
import { COLORS } from '../src/theme/tokens';

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
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.statusCode === 401 ? 'Email hoặc mật khẩu không đúng.' : e.message);
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
        <BrandLogo size={56} />
        <Text style={styles.heading}>Chào mừng trở lại</Text>
        <Text style={styles.sub}>Đăng nhập để tìm chuyến xe ghép hoặc theo dõi lịch chạy.</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={COLORS.slate400}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            editable={!loading}
          />

          <Text style={styles.label}>Mật khẩu</Text>
          <View style={styles.pwWrap}>
            <TextInput
              style={[styles.input, styles.pwInput]}
              placeholder="Nhập mật khẩu"
              placeholderTextColor={COLORS.slate400}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              editable={!loading}
              onSubmitEditing={handleLogin}
              returnKeyType="done"
            />
            <Pressable
              style={styles.pwToggle}
              onPress={() => setShowPassword(v => !v)}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              <Text style={styles.pwToggleText}>{showPassword ? 'Ẩn' : 'Hiện'}</Text>
            </Pressable>
          </View>

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
        </View>

        <View style={styles.footerLink}>
          <Pressable
            onPress={() => router.push('/register')}
            accessibilityRole="link"
          >
            <Text style={styles.linkText}>
              Chưa có tài khoản? <Text style={styles.link}>Đăng ký ngay</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.canvas },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 68, paddingBottom: 32 },
  heading: {
    color: COLORS.navy,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 24,
  },
  sub: {
    color: COLORS.slate500,
    fontSize: 15,
    marginTop: 8,
    lineHeight: 22,
  },
  errorBox: {
    backgroundColor: COLORS.dangerSoft,
    borderRadius: 12,
    padding: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { color: COLORS.danger, fontSize: 13, fontWeight: '500' },
  form: { marginTop: 28 },
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
  pwWrap: { position: 'relative' },
  pwInput: { paddingRight: 60 },
  pwToggle: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  pwToggleText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
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
  footerLink: { marginTop: 'auto', paddingTop: 32, alignItems: 'center' },
  linkText: { color: COLORS.slate600, fontSize: 14 },
  link: { color: COLORS.primary, fontWeight: '700' },
});
