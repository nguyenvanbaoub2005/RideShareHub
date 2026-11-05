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
  DRAFT: 'Bản nháp',
  PUBLISHED: 'Đã mở bán',
  FULL: 'Đã hết chỗ',
  IN_PROGRESS: 'Đang chạy',
  COMPLETED: 'Đã hoàn thành',
  CANCELLED: 'Đã huỷ',
  ON_TRIP: 'Đang chạy',
};

const VARIANT_MAP: Record<string, BadgeVariant> = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  AVAILABLE: 'available',
  IN_USE: 'in-use',
  MAINTENANCE: 'maintenance',
  INACTIVE: 'inactive',
  DRAFT: 'neutral',
  PUBLISHED: 'approved',
  FULL: 'maintenance',
  IN_PROGRESS: 'in-use',
  COMPLETED: 'neutral',
  CANCELLED: 'rejected',
  ON_TRIP: 'in-use',
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
