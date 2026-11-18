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
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ApiError } from '../src/api/client';
import { useAuth } from '../src/session/AuthContext';
import { EyeGlyph, UserGlyph } from '../src/components/UI';
import { COLORS, PRIMARY_SHADOW } from '../src/theme/tokens';

export default function RegisterScreen() {
  const { signUp, loading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    setError(null);
    if (!email.trim() || !password || !fullName.trim()) {
      setError('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    if (phone.trim() && !/^(0|\+84)\d{8,10}$/.test(phone.replace(/\s+/g, ''))) {
      setError('Số điện thoại không hợp lệ (vd: 0905 123 456).');
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
      await signUp(email.trim(), password, fullName.trim(), 'PASSENGER', phone.trim() || undefined);
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
      <StatusBar style="dark" />
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

        <Text style={styles.heading}>Đăng ký hành khách</Text>
        <Text style={styles.sub}>Tạo tài khoản Hành khách để tìm chuyến và đặt vé xe ghép.</Text>

        {/* Role policy notice */}
        <View style={styles.noticeBox}>
          <View style={styles.noticeBadge}>
            <UserGlyph size={16} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.noticeTitle}>Tài khoản dành cho Hành khách</Text>
            <Text style={styles.noticeDesc}>
              • <Text style={{ fontWeight: '700' }}>Tài xế:</Text> do Nhà xe tạo tài khoản và phân công chuyến trên cổng Web.{'\n'}
              • <Text style={{ fontWeight: '700' }}>Nhà xe:</Text> đăng ký và quản lý vận hành trên cổng Web RideShareHub.
            </Text>
          </View>
        </View>

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

        <Text style={styles.label}>Số điện thoại (không bắt buộc)</Text>
        <TextInput
          style={styles.input}
          placeholder="0905 123 456"
          placeholderTextColor={COLORS.slate400}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          editable={!loading}
        />

        <Text style={styles.label}>Mật khẩu</Text>
        <View style={styles.pwWrap}>
          <TextInput
            style={[styles.input, styles.pwInput]}
            placeholder="Tối thiểu 8 ký tự"
            placeholderTextColor={COLORS.slate400}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            editable={!loading}
          />
          <Pressable
            style={styles.pwToggle}
            onPress={() => setShowPassword(v => !v)}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            <EyeGlyph open={showPassword} size={19} color={COLORS.slate500} />
          </Pressable>
        </View>

        <Text style={styles.label}>Xác nhận mật khẩu</Text>
        <TextInput
          style={styles.input}
          placeholder="Nhập lại mật khẩu"
          placeholderTextColor={COLORS.slate400}
          secureTextEntry={!showPassword}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          editable={!loading}
        />

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
            <Text style={styles.btnText}>Tạo tài khoản hành khách</Text>
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
  root: { flex: 1, backgroundColor: COLORS.surface },
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
  noticeBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 14,
    padding: 12,
    marginBottom: 4,
  },
  noticeBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  noticeTitle: { fontSize: 13, fontWeight: '700', color: COLORS.primaryDark },
  noticeDesc: { fontSize: 12, color: COLORS.slate600, marginTop: 4, lineHeight: 18 },
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
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    color: COLORS.navy,
    fontSize: 15,
  },
  pwWrap: { position: 'relative' },
  pwInput: { paddingRight: 48 },
  pwToggle: {
    position: 'absolute',
    right: 6,
    top: 0,
    bottom: 0,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
    ...PRIMARY_SHADOW,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  linkRow: { alignItems: 'center', marginTop: 22 },
  linkText: { color: COLORS.slate600, fontSize: 14 },
  link: { color: COLORS.primary, fontWeight: '700' },
});
