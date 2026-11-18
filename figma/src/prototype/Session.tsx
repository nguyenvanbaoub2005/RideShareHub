import { createContext, useContext, useState, type ReactNode } from "react";
import { adminCompanies, type AdminCompany } from "../apps/admin/model";
import { adminUsers, type AdminUser } from "../apps/admin/monitoringModel";
import type { CompanyInfo } from "../apps/company/model";
import { administrativeArea, formatAdministrativeAddress } from "../address/model";

export type PrototypeRole = "passenger" | "driver" | "company" | "admin";
type Session = {
  role: PrototypeRole | null;
  openRole: (role: PrototypeRole) => void;
  companies: AdminCompany[];
  setCompanies: React.Dispatch<React.SetStateAction<AdminCompany[]>>;
  users: AdminUser[];
  setUsers: React.Dispatch<React.SetStateAction<AdminUser[]>>;
  companyId: string;
  company: AdminCompany | undefined;
  submittedFile: File | null;
  submitCompany: (info: CompanyInfo, file: File) => string;
  accountLocked: (identifier: string) => boolean;
};
const Context = createContext<Session | null>(null);
export const usePrototypeSession = () => useContext(Context);

export function PrototypeSession({ children }: { children: ReactNode }) {
  const [role, openRole] = useState<PrototypeRole | null>(null);
  const [companies, setCompanies] = useState(adminCompanies);
  const [users, setUsers] = useState(adminUsers);
  const [companyId, setCompanyId] = useState("");
  const [submittedFile, setSubmittedFile] = useState<File | null>(null);
  const company = companies.find((c) => c.id === companyId);
  const accountLocked = (identifier: string) => {
    const normalize = (value: string) =>
      value.trim().replace(/\s/g, "").toLowerCase().replace(/^\+84/, "0");
    const key = normalize(identifier);
    return users.some(
      (u) => u.status === "LOCKED" && (normalize(u.email) === key || normalize(u.phone) === key),
    );
  };
  const submitCompany = (info: CompanyInfo, file: File) => {
    const existing = companies.find((c) => c.registration === info.businessNumber.trim());
    if (existing?.status === "APPROVED")
      return "Mã đăng ký này thuộc nhà xe đã được phê duyệt. Vui lòng dùng hồ sơ mới hoặc đăng nhập.";
    const id =
      existing?.id ?? `NX-DEMO-${companies.filter((c) => c.id.startsWith("NX-DEMO-")).length + 1}`;
    const record: AdminCompany = {
      id,
      name: info.name.trim(),
      legalName: info.name.trim(),
      registration: info.businessNumber.trim(),
      representative: info.contact.trim(),
      contact: info.contact.trim(),
      email: info.email.trim(),
      phone: info.phone.trim(),
      administrativeAddress: { ...info.administrativeAddress },
      address: formatAdministrativeAddress(info.administrativeAddress),
      city: administrativeArea(info.administrativeAddress),
      registered: "2025-07-18",
      businessIssued: "2022-03-15",
      status: "PENDING",
      reason: "",
      documents: [
        {
          id: `${id}-submitted`,
          title: "Giấy đăng ký kinh doanh đã nộp",
          file: file.name,
          size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          issued: "2022-03-15",
        },
      ],
      history: [
        {
          title: "Nhà xe gửi hồ sơ đăng ký",
          time: new Date().toLocaleString("vi-VN"),
          actor: info.contact.trim(),
          status: "PENDING",
        },
      ],
    };
    setCompanies((list) => [record, ...list.filter((c) => c.id !== id)]);
    setUsers((list) =>
      list.some((u) => u.email.toLowerCase() === record.email.toLowerCase())
        ? list
        : [
            ...list,
            {
              id: `U-${id}`,
              name: record.contact,
              email: record.email,
              phone: record.phone,
              role: "company",
              status: "ACTIVE",
              registered: record.registered,
              city: record.city,
              administrativeAddress: { ...info.administrativeAddress },
              company: record.name,
              lastLogin: "Vừa đăng ký",
              lockReason: "",
              lockedAt: "",
              lockedBy: "",
            },
          ],
    );
    setCompanyId(id);
    setSubmittedFile(file);
    return "";
  };
  return (
    <Context.Provider
      value={{
        role,
        openRole,
        companies,
        setCompanies,
        users,
        setUsers,
        companyId,
        company,
        submittedFile,
        submitCompany,
        accountLocked,
      }}
    >
      {children}
    </Context.Provider>
  );
}
