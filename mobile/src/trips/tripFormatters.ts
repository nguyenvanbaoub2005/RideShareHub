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
