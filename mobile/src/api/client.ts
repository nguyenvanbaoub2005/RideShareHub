/**
 * API client for RideShareHub backend.
 *
 * Base URL is configurable via EXPO_PUBLIC_API_URL env var.
 * Falls back to localhost:8080 for local development.
 */

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  role: 'PASSENGER' | 'TRANSPORT_COMPANY' | 'DRIVER' | 'ADMIN';
}

export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
  timestamp: string;
}

async function request<T>(
  path: string,
  options: RequestInit,
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const body = await response.json();

  if (!response.ok) {
    const message = body?.message ?? response.statusText;
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
): Promise<AuthResponse> {
  const result = await request<AuthResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, fullName, role }),
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
