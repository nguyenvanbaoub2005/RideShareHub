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
  CONFIRMED: 'Đã xác nhận',
  PICKED_UP: 'Đã lên xe',
  NO_SHOW: 'Vắng mặt',
  ACTIVE: 'Đang hoạt động',
  LOCKED: 'Đã khóa',
  PASSENGER: 'Hành khách',
  DRIVER: 'Tài xế',
  TRANSPORT_COMPANY: 'Nhà xe',
  ADMIN: 'Quản trị viên',
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
  CONFIRMED: 'approved',
  PICKED_UP: 'in-use',
  NO_SHOW: 'inactive',
  ACTIVE: 'approved',
  LOCKED: 'rejected',
  PASSENGER: 'in-use',
  DRIVER: 'available',
  TRANSPORT_COMPANY: 'pending',
  ADMIN: 'neutral',
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
