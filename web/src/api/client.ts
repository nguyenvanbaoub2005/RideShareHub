/**
 * Thin fetch-based API client.
 * Reads VITE_API_URL from env (default: http://localhost:8080).
 */

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8080';

export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
  timestamp: string;
}

export type CompanyStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type VehicleStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'INACTIVE';
export type DriverStatus = 'AVAILABLE' | 'ON_TRIP' | 'INACTIVE';
export type TripStatus = 'DRAFT' | 'PUBLISHED' | 'FULL' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface CompanyResponse {
  id: number;
  name: string;
  address: string;
  contactPhone: string;
  contactEmail: string | null;
  representativeName: string;
  status: CompanyStatus;
  rejectReason: string | null;
  avgRating: number;
  ratingCount: number;
  version: number;
  createdAt: string;
}

export interface VehicleResponse {
  id: number;
  companyId: number;
  plateNumber: string;
  vehicleType: string;
  brand: string | null;
  model: string | null;
  seatCapacity: number;
  description: string | null;
  imageUrl: string | null;
  status: VehicleStatus;
  createdAt: string;
}

export interface DriverResponse {
  id: number;
  companyId: number;
  fullName: string;
  phone: string;
  licenseNumber: string;
  status: DriverStatus;
  createdAt: string;
}

export interface RouteResponse {
  id: number;
  companyId: number;
  name: string;
  origin: string;
  destination: string;
  estimatedMinutes: number;
  baseFare: number;
  description: string | null;
  createdAt: string;
}

export interface TripResponse {
  id: number;
  routeId: number;
  routeName: string;
  origin: string;
  destination: string;
  companyId: number;
  companyName: string;
  vehicleId: number;
  vehiclePlate: string;
  seatCapacity: number;
  driverId: number;
  driverName: string;
  departureTime: string;
  fare: number;
  note: string | null;
  status: TripStatus;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  role: 'PASSENGER' | 'TRANSPORT_COMPANY' | 'DRIVER' | 'ADMIN';
}

// ------------------------------------------------------------------ token store
const TOKEN_KEY = 'rsh_web_access';

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function saveToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

// ------------------------------------------------------------------ http helpers

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const json = (await res.json()) as ApiResponse<T>;

  if (!res.ok) {
    throw new ApiError(json.status, json.message);
  }
  return json.data;
}

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

// ------------------------------------------------------------------ auth
export const authApi = {
  login: (email: string, password: string) =>
    request<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: (accessToken: string) =>
    request<void>('/api/v1/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ accessToken }),
    }),
};

// ------------------------------------------------------------------ companies (admin)
export const adminApi = {
  listRegistrations: () =>
    request<CompanyResponse[]>('/api/v1/companies/registrations'),

  getCompany: (id: number) =>
    request<CompanyResponse>(`/api/v1/companies/${id}`),

  decide: (id: number, decision: 'APPROVE' | 'REJECT', reason?: string) =>
    request<CompanyResponse>(`/api/v1/admin/companies/${id}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, reason }),
    }),
};

// ------------------------------------------------------------------ company (owner)
export const companyApi = {
  getMyCompany: (companyId: number) =>
    request<CompanyResponse>(`/api/v1/companies/${companyId}`),

  listVehicles: (companyId: number) =>
    request<VehicleResponse[]>(`/api/v1/companies/${companyId}/vehicles`),

  addVehicle: (
    companyId: number,
    data: {
      plateNumber: string;
      vehicleType: string;
      brand?: string;
      model?: string;
      seatCapacity: number;
      description?: string;
    },
  ) =>
    request<VehicleResponse>(`/api/v1/companies/${companyId}/vehicles`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateVehicle: (
    companyId: number,
    vehicleId: number,
    data: {
      plateNumber: string;
      vehicleType: string;
      brand?: string;
      model?: string;
      seatCapacity: number;
      description?: string;
    },
  ) =>
    request<VehicleResponse>(`/api/v1/companies/${companyId}/vehicles/${vehicleId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  updateVehicleStatus: (companyId: number, vehicleId: number, status: VehicleStatus) =>
    request<VehicleResponse>(
      `/api/v1/companies/${companyId}/vehicles/${vehicleId}/status`,
      {
        method: 'PUT',
        body: JSON.stringify({ status }),
      },
    ),
};

// ------------------------------------------------------------------ drivers
export const driverApi = {
  listDrivers: (companyId: number) =>
    request<DriverResponse[]>(`/api/v1/companies/${companyId}/drivers`),

  addDriver: (
    companyId: number,
    data: {
      fullName: string;
      phone: string;
      licenseNumber: string;
    },
  ) =>
    request<DriverResponse>(`/api/v1/companies/${companyId}/drivers`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateDriver: (
    companyId: number,
    driverId: number,
    data: {
      fullName: string;
      phone: string;
      licenseNumber: string;
    },
  ) =>
    request<DriverResponse>(`/api/v1/companies/${companyId}/drivers/${driverId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  updateDriverStatus: (companyId: number, driverId: number, status: DriverStatus) =>
    request<DriverResponse>(
      `/api/v1/companies/${companyId}/drivers/${driverId}/status`,
      {
        method: 'PUT',
        body: JSON.stringify({ status }),
      },
    ),
};

// ------------------------------------------------------------------ routes
export const routeApi = {
  listRoutes: (companyId: number) =>
    request<RouteResponse[]>(`/api/v1/companies/${companyId}/routes`),

  addRoute: (
    companyId: number,
    data: {
      name: string;
      origin: string;
      destination: string;
      estimatedMinutes: number;
      baseFare: number;
      description?: string;
    },
  ) =>
    request<RouteResponse>(`/api/v1/companies/${companyId}/routes`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateRoute: (
    companyId: number,
    routeId: number,
    data: {
      name: string;
      origin: string;
      destination: string;
      estimatedMinutes: number;
      baseFare: number;
      description?: string;
    },
  ) =>
    request<RouteResponse>(`/api/v1/companies/${companyId}/routes/${routeId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteRoute: (companyId: number, routeId: number) =>
    request<void>(`/api/v1/companies/${companyId}/routes/${routeId}`, {
      method: 'DELETE',
    }),
};

// ------------------------------------------------------------------ trips
export const tripApi = {
  listTrips: (companyId: number) =>
    request<TripResponse[]>(`/api/v1/companies/${companyId}/trips`),

  createTrip: (
    companyId: number,
    data: {
      routeId: number;
      vehicleId: number;
      driverId: number;
      departureTime: string;
      fare: number;
      note?: string;
    },
  ) =>
    request<TripResponse>(`/api/v1/companies/${companyId}/trips`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTrip: (
    companyId: number,
    tripId: number,
    data: {
      routeId: number;
      vehicleId: number;
      driverId: number;
      departureTime: string;
      fare: number;
      note?: string;
    },
  ) =>
    request<TripResponse>(`/api/v1/companies/${companyId}/trips/${tripId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  publishTrip: (companyId: number, tripId: number) =>
    request<TripResponse>(`/api/v1/companies/${companyId}/trips/${tripId}/publish`, {
      method: 'POST',
    }),

  cancelTrip: (companyId: number, tripId: number) =>
    request<TripResponse>(`/api/v1/companies/${companyId}/trips/${tripId}/cancel`, {
      method: 'POST',
    }),
};
