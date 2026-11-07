/**
 * SP2-P1-03 / SP2-P1-04: Shared trip types and formatting helpers.
 */

import type { TripSearchResult } from '../api/client';

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

/** Colour for available-seat badge. */
export function seatColor(seats: number): string {
  if (seats <= 2) return '#ef4444'; // red
  if (seats <= 5) return '#f59e0b'; // amber
  return '#22c55e'; // green
}

