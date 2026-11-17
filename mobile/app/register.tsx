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

export default function RegisterScreen() {
  const { signUp, loading } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [role] = useState<Role>('PASSENGER');
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    setError(null);
    if (!fullName.trim() || !email.trim() || !password) {
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
    if (!agreedToTerms) {
      setError('Vui lòng đồng ý với Điều khoản sử dụng.');
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
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <Pressable style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Quay lại">
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        {/* Heading */}
        <Text style={styles.heading}>Tạo tài khoản</Text>
        <Text style={styles.sub}>Chỉ mất một phút để bắt đầu hành trình.</Text>

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠ {error}</Text>
          </View>
        )}

        {/* Họ và tên */}
        <Text style={styles.label}>Họ và tên</Text>
        <TextInput
          style={styles.input}
          placeholder="Nguyễn Minh Anh"
          placeholderTextColor={C.placeholder}
          value={fullName}
          onChangeText={setFullName}
          editable={!loading}
          autoCapitalize="words"
        />

        {/* Email */}
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="minhanh@email.com"
          placeholderTextColor={C.placeholder}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />

        {/* Số điện thoại */}
        <Text style={styles.label}>Số điện thoại</Text>
        <TextInput
          style={styles.input}
          placeholder="0905 123 456"
          placeholderTextColor={C.placeholder}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          editable={!loading}
        />

        {/* Mật khẩu */}
        <Text style={styles.label}>Mật khẩu</Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.inputInner}
            placeholder="Tối thiểu 8 ký tự"
            placeholderTextColor={C.placeholder}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            editable={!loading}
          />
          <Pressable style={styles.eyeBtn} onPress={() => setShowPassword(v => !v)}>
            <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
          </Pressable>
        </View>

        {/* Xác nhận mật khẩu */}
        <Text style={styles.label}>Xác nhận mật khẩu</Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.inputInner}
            placeholder="Nhập lại mật khẩu"
            placeholderTextColor={C.placeholder}
            secureTextEntry={!showConfirm}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!loading}
            returnKeyType="done"
            onSubmitEditing={handleRegister}
          />
          <Pressable style={styles.eyeBtn} onPress={() => setShowConfirm(v => !v)}>
            <Text style={styles.eyeIcon}>{showConfirm ? '🙈' : '👁'}</Text>
          </Pressable>
        </View>

        {/* Terms */}
        <Pressable
          style={styles.termsRow}
          onPress={() => setAgreedToTerms(v => !v)}
          disabled={loading}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreedToTerms }}
        >
          <View style={[styles.checkbox, agreedToTerms && styles.checkboxActive]}>
            {agreedToTerms && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.termsText}>
            Tôi đồng ý với{' '}
            <Text style={styles.termsLink}>Điều khoản sử dụng</Text>
          </Text>
        </Pressable>

        {/* Register button */}
        <Pressable
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Tạo tài khoản"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Tạo tài khoản</Text>
          )}
        </Pressable>

        {/* Login link */}
        <Pressable
          style={styles.linkRow}
          onPress={() => router.back()}
          accessibilityRole="link"
        >
          <Text style={styles.linkText}>
            Đã có tài khoản?{' '}
            <Text style={styles.link}>Đăng nhập</Text>
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
} as const;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 48,
  },

  // Back
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  backIcon: { fontSize: 22, color: C.text, lineHeight: 28, marginLeft: -2 },

  // Heading
  heading: { color: C.text, fontSize: 28, fontWeight: '700', marginBottom: 6, letterSpacing: -0.3 },
  sub: { color: C.sub, fontSize: 15, marginBottom: 24, lineHeight: 22 },

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
  label: { color: C.text, fontSize: 14, fontWeight: '500', marginBottom: 8, marginTop: 16 },
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
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 14 },
  eyeIcon: { fontSize: 18 },

  // Terms
  termsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 10 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: C.primary, borderColor: C.primary },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  termsText: { flex: 1, color: C.sub, fontSize: 14 },
  termsLink: { color: C.primary, fontWeight: '600' },

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

  // Login link
  linkRow: { alignItems: 'center', marginTop: 32 },
  linkText: { color: C.sub, fontSize: 14 },
  link: { color: C.primary, fontWeight: '700' },
});
