/**
 * SP2-P1-03 / SP2-P1-04: Shared trip types and formatting helpers.
 */

import type { TripSearchResult } from '../api/client';
import { COLORS } from '../theme/tokens';

/** Format ISO departure time to Vietnamese locale string. */
export function formatDeparture(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Format full Vietnamese date from YYYY-MM-DD or ISO string (e.g. "Thứ 6, 18/07/2026"). */
export function formatDateLong(isoOrDate: string): string {
  const normalized = isoOrDate.length === 10 ? `${isoOrDate}T00:00:00` : isoOrDate;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return isoOrDate;
  return d.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Format compact Vietnamese date (e.g. "Th 6, 18/07"). */
export function formatDateShort(isoOrDate: string): string {
  const normalized = isoOrDate.length === 10 ? `${isoOrDate}T00:00:00` : isoOrDate;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return isoOrDate;
  return d.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}

/** Format HH:mm from ISO string. */
export function formatTimeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Compute estimated arrival HH:mm from departure ISO + minutes. */
export function formatArrivalTime(iso: string, estimatedMinutes: number): string {
  const d = new Date(new Date(iso).getTime() + Math.max(0, estimatedMinutes) * 60_000);
  return d.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Format duration in minutes to Vietnamese string. */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h ? `${h} giờ ` : ''}${m ? `${m} phút` : ''}`.trim() || `${minutes} phút`;
}

/** Format VND price. */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Surcharge percentage between base fare and estimated fare. */
export function surchargePercent(trip: TripSearchResult): number {
  if (trip.fare === 0) return 0;
  return Math.round(((trip.estimatedFare - trip.fare) / trip.fare) * 100);
}

/** Colour for available-seat badge (Figma palette). */
export function seatColor(seats: number): string {
  if (seats <= 2) return COLORS.danger;
  if (seats <= 5) return COLORS.warningText;
  return COLORS.tealDark;
}

/** Avoid duplicating capacity like "Limousine 9 chỗ 9 chỗ". */
export function formatVehicleLabel(vehicleType: string, seatCapacity?: number): string {
  const cleanType = vehicleType?.trim() || 'Xe ghép';
  if (!seatCapacity || seatCapacity <= 0) return cleanType;
  if (/\d+\s*chỗ/i.test(cleanType)) return cleanType;
  return `${cleanType} ${seatCapacity} chỗ`;
}
