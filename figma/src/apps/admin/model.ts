import { canPublish } from "../company/model.ts";
import {
  sampleAdministrativeAddress,
  formatAdministrativeAddress,
  type AdministrativeAddress,
} from "../../address/model.ts";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
export type CompanyDocument = {
  id: string;
  title: string;
  file: string;
  size: string;
  issued: string;
};
export type ReviewEvent = { title: string; time: string; actor: string; status: ApprovalStatus };
export type AdminCompany = {
  id: string;
  name: string;
  legalName: string;
  registration: string;
  representative: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  administrativeAddress?: AdministrativeAddress;
  city: string;
  registered: string;
  businessIssued: string;
  status: ApprovalStatus;
  reason: string;
  documents: CompanyDocument[];
  history: ReviewEvent[];
};
export const adminScreens = [
  { id: "login", code: "AD-01", title: "Đăng nhập quản trị" },
  { id: "dashboard", code: "AD-02", title: "Tổng quan hệ thống" },
  { id: "companies", code: "AD-03", title: "Quản lý nhà xe" },
  { id: "approval", code: "AD-04", title: "Chi tiết phê duyệt" },
  { id: "users", code: "AD-05", title: "Quản lý người dùng" },
  { id: "userDetail", code: "AD-06", title: "Chi tiết người dùng" },
  { id: "monitoring", code: "AD-07", title: "Giám sát chuyến đi" },
  { id: "bookings", code: "AD-08", title: "Giám sát đặt chỗ" },
  { id: "reports", code: "AD-09", title: "Báo cáo" },
] as const;
export type AdminScreen = (typeof adminScreens)[number]["id"];
export const approvalLabels: Record<ApprovalStatus, string> = {
  PENDING: "Chờ phê duyệt",
  APPROVED: "Đã phê duyệt",
  REJECTED: "Đã từ chối",
};
export const publishingAllowed = (company: Pick<AdminCompany, "status">) =>
  canPublish(company.status);
const seeds = [
  [
    "NX-0012",
    "Nhà xe Minh Tâm",
    "0402123456",
    "Nguyễn Minh Tâm",
    "Đà Nẵng",
    "dieuhanh@minhtam.vn",
    "0905 234 567",
    "APPROVED",
    "2025-07-17",
    "201 Tôn Đức Thắng, phường Hòa Minh, quận Liên Chiểu, Đà Nẵng",
  ],
  [
    "NX-0018",
    "Nhà xe Thành Công",
    "4001234567",
    "Trần Quốc Thành",
    "Quảng Nam",
    "lienhe@thanhcong.vn",
    "0914 333 444",
    "PENDING",
    "2025-07-18",
    "68 Hùng Vương, phường An Mỹ, Tam Kỳ, Quảng Nam",
  ],
  [
    "NX-0019",
    "Nhà xe An Phú",
    "3301678901",
    "Lê Hoàng Phú",
    "Huế",
    "contact@anphu.vn",
    "0935 555 666",
    "PENDING",
    "2025-07-18",
    "42 An Dương Vương, phường An Đông, Huế",
  ],
  [
    "NX-0020",
    "Nhà xe Hội An Express",
    "4001890123",
    "Võ Minh Khang",
    "Hội An",
    "dieuhanh@hoianexpress.vn",
    "0977 456 002",
    "PENDING",
    "2025-07-17",
    "15 Trần Hưng Đạo, phường Minh An, Hội An",
  ],
  [
    "NX-0013",
    "Nhà xe Hải Vân",
    "0401567890",
    "Phạm Thanh Hải",
    "Đà Nẵng",
    "lienhe@haivan.vn",
    "0905 887 331",
    "APPROVED",
    "2025-07-12",
    "120 Điện Biên Phủ, phường Chính Gián, Đà Nẵng",
  ],
  [
    "NX-0014",
    "Nhà xe Hương Giang",
    "3301456789",
    "Nguyễn Thị Hương",
    "Huế",
    "info@huonggiang.vn",
    "0918 203 456",
    "APPROVED",
    "2025-07-10",
    "85 Bà Triệu, phường Phú Hội, Huế",
  ],
  [
    "NX-0015",
    "Nhà xe Quảng Nam Xanh",
    "4001789012",
    "Trần Văn Nam",
    "Quảng Nam",
    "hotro@quangnamxanh.vn",
    "0988 301 775",
    "APPROVED",
    "2025-07-08",
    "22 Phan Bội Châu, phường Tân Thạnh, Tam Kỳ, Quảng Nam",
  ],
  [
    "NX-0016",
    "Nhà xe Bình Minh",
    "0401987654",
    "Lê Văn Bình",
    "Đà Nẵng",
    "info@binhminh.vn",
    "0934 123 789",
    "REJECTED",
    "2025-07-14",
    "91 Nguyễn Tất Thành, phường Thanh Bình, Đà Nẵng",
  ],
] as const;
export const adminCompanies: AdminCompany[] = seeds.map(
  ([id, name, registration, contact, city, email, phone, status, registered, address]) => ({
    id,
    name,
    legalName: `Công ty TNHH Vận tải ${name.replace("Nhà xe ", "")}`,
    registration,
    representative: contact,
    contact,
    email,
    phone,
    administrativeAddress: sampleAdministrativeAddress(city, address.split(",")[0]),
    address: formatAdministrativeAddress(sampleAdministrativeAddress(city, address.split(",")[0])),
    city,
    registered,
    businessIssued: "2022-03-15",
    status,
    reason:
      status === "REJECTED"
        ? "Giấy phép kinh doanh vận tải hết hạn. Vui lòng bổ sung giấy phép còn hiệu lực để được xem xét lại."
        : "",
    documents: [
      {
        id: `${id}-business`,
        title: "Giấy chứng nhận đăng ký doanh nghiệp",
        file: `DKDN-${registration}.pdf`,
        size: "2,4 MB",
        issued: "2022-03-15",
      },
      {
        id: `${id}-transport`,
        title: "Giấy phép kinh doanh vận tải",
        file: `Giay-phep-van-tai-${id}.pdf`,
        size: "1,8 MB",
        issued: "2023-06-20",
      },
    ],
    history: [
      {
        title: "Nhà xe gửi hồ sơ đăng ký",
        time: `${registered.split("-").reverse().join("/")} · 09:15`,
        actor: contact,
        status: "PENDING",
      },
      ...(status === "PENDING"
        ? []
        : [
            {
              title: status === "APPROVED" ? "Hồ sơ đã được phê duyệt" : "Hồ sơ bị từ chối",
              time: `${registered.split("-").reverse().join("/")} · 14:30`,
              actor: "Lê Hoàng Anh · Quản trị viên",
              status,
            },
          ]),
    ],
  }),
);

