/**
 * Root layout — role-based routing gate & Figma PA-01 Splash.
 */

import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '../src/session/AuthContext';
import { SplashScreenView } from '../src/components/UI';

const MIN_SPLASH_MS = 1400;

function RootNavigator() {
  const { session } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (session === undefined || !splashDone) return;

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
  }, [session, splashDone, segments]);

  if (session === undefined || !splashDone) {
    return <SplashScreenView onContinue={() => setSplashDone(true)} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
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
