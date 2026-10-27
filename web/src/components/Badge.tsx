import React from 'react';

export type BadgeVariant = 'pending' | 'approved' | 'rejected' | 'available' | 'in-use' | 'maintenance' | 'inactive' | 'neutral';

const LABELS: Record<string, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  AVAILABLE: 'Sẵn sàng',
  IN_USE: 'Đang dùng',
  MAINTENANCE: 'Bảo dưỡng',
  INACTIVE: 'Ngưng hoạt động',
};

const VARIANT_MAP: Record<string, BadgeVariant> = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  AVAILABLE: 'available',
  IN_USE: 'in-use',
  MAINTENANCE: 'maintenance',
  INACTIVE: 'inactive',
};

interface BadgeProps {
  value: string;
}

export function Badge({ value }: BadgeProps) {
  const variant = VARIANT_MAP[value] ?? 'neutral';
  return (
    <span className={`badge badge--${variant}`}>
      {LABELS[value] ?? value}
    </span>
  );
}
