import * as Linking from 'expo-linking';
import { NativeModules } from 'react-native';

/**
 * API client for RideShareHub backend.
 *
 * Base URL resolution order:
 * 1. EXPO_PUBLIC_API_URL env var (if set)
 * 2. LAN IP / host extracted from Metro / Expo Go runtime URL (port 8080)
 * 3. Fallback to http://localhost:8080
 */
function extractDevHost(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  const match = rawUrl.match(/^[a-zA-Z0-9+.-]+:\/\/([^:/?#]+)(?::\d+)?/);
  const host = match?.[1];
  if (!host) return null;
  const isIpv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
  if (isIpv4 || host === 'localhost' || host === '127.0.0.1') {
    return host;
  }
  return null;
}

function resolveBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  try {
    const sourceCode = (NativeModules as { SourceCode?: { scriptURL?: string; getConstants?: () => { scriptURL?: string } } })?.SourceCode;
    const scriptUrl = sourceCode?.getConstants?.()?.scriptURL ?? sourceCode?.scriptURL;
    const scriptHost = extractDevHost(scriptUrl);
    if (scriptHost) {
      return `http://${scriptHost}:8080`;
    }
  } catch {
    // Ignore if NativeModules.SourceCode is unavailable
  }

  try {
    const linkingHost = extractDevHost(Linking.createURL('/'));
    if (linkingHost) {
      return `http://${linkingHost}:8080`;
    }
  } catch {
    // Ignore if Linking.createURL is unavailable
  }

  return 'http://localhost:8080';
}

export const BASE_URL = resolveBaseUrl();

async function parseJsonSafe(response: Response): Promise<Record<string, any> | null> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as Record<string, any>;
  } catch {
    return null;
  }
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  role: 'PASSENGER' | 'TRANSPORT_COMPANY' | 'DRIVER' | 'ADMIN';
}

export interface UserProfile {
  id: number;
  email: string;
  fullName: string;
  phone?: string | null;
  role: AuthResponse['role'];
}

export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
  timestamp: string;
}

export interface SessionHandlers {
  tryRefreshToken: () => Promise<string | null>;
  onSessionExpired: () => void | Promise<void>;
}

let sessionHandlers: SessionHandlers | null = null;

export function configureSessionHandlers(handlers: SessionHandlers) {
  sessionHandlers = handlers;
}

async function fetchWithAutoRefresh(url: string, options: RequestInit): Promise<Response> {
  const buildHeaders = (tokenOverride?: string): Record<string, string> => {
    const base: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    };
    if (tokenOverride) {
      base.Authorization = `Bearer ${tokenOverride}`;
    }
    return base;
  };

  let response = await fetch(url, { ...options, headers: buildHeaders() });
  const isAuthPublicEndpoint =
    url.includes('/api/v1/auth/login') ||
    url.includes('/api/v1/auth/register') ||
    url.includes('/api/v1/auth/refresh');

  if (response.status === 401 && !isAuthPublicEndpoint && sessionHandlers) {
    const freshToken = await sessionHandlers.tryRefreshToken();
    if (freshToken) {
      response = await fetch(url, { ...options, headers: buildHeaders(freshToken) });
    }
    if (response.status === 401) {
      await sessionHandlers.onSessionExpired();
    }
  }
  return response;
}

async function request<T>(
  path: string,
  options: RequestInit,
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${path}`;
  const response = await fetchWithAutoRefresh(url, options);

  const body = await parseJsonSafe(response);

  if (!response.ok) {
    const message = (typeof body?.message === 'string' && body.message) || response.statusText || `HTTP ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return body as ApiResponse<T>;
}

// ---- Auth endpoints --------------------------------------------------------

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const result = await request<AuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return result.data;
}

export async function register(
  email: string,
  password: string,
  fullName: string,
  role: 'PASSENGER' | 'TRANSPORT_COMPANY',
  phone?: string,
): Promise<AuthResponse> {
  const result = await request<AuthResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      fullName,
      role,
      phone: phone?.trim() || undefined,
    }),
  });
  return result.data;
}

