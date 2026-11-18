import {
  formatAdministrativeAddress,
  validateAdministrativeAddress,
  type AdministrativeAddress,
} from "../../address/model.ts";

export type CompanyStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
export type CompanyInfo = {
  name: string;
  businessNumber: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  administrativeAddress: AdministrativeAddress;
};

export const sampleCompany: CompanyInfo = {
  name: "Nhà xe Minh Tâm",
  businessNumber: "0402123456",
  contact: "Nguyễn Minh Tâm",
  email: "dieuhanh@minhtam.vn",
  phone: "0905 234 567",
  administrativeAddress: { provinceId: "48", communeId: "20209", detail: "201 Tôn Đức Thắng" },
  address: formatAdministrativeAddress({
    provinceId: "48",
    communeId: "20209",
    detail: "201 Tôn Đức Thắng",
  }),
};

export const emptyCompany: CompanyInfo = {
  name: "",
  businessNumber: "",
  contact: "",
  email: "",
  phone: "",
  address: "",
  administrativeAddress: { provinceId: "", communeId: "", detail: "" },
};

export const canPublish = (status: CompanyStatus) => status === "APPROVED";
export const canAccessDashboard = canPublish;

export function validateCompany(info: CompanyInfo, hasDocument: boolean) {
  return {
    name: info.name.trim().length < 3 ? "Vui lòng nhập tên nhà xe (ít nhất 3 ký tự)." : "",
    businessNumber: !/^\d{10}(\d{3})?$/.test(info.businessNumber.trim())
      ? "Mã số doanh nghiệp phải có 10 hoặc 13 chữ số."
      : "",
    contact: info.contact.trim().length < 2 ? "Vui lòng nhập họ tên người liên hệ." : "",
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.email.trim())
      ? "Vui lòng nhập email hợp lệ."
      : "",
    phone: !/^(0|\+84)\d{9}$/.test(info.phone.replace(/\s/g, ""))
      ? "Vui lòng nhập số điện thoại Việt Nam hợp lệ."
      : "",
    address:
      Object.values(validateAdministrativeAddress(info.administrativeAddress)).find(Boolean) ?? "",
    document: !hasDocument ? "Vui lòng đính kèm giấy đăng ký kinh doanh." : "",
  };
}

export function validateDocument(file: Pick<File, "size" | "type">) {
  if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type))
    return "Chỉ chấp nhận tệp PDF, JPG hoặc PNG.";
  if (file.size > 10 * 1024 * 1024) return "Dung lượng tối đa là 10 MB.";
  if (!file.size) return "Tệp trống. Vui lòng chọn tệp khác.";
  return "";
}

export const companyScreens = [
  { id: "login", code: "CO-01", title: "Đăng nhập" },
  { id: "register", code: "CO-02", title: "Đăng ký nhà xe" },
  { id: "pending", code: "CO-03", title: "Chờ phê duyệt" },
  { id: "dashboard", code: "CO-04", title: "Tổng quan" },
  { id: "profile", code: "CO-05", title: "Hồ sơ nhà xe" },
  { id: "vehicles", code: "CO-06", title: "Quản lý phương tiện" },
  { id: "vehicleForm", code: "CO-07", title: "Thêm / sửa phương tiện" },
  { id: "drivers", code: "CO-08", title: "Quản lý tài xế" },
  { id: "driverForm", code: "CO-09", title: "Thêm / sửa tài xế" },
  { id: "routes", code: "CO-10", title: "Quản lý tuyến đường" },
  { id: "routeForm", code: "CO-11", title: "Tạo / sửa tuyến đường" },
  { id: "trips", code: "CO-12", title: "Quản lý chuyến đi" },
  { id: "tripForm", code: "CO-13", title: "Tạo chuyến đi" },
  { id: "tripDetail", code: "CO-14", title: "Chi tiết chuyến đi" },
  { id: "bookings", code: "CO-15", title: "Quản lý đặt chỗ" },
  { id: "stops", code: "CO-16", title: "Quản lý đón / trả" },
  { id: "optimization", code: "CO-17", title: "Tối ưu lộ trình" },
  { id: "tracking", code: "CO-18", title: "Theo dõi chuyến" },
] as const;
export type CompanyScreen = (typeof companyScreens)[number]["id"];
