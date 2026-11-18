import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
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
import { BusGlyph, EyeGlyph, UserGlyph } from '../src/components/UI';
import { CARD_SHADOW, COLORS, PRIMARY_SHADOW } from '../src/theme/tokens';

type PortalTab = 'PASSENGER' | 'DRIVER';

export default function LoginScreen() {
  const { signIn, loading } = useAuth();
  const router = useRouter();

  const [portal, setPortal] = useState<PortalTab>('PASSENGER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);

  const isDriverTab = portal === 'DRIVER';

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
      <StatusBar style="light" />
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Dark Navy Hero Header inspired by Figma DR-01 + PA-01 */}
        <View style={styles.hero}>
          <View style={styles.heroGlowPurple} />
          <View style={styles.heroGlowTeal} />

          <View style={styles.brandRow}>
            <View
              style={[
                styles.brandBox,
                isDriverTab ? styles.brandBoxDriver : styles.brandBoxPassenger,
              ]}
            >
              <BusGlyph
                size={28}
                color={isDriverTab ? COLORS.navy : COLORS.surface}
              />
              {!isDriverTab ? <View style={styles.brandDot} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.brandTitle}>RideShareHub</Text>
              <Text style={[styles.brandSub, isDriverTab && styles.brandSubDriver]}>
                {isDriverTab ? 'Dành cho tài xế' : 'Xe ghép thông minh miền Trung'}
              </Text>
            </View>
          </View>

          {/* Role clarity selector — single backend login still routes by JWT role */}
          <View style={styles.portalBar} accessibilityRole="tablist">
            <Pressable
              style={[
                styles.portalTab,
                !isDriverTab && styles.portalTabPassengerActive,
              ]}
              onPress={() => {
                setPortal('PASSENGER');
                setError(null);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: !isDriverTab }}
            >
              <UserGlyph size={16} color={!isDriverTab ? '#ffffff' : COLORS.slate300} />
              <Text
                style={[
                  styles.portalTabText,
                  !isDriverTab && styles.portalTabTextLightActive,
                ]}
              >
                Hành khách
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.portalTab,
                isDriverTab && styles.portalTabDriverActive,
              ]}
              onPress={() => {
                setPortal('DRIVER');
                setError(null);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: isDriverTab }}
            >
              <BusGlyph size={16} color={isDriverTab ? COLORS.navy : COLORS.slate300} />
              <Text
                style={[
                  styles.portalTabText,
                  isDriverTab && styles.portalTabTextDriverActive,
                ]}
              >
                Tài xế
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Rounded-top White Sheet matching Figma DR-01 */}
        <View style={styles.sheet}>
          <Text style={styles.heading}>
            {isDriverTab ? 'Đăng nhập tài xế' : 'Chào mừng trở lại'}
          </Text>
          <Text style={styles.sub}>
            {isDriverTab
              ? 'Dùng tài khoản do nhà xe cấp cho bạn.'
              : 'Đăng nhập để tìm và đặt chuyến xe ghép.'}
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder={isDriverTab ? 'taixe1@hoanglong.vn' : 'khach1@gmail.com'}
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
                <EyeGlyph open={showPassword} size={19} color={COLORS.slate500} />
              </Pressable>
            </View>

            <View style={styles.forgotRow}>
              <Pressable onPress={() => setForgotOpen(true)} accessibilityRole="button">
                <Text style={styles.forgotText}>Quên mật khẩu?</Text>
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
            {isDriverTab ? (
              <Text style={styles.driverHintText}>
                Chưa có tài khoản? Liên hệ nhà xe của bạn để được cấp.
              </Text>
            ) : (
              <Pressable
                onPress={() => router.push('/register')}
                accessibilityRole="link"
              >
                <Text style={styles.linkText}>
                  Chưa có tài khoản? <Text style={styles.link}>Đăng ký ngay</Text>
                </Text>
              </Pressable>
            )}
            <Text style={styles.autoRouteNote}>
              Hệ thống tự động mở đúng không gian theo vai trò tài khoản.
            </Text>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={forgotOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setForgotOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {isDriverTab ? 'Khôi phục tài khoản tài xế' : 'Khôi phục mật khẩu'}
            </Text>
            <Text style={styles.modalBody}>
              {isDriverTab
                ? 'Tài khoản tài xế do Nhà xe quản lý và cấp phát. Vui lòng liên hệ điều hành nhà xe để được hỗ trợ đặt lại mật khẩu (tài khoản mẫu: Test@123456).'
                : 'Tính năng tự đặt lại mật khẩu qua email/SMS chưa nằm trong Sprint 1–2. Với tài khoản test mẫu, mật khẩu mặc định là Test@123456.'}
            </Text>
            <Pressable style={styles.modalBtn} onPress={() => setForgotOpen(false)}>
              <Text style={styles.modalBtnText}>Đã hiểu</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  scroll: { flexGrow: 1, backgroundColor: COLORS.surface },

  hero: {
    backgroundColor: COLORS.navy,
    paddingTop: 58,
    paddingBottom: 44,
    paddingHorizontal: 22,
    overflow: 'hidden',
  },
  heroGlowPurple: {
    position: 'absolute',
    top: -70,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(84, 56, 245, 0.38)',
  },
  heroGlowTeal: {
    position: 'absolute',
    bottom: -60,
    left: -70,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(20, 184, 166, 0.2)',
  },

  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  brandBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  brandBoxPassenger: { backgroundColor: COLORS.primary },
  brandBoxDriver: { backgroundColor: COLORS.teal },
  brandDot: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.teal,
    borderWidth: 2.5,
    borderColor: COLORS.navy,
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandSub: {
    color: COLORS.slate300,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  brandSubDriver: { color: COLORS.teal },

  portalBar: {
    marginTop: 22,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: 14,
    padding: 4,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  portalTab: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  portalTabPassengerActive: { backgroundColor: COLORS.primary },
  portalTabDriverActive: { backgroundColor: COLORS.teal },
  portalTabText: { color: COLORS.slate300, fontSize: 14, fontWeight: '700' },
  portalTabTextLightActive: { color: '#ffffff' },
  portalTabTextDriverActive: { color: COLORS.navy },

  sheet: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -22,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 32,
  },
  heading: {
    color: COLORS.navy,
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  sub: {
    color: COLORS.slate500,
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
  },
  errorBox: {
    backgroundColor: COLORS.dangerSoft,
    borderRadius: 12,
    padding: 12,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { color: COLORS.danger, fontSize: 13, fontWeight: '500' },
  form: { marginTop: 18 },
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
  forgotRow: { alignItems: 'flex-end', marginTop: 10 },
  forgotText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    ...PRIMARY_SHADOW,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },

  footerLink: { marginTop: 'auto', paddingTop: 28, alignItems: 'center', gap: 10 },
  linkText: { color: COLORS.slate600, fontSize: 14 },
  link: { color: COLORS.primary, fontWeight: '700' },
  driverHintText: {
    color: COLORS.slate500,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  autoRouteNote: {
    color: COLORS.slate400,
    fontSize: 11,
    textAlign: 'center',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    ...CARD_SHADOW,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.navy },
  modalBody: { fontSize: 14, color: COLORS.slate600, lineHeight: 20, marginTop: 10 },
  modalBtn: {
    marginTop: 18,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
});