export async function getMyProfile(accessToken: string): Promise<UserProfile> {
  const result = await request<UserProfile>('/api/v1/auth/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return result.data;
}

export async function updateMyProfile(
  accessToken: string,
  payload: { fullName: string; phone?: string | null },
): Promise<UserProfile> {
  const result = await request<UserProfile>('/api/v1/auth/me', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
  return result.data;
}

export async function refreshTokens(
  refreshToken: string,
): Promise<AuthResponse> {
  const result = await request<AuthResponse>('/api/v1/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
  return result.data;
}

export async function logout(
  accessToken: string,
  refreshToken?: string,
): Promise<void> {
  await fetch(`${BASE_URL}/api/v1/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ accessToken, refreshToken }),
  });
}

// ---- Trip search (SP2-P1-01 / SP2-P1-02) -----------------------------------

export interface TripSearchResult {
  tripId: number;
  routeId: number;
  routeName: string;
  origin: string;
  destination: string;
  estimatedMinutes: number;
  departureTime: string; // ISO-8601
  fare: number;
  estimatedFare: number;
  availableSeats: number;
  seatCapacity?: number;
  vehicleType: string;
  vehiclePlate?: string;
  vehicleBrand?: string | null;
  vehicleModel?: string | null;
  driverName: string;
  companyId?: number | null;
  companyName?: string;
  companyRating?: number;
  companyRatingCount?: number;
  note?: string | null;
  status: string;
}

export interface TripSearchParams {
  origin?: string;
  destination?: string;
  date?: string; // YYYY-MM-DD
  minSeats?: number;
}

export async function searchTrips(
  accessToken: string,
  params: TripSearchParams,
): Promise<TripSearchResult[]> {
  const qs = new URLSearchParams();
  if (params.origin) qs.set('origin', params.origin);
  if (params.destination) qs.set('destination', params.destination);
  if (params.date) qs.set('date', params.date);
  if (params.minSeats != null) qs.set('minSeats', String(params.minSeats));

  const response = await fetchWithAutoRefresh(`${BASE_URL}/api/trips/search?${qs.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const body = await parseJsonSafe(response);
  if (!response.ok) {
    const message = (typeof body?.message === 'string' && body.message) || response.statusText || `HTTP ${response.status}`;
    throw new ApiError(response.status, message);
  }
  return Array.isArray(body) ? (body as TripSearchResult[]) : (((body as unknown) as ApiResponse<TripSearchResult[]>)?.data ?? []);
}

// ---- Driver trips (SP1-P2-05) ---------------------------------------------

export interface DriverTripSummary {
  id: number;
  routeName?: string;
  origin: string;
  destination: string;
  estimatedMinutes?: number;
  departureTime: string;
  vehiclePlate: string;
  vehicleType?: string;
  seatCapacity: number;
  bookedSeats?: number;
  fare?: number;
  note?: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'FULL' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

export interface DriverProfile {
  id: number;
  companyId: number;
  fullName: string;
  phone: string;
  licenseNumber: string;
  status: 'AVAILABLE' | 'ON_TRIP' | 'INACTIVE';
  createdAt: string;
}

export async function getDriverTrips(accessToken: string): Promise<DriverTripSummary[]> {
  const result = await request<DriverTripSummary[]>('/api/v1/driver/trips', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return result.data;
}

export async function getMyDriverProfile(accessToken: string): Promise<DriverProfile> {
  const result = await request<DriverProfile>('/api/v1/driver/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return result.data;
}

export async function updateMyDriverStatus(
  accessToken: string,
  status: 'AVAILABLE' | 'INACTIVE',
): Promise<DriverProfile> {
  const result = await request<DriverProfile>('/api/v1/driver/status', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ status }),
  });
  return result.data;
}

export async function getTripBookings(
  accessToken: string,
  tripId: number,
): Promise<BookingRecord[]> {
  const result = await request<BookingRecord[]>(`/api/v1/trips/${tripId}/bookings`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return result.data;
}

// ---- Booking endpoints (SP2-P2-01 / SP2-P2-02 / SP2-P2-03) -----------------

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PICKED_UP'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface LocationInput {
  label: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface CreateBookingPayload {
  seatCount: number;
  pickup: LocationInput;
  dropoff: LocationInput;
}

export interface BookingRecord {
  id: number;
  bookingCode: string;
  passengerId: number;
  passengerName: string;
  passengerEmail?: string;
  passengerPhone?: string | null;
  tripId: number;
  routeName: string;
  origin: string;
  destination: string;
  estimatedMinutes?: number;
  departureTime: string;
  companyName: string;
  vehiclePlate: string;
  vehicleType: string;
  driverName: string;
  driverPhone?: string | null;
  seatCount: number;
  pickup: LocationInput;
  dropoff: LocationInput;
  fareEstimate: number;
  status: BookingStatus;
  cancelReason?: string | null;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
}

export function generateIdempotencyKey(prefix = 'bk'): string {
  const rand = Math.random().toString(36).substring(2, 10);
  const ts = Date.now().toString(36);
  return `${prefix}-${ts}-${rand}`;
}

export async function createBooking(
  accessToken: string,
  tripId: number,
  payload: CreateBookingPayload,
  idempotencyKey: string,
): Promise<BookingRecord> {
  const result = await request<BookingRecord>(
    `/api/v1/trips/${tripId}/bookings`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(payload),
    },
  );
  return result.data;
}

export async function getMyBookings(
  accessToken: string,
): Promise<BookingRecord[]> {
  const result = await request<BookingRecord[]>('/api/v1/bookings/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return result.data;
}

export async function getBooking(
  accessToken: string,
  bookingId: number,
): Promise<BookingRecord> {
  const result = await request<BookingRecord>(`/api/v1/bookings/${bookingId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return result.data;
}

export async function cancelBooking(
  accessToken: string,
  bookingId: number,
  idempotencyKey: string,
  reason?: string,
): Promise<BookingRecord> {
  const result = await request<BookingRecord>(
    `/api/v1/bookings/${bookingId}/cancel`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ reason: reason ?? null }),
    },
  );
  return result.data;
}

// ---- Error -----------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
