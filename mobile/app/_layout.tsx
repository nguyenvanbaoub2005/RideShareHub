/**
 * Root layout — role-based routing gate.
 *
 * Session states:
 *   undefined  → still loading from AsyncStorage → show splash
 *   null       → not logged in → redirect to /login
 *   Session    → logged in → redirect to role-specific home
 *
 * Role routing:
 *   PASSENGER         → /(passenger)
 *   TRANSPORT_COMPANY → /(company)
 *   DRIVER            → /(driver)   [placeholder — SP3-P2-03]
 *   ADMIN             → /(admin)    [placeholder — SP4-P1-02 web]
 */

import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AuthProvider, useAuth } from '../src/session/AuthContext';

// Inner component — has access to auth context
function RootNavigator() {
  const { session } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (session === undefined) return; // still loading

    const inAuth = segments[0] === 'login' || segments[0] === 'register';

    if (session === null) {
      // Not logged in → go to login
      if (!inAuth) router.replace('/login');
      return;
    }

    // Logged in → route to role home
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
          // Admin uses web app — mobile shows minimal placeholder
          router.replace('/(admin)');
          break;
        default:
          router.replace('/login');
      }
    }
  }, [session, segments]);

  // Splash while loading session from AsyncStorage
  if (session === undefined) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashBrand}>RIDESHAREHUB</Text>
        <ActivityIndicator color="#6366f1" style={{ marginTop: 24 }} />
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

// Root layout wraps everything in AuthProvider
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
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashBrand: {
    color: '#6366f1',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 4,
  },
});