export function loginErrors(email: string, password: string) {
  return {
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ? "Vui lòng nhập email quản trị hợp lệ."
      : "",
    password: password.length < 8 ? "Mật khẩu cần có ít nhất 8 ký tự." : "",
  };
}
const normalize = (s: string) =>
  s
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
export function filterCompanies(list: AdminCompany[], query: string, status = "all", city = "all") {
  return list
    .filter(
      (c) =>
        (status === "all" || c.status === status) &&
        (city === "all" || c.city === city) &&
        normalize(`${c.name} ${c.registration} ${c.contact} ${c.email}`).includes(
          normalize(query.trim()),
        ),
    )
    .sort((a, b) => b.registered.localeCompare(a.registered) || a.name.localeCompare(b.name, "vi"));
}
export function reviewCompany(
  company: AdminCompany,
  decision: "APPROVED" | "REJECTED",
  reason: string,
  confirmed: boolean,
  time: string,
): { company: AdminCompany; error: string } {
  if (!confirmed) return { company, error: "Cần xác nhận quyết định trước khi thay đổi hồ sơ." };
  if (company.status !== "PENDING")
    return { company, error: "Hồ sơ này đã được xử lý. Không thể duyệt hoặc từ chối lần nữa." };
  if (decision === "REJECTED" && !reason.trim())
    return { company, error: "Vui lòng nhập lý do từ chối." };
  if (reason.trim().length > 500)
    return { company, error: "Lý do từ chối không được vượt quá 500 ký tự." };
  const next: AdminCompany = {
    ...company,
    status: decision,
    reason: decision === "REJECTED" ? reason.trim() : "",
    history: [
      ...company.history,
      {
        title: decision === "APPROVED" ? "Hồ sơ đã được phê duyệt" : "Hồ sơ bị từ chối",
        time,
        actor: "Lê Hoàng Anh · Quản trị viên",
        status: decision,
      },
    ],
  };
  return { company: next, error: "" };
}
export { dashboardStats } from "./monitoringModel.ts";
