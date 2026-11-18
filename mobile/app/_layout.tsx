/**
 * Root layout — role-based routing gate & Figma PA-01 Splash.
 */

import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AuthProvider, useAuth } from '../src/session/AuthContext';
import { BrandLogo } from '../src/components/UI';
import { COLORS } from '../src/theme/tokens';

function RootNavigator() {
  const { session } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (session === undefined) return;

    const inAuth = segments[0] === 'login' || segments[0] === 'register';

    if (session === null) {
      if (!inAuth) router.replace('/login');
      return;
    }

    if (inAuth || !segments[0]) {
      switch (session.role) {
        case 'PASSENGER':
          router.replace('/(passenger)');
          break;
        case 'TRANSPORT_COMPANY':
          router.replace('/(company)');
          break;
        case 'DRIVER':
          router.replace('/(driver)');
          break;
        case 'ADMIN':
          router.replace('/(admin)');
          break;
        default:
          router.replace('/login');
      }
    }
  }, [session, segments]);

  if (session === undefined) {
    return (
      <View style={styles.splash}>
        <BrandLogo size={88} inverted />
        <Text style={styles.splashBrand}>RideShareHub</Text>
        <Text style={styles.splashTag}>Đi chung thông minh, tiết kiệm mỗi chuyến</Text>
        <View style={styles.cityRow}>
          {['Đà Nẵng', 'Huế', 'Hội An', 'Quảng Nam'].map(c => (
            <View key={c} style={styles.cityChip}>
              <Text style={styles.cityText}>{c}</Text>
            </View>
          ))}
        </View>
        <ActivityIndicator color={COLORS.teal} style={{ marginTop: 32 }} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="(passenger)" />
      <Stack.Screen name="(company)" />
      <Stack.Screen name="(driver)" />
      <Stack.Screen name="(admin)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: COLORS.navy,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  splashBrand: {
    color: COLORS.surface,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 22,
  },
  splashTag: {
    color: COLORS.slate300,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  cityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  cityChip: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  cityText: { color: COLORS.slate300, fontSize: 11, fontWeight: '600' },
});
