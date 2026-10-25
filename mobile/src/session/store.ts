/**
 * Session store — persists JWT tokens and user role in AsyncStorage.
 *
 * Keys:
 *   rsh_access   — access token (JWT)
 *   rsh_refresh  — refresh token (JWT)
 *   rsh_role     — user role string
 *
 * This module is the single source of truth for auth state on the mobile client.
 * Components must not read/write AsyncStorage directly.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthResponse } from '../api/client';

const KEY_ACCESS = 'rsh_access';
const KEY_REFRESH = 'rsh_refresh';
const KEY_ROLE = 'rsh_role';

export type UserRole = AuthResponse['role'];

export interface Session {
  accessToken: string;
  refreshToken: string;
  role: UserRole;
}

/** Persist a session returned by the backend. */
export async function saveSession(auth: AuthResponse): Promise<void> {
  await AsyncStorage.setItem(KEY_ACCESS, auth.accessToken);
  await AsyncStorage.setItem(KEY_REFRESH, auth.refreshToken);
  await AsyncStorage.setItem(KEY_ROLE, auth.role);
}

/** Load a persisted session, or null if not logged in. */
export async function loadSession(): Promise<Session | null> {
  const access = await AsyncStorage.getItem(KEY_ACCESS);
  const refresh = await AsyncStorage.getItem(KEY_REFRESH);
  const role = await AsyncStorage.getItem(KEY_ROLE);
  if (!access || !refresh || !role) return null;
  return { accessToken: access, refreshToken: refresh, role: role as UserRole };
}

/** Clear all session data (logout). */
export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(KEY_ACCESS);
  await AsyncStorage.removeItem(KEY_REFRESH);
  await AsyncStorage.removeItem(KEY_ROLE);
}
