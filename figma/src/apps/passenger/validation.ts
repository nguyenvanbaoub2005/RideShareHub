import { validLocation } from "../../address/model.ts";
import { bookBlock, type Trip } from "./data.ts";
import type { Booking } from "./store";

export function loginValidation(identifier: string, password: string) {
  const value = identifier.replace(/\s/g, "");
  return {
    identifier: !/^([^\s@]+@[^\s@]+\.[^\s@]+|(0|\+84)\d{9})$/.test(value)
      ? "Nhập email hoặc số điện thoại hợp lệ."
      : "",
    password: password.length < 8 ? "Mật khẩu cần ít nhất 8 ký tự." : "",
  };
}
export function registrationValidation(data: {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirm: string;
  terms: boolean;
}) {
  return {
    name: data.name.trim().length < 2 ? "Vui lòng nhập họ và tên." : "",
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()) ? "Email không hợp lệ." : "",
    phone: !/^(0|\+84)\d{9}$/.test(data.phone.replace(/\s/g, ""))
      ? "Số điện thoại không hợp lệ."
      : "",
    password: data.password.length < 8 ? "Mật khẩu cần ít nhất 8 ký tự." : "",
    confirm: data.confirm !== data.password || !data.confirm ? "Mật khẩu xác nhận không khớp." : "",
    terms: !data.terms ? "Vui lòng đồng ý điều khoản sử dụng." : "",
  };
}
export function bookingValidation(b: Booking, trip: Trip) {
  return {
    pickup:
      !validLocation(b.pickupLocation) || b.pickupLocation.address !== b.pickup
        ? "Vui lòng chọn điểm đón có tọa độ từ gợi ý hoặc bản đồ"
        : "",
    pickupCustom:
      b.pickup === "custom" && !b.pickupCustom.trim() ? "Vui lòng nhập địa chỉ đón" : "",
    dropoff:
      !validLocation(b.dropoffLocation) || b.dropoffLocation.address !== b.dropoff
        ? "Vui lòng chọn điểm trả có tọa độ từ gợi ý hoặc bản đồ"
        : "",
    dropoffCustom:
      b.dropoff === "custom" && !b.dropoffCustom.trim() ? "Vui lòng nhập địa chỉ trả" : "",
    name: b.name.trim().length < 2 ? "Vui lòng nhập họ và tên" : "",
    phone: !/^(0|\+84)\d{9}$/.test(b.phone.replace(/\s/g, "")) ? "Số điện thoại không hợp lệ" : "",
    email: b.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email) ? "Email không hợp lệ" : "",
    seats:
      !Number.isInteger(b.seats) || b.seats < 1 || b.seats > Math.min(trip.seatsLeft, 6)
        ? `Chỉ được đặt từ 1 đến ${Math.min(trip.seatsLeft, 6)} chỗ`
        : "",
    trip: bookBlock(trip, b.seats) ?? "",
  };
}
export const reservationKey = (s: { from: string; to: string; date: string }, tripId: string) =>
  `${s.date}|${s.from}|${s.to}|${tripId}`;
