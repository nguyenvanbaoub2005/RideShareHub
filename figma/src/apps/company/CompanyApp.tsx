import { useEffect, useRef, useState, type ReactNode } from "react";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Icon from "../../components/ui/Icon";
import { PasswordInput, TextInput } from "../../components/ui/Form";
import { Breadcrumbs } from "../../components/ui/Nav";
import { DataTable } from "../../components/ui/Data";
import { Modal } from "../../components/ui/Overlays";
import { cn } from "../../components/ui/cn";
import Management, { managementIds } from "./Management";
import { OperationsProvider, useOperations } from "./OperationsStore";
import TripOperations from "./TripOperations";
import { tripIds } from "./tripsModel";
import { usePrototypeSession } from "../../prototype/Session";
import { AdministrativeAddressFields } from "../../address/AddressFields";
import { formatAdministrativeAddress } from "../../address/model";
import {
  canAccessDashboard,
  canPublish,
  companyScreens,
  emptyCompany,
  sampleCompany,
  validateCompany,
  validateDocument,
  type CompanyInfo,
  type CompanyScreen,
  type CompanyStatus,
} from "./model";

const panel = "bg-surface border border-line rounded-[20px]";
const navItems = [
  ["dashboard", "Tổng quan", "dashboard"],
  ["profile", "Hồ sơ nhà xe", "building"],
  ["vehicles", "Quản lý phương tiện", "car"],
  ["drivers", "Quản lý tài xế", "users"],
  ["routes", "Quản lý tuyến đường", "route"],
  ["trips", "Quản lý chuyến đi", "bus"],
  ["bookings", "Quản lý đặt chỗ", "ticket"],
  ["tracking", "Theo dõi chuyến", "pin"],
] as const;

function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="size-9 rounded-xl bg-primary text-white grid place-items-center">
        <Icon name="bus" className="size-5" />
      </span>
      <span className={cn("text-xl font-extrabold tracking-tight", light && "text-white")}>
        RideShareHub
        <span className="block text-[10px] tracking-[.18em] uppercase font-medium text-slate-400">
          Đối tác vận tải
        </span>
      </span>
    </div>
  );
}

function AuthLayout({ children, register }: { children: ReactNode; register: boolean }) {
  return (
    <div className="h-full grid grid-cols-[540px_1fr] bg-surface">
      <aside className="bg-navy text-white p-14 flex flex-col relative overflow-hidden">
        <div className="absolute size-[600px] -left-60 -bottom-48 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative">
          <Brand light />
        </div>
        <div className="relative mt-28">
          <span className="text-teal text-xs uppercase tracking-[.2em] font-semibold">
            Cùng kết nối, cùng phát triển
          </span>
          <h2 className="text-[42px] leading-[1.18] tracking-tight font-bold mt-5">
            Vận hành gọn hơn.
            <br />
            Hành trình xa hơn.
          </h2>
          <p className="mt-6 text-slate-300 leading-7">
            Một không gian quản lý tập trung cho nhà xe. Kết nối hành khách, tài xế và mọi chuyến đi
            của bạn.
          </p>
        </div>
        <div className="relative mt-12 border border-white/15 rounded-3xl p-6 bg-white/5">
          <div className="text-sm font-medium text-slate-300">Kết nối miền Trung</div>
          <svg
            viewBox="0 0 380 155"
            className="w-full mt-3"
            role="img"
            aria-label="Sơ đồ kết nối Đà Nẵng, Huế, Hội An và Quảng Nam"
          >
            <path
              d="M38 50 C95 50 88 110 150 110 S235 30 300 40 L344 100"
              stroke="#334155"
              strokeWidth="3"
              fill="none"
            />
            <path
              d="M38 50 C95 50 88 110 150 110 S235 30 300 40"
              stroke="#14B8A6"
              strokeWidth="3"
              fill="none"
              strokeDasharray="6 6"
            />
            {[
              [38, 50, "Huế"],
              [150, 110, "Đà Nẵng"],
              [300, 40, "Hội An"],
              [344, 100, "Quảng Nam"],
            ].map(([x, y, label]) => (
              <g key={label}>
                <circle cx={x} cy={y} r="7" fill="#14B8A6" stroke="#0F172A" strokeWidth="3" />
                <text x={x} y={Number(y) + 25} textAnchor="middle" fill="#CBD5E1" fontSize="11">
                  {label}
                </text>
              </g>
            ))}
          </svg>
        </div>
        <div className="relative mt-auto text-xs text-slate-400 flex gap-2 items-center">
          <Icon name="shield" className="size-4 text-teal" />
          {register
            ? "Nhà xe được xác minh trước khi hoạt động"
            : "Không gian làm việc dành riêng cho nhà xe"}
        </div>
        <div className="relative mt-5 text-xs text-slate-500">
          © 2025 RideShareHub. Mọi quyền được bảo lưu.
        </div>
      </aside>
      <div className="overflow-y-auto px-20 py-12 flex flex-col">{children}</div>
    </div>
  );
}

const fields: {
  key: Exclude<keyof CompanyInfo, "administrativeAddress">;
  label: string;
  placeholder: string;
  type?: string;
  wide?: boolean;
}[] = [
  { key: "name", label: "Tên nhà xe", placeholder: "Nhà xe Minh Tâm" },
  { key: "businessNumber", label: "Mã số đăng ký kinh doanh", placeholder: "0402123456" },
  { key: "contact", label: "Người liên hệ", placeholder: "Nguyễn Minh Tâm" },
  { key: "phone", label: "Số điện thoại", placeholder: "0905 234 567", type: "tel" },
  {
    key: "email",
    label: "Email doanh nghiệp",
    placeholder: "dieuhanh@minhtam.vn",
    type: "email",
    wide: true,
  },
  {
    key: "address",
    label: "Địa chỉ trụ sở",
    placeholder: "Số nhà, đường, phường/xã, tỉnh/thành phố",
    wide: true,
  },
];

function CompanyWorkspace({ prototype = false }: { prototype?: boolean }) {
  const session = usePrototypeSession();
  const { setEditingTrip } = useOperations();
  const [screen, setScreen] = useState<CompanyScreen>(prototype ? "login" : "dashboard");
  const [localStatus, setStatus] = useState<CompanyStatus>(prototype ? "DRAFT" : "APPROVED");
  const [localInfo, setInfo] = useState<CompanyInfo>(sampleCompany);
  const status = session?.company?.status ?? localStatus;
  const info: CompanyInfo = session?.company
    ? {
        name: session.company.name,
        businessNumber: session.company.registration,
        contact: session.company.contact,
        email: session.company.email,
        phone: session.company.phone,
        address: session.company.address,
        administrativeAddress:
          session.company.administrativeAddress ?? sampleCompany.administrativeAddress,
      }
    : localInfo;
  const [draft, setDraft] = useState<CompanyInfo>(emptyCompany);
  const [file, setFile] = useState<File | null>(null);
  const [documentError, setDocumentError] = useState("");
  const [tried, setTried] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginTried, setLoginTried] = useState(false);
  const [notice, setNotice] = useState("");
  const [previewDoc, setPreviewDoc] = useState(false);
  const [url, setUrl] = useState("");
  const [dateView, setDateView] = useState("today");
  const [approvalTime, setApprovalTime] = useState("18/07/2025 · 08:30");
  const [submittedTime, setSubmittedTime] = useState("17/07/2025 · 14:25");
  const wrapper = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
  const [actualSize, setActualSize] = useState(false);
  useEffect(() => {
    if (session?.company?.status === "APPROVED" && screen === "pending") {
      setApprovalTime(stamp());
      setScreen("dashboard");
    }
  }, [session?.company?.status, screen]);

  useEffect(() => {
    if (!wrapper.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setFit(Math.min(1, entry.contentRect.width / 1440)),
    );
    observer.observe(wrapper.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!file) {
      setUrl("");
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  const go = (next: CompanyScreen) => {
    setNotice("");
    if (next === "pending" && canAccessDashboard(status)) {
      setScreen("dashboard");
      return;
    }
    if (
      ["dashboard", "profile", ...managementIds, ...tripIds].includes(next) &&
      !canAccessDashboard(status)
    ) {
      setScreen("pending");
      return;
    }
    setScreen(next);
  };
  const inspect = (next: CompanyScreen) => {
    // Screen inspection controls are outside the application; they are not admin actions.
    setNotice("");
    setScreen(next);
    if (next === "pending") {
      setStatus("PENDING");
      setInfo(sampleCompany);
    }
    if (
      next === "dashboard" ||
      next === "profile" ||
      managementIds.includes(next) ||
      tripIds.includes(next)
    ) {
      setStatus("APPROVED");
      setInfo(sampleCompany);
    }
  };
  const errors = validateCompany(draft, !!file);
  const loginErrors = {
    email: session?.accountLocked(email)
      ? "Tài khoản quản lý nhà xe đã bị khóa. Vui lòng liên hệ quản trị viên."
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ? "Vui lòng nhập email doanh nghiệp hợp lệ."
        : "",
    password: password.length < 8 ? "Mật khẩu cần có ít nhất 8 ký tự." : "",
  };
  const stamp = () =>
    new Date().toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  const documentName = file?.name ?? "Giay-dang-ky-kinh-doanh-Minh-Tam.pdf";
  const approved = canPublish(status);
  const statusBadge = (
    <Badge kind={approved ? "success" : status === "REJECTED" ? "error" : "warning"}>
      {approved ? "Đã phê duyệt" : status === "REJECTED" ? "Đã từ chối" : "Chờ phê duyệt"}
    </Badge>
  );
  const chooseFile = (candidate?: File) => {
    if (!candidate) return;
    const error = validateDocument(candidate);
    setDocumentError(error);
    setFile(error ? null : candidate);
  };
  const documentRow = (
    <div className="flex items-center gap-4 p-4 border border-line rounded-xl bg-canvas">
      <div className="size-12 bg-blue-50 text-primary rounded-xl grid place-items-center">
        <Icon name="shield" className="size-6" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{documentName}</div>
        <div className="text-xs text-slate-500 mt-1">
          {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "PDF · 2,4 MB · Tài liệu mẫu"} ·
          Giấy đăng ký kinh doanh
        </div>
      </div>
      <Button variant="secondary" icon="eye" onClick={() => setPreviewDoc(true)}>
        Xem tài liệu
      </Button>
    </div>
  );

  const login = (
    <AuthLayout register={false}>
      <div className="flex justify-end text-sm text-slate-500">
        Chưa là đối tác?
        <button onClick={() => go("register")} className="font-semibold text-primary ml-2">
          Đăng ký nhà xe <span aria-hidden>→</span>
        </button>
      </div>
      <div className="my-auto py-16 max-w-[440px] w-full mx-auto">
        <span className="inline-flex gap-2 items-center bg-blue-50 text-primary rounded-full px-3 py-1.5 text-xs font-semibold">
          <Icon name="building" className="size-4" />
          Cổng thông tin nhà xe
        </span>
        <h1 className="mt-6 text-4xl font-bold tracking-tight">Chào mừng trở lại</h1>
        <p className="mt-3 text-slate-500 leading-6">
          Đăng nhập để quản lý hoạt động vận tải
          <br />
          và đồng hành cùng hành khách.
        </p>
        <form
          noValidate
          className="mt-9 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            setLoginTried(true);
            if (Object.values(loginErrors).some(Boolean)) return;
            if (status === "PENDING" || status === "REJECTED") go("pending");
            else {
              setStatus("APPROVED");
              setInfo(sampleCompany);
              setScreen("dashboard");
            }
          }}
        >
          <TextInput
            label="Email doanh nghiệp"
            type="email"
            placeholder="dieuhanh@minhtam.vn"
            value={email}
            autoComplete="username"
            onChange={(e) => setEmail(e.target.value)}
            status={loginTried && loginErrors.email ? "error" : "default"}
            hint={loginTried ? loginErrors.email : ""}
          />
          <PasswordInput
            label="Mật khẩu"
            placeholder="Nhập mật khẩu của bạn"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            status={loginTried && loginErrors.password ? "error" : "default"}
            hint={loginTried ? loginErrors.password : ""}
          />
          <div className="text-xs text-slate-500 bg-canvas border border-line rounded-xl p-3 flex gap-2">
            <Icon name="info" className="size-4 shrink-0 text-primary" />
            Nguyên mẫu: nhập email hợp lệ và mật khẩu từ 8 ký tự để trải nghiệm.
          </div>
          <Button type="submit" size="lg" fullWidth>
            Đăng nhập <Icon name="right" className="size-4" />
          </Button>
        </form>
        <div className="mt-8 pt-6 border-t border-line text-sm text-center text-slate-500">
          Mở rộng hoạt động cùng RideShareHub.
          <br />
          <button className="text-primary font-semibold mt-2" onClick={() => go("register")}>
            Trở thành đối tác vận tải
          </button>
        </div>
      </div>
      <div className="text-center text-xs text-slate-400">
        Nền tảng kết nối nhà xe và hành khách tại miền Trung
      </div>
    </AuthLayout>
  );

  const register = (
    <AuthLayout register>
      <div className="flex justify-end gap-2 text-sm text-slate-500">
        Đã có tài khoản?
        <button onClick={() => go("login")} className="text-primary font-semibold">
          Đăng nhập
        </button>
      </div>
      <div className="max-w-[620px] w-full mx-auto mt-9">
        <div className="text-xs text-primary font-semibold uppercase tracking-widest">
          Bắt đầu hành trình hợp tác
        </div>
        <h1 className="text-[32px] font-bold mt-2 tracking-tight">Đăng ký nhà xe</h1>
        <p className="text-slate-500 mt-2 text-sm">
          Cung cấp thông tin doanh nghiệp để được xác minh và hoạt động.
        </p>
        <div className="flex items-center gap-3 text-xs font-semibold mt-6 mb-7">
          {["Thông tin nhà xe", "Xác minh hồ sơ", "Bắt đầu hoạt động"].map((l, i) => (
            <div key={l} className="flex items-center gap-2">
              <span
                className={cn(
                  "size-6 rounded-full grid place-items-center",
                  i === 0 ? "bg-primary text-white" : "bg-slate-100 text-slate-400",
                )}
              >
                {i + 1}
              </span>
              <span className={i === 0 ? "text-primary" : "text-slate-400"}>{l}</span>
              {i < 2 && <span className="w-6 h-px bg-line ml-2" />}
            </div>
          ))}
        </div>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setTried(true);
            if (Object.values(errors).some(Boolean) || documentError) return;
            if (session && file) {
              const registrationError = session.submitCompany(draft, file);
              if (registrationError) {
                setNotice(registrationError);
                return;
              }
            }
            setInfo(draft);
            setStatus("PENDING");
            setSubmittedTime(stamp());
            setScreen("pending");
          }}
        >
          <div className="grid grid-cols-2 gap-x-5 gap-y-4">
            {fields.map((f) => (
              <div key={f.key} className={f.wide ? "col-span-2" : ""}>
                {f.key === "address" ? (
                  <AdministrativeAddressFields
                    label="Địa chỉ trụ sở"
                    value={draft.administrativeAddress}
                    tried={tried}
                    onChange={(administrativeAddress) =>
                      setDraft({
                        ...draft,
                        administrativeAddress,
                        address: formatAdministrativeAddress(administrativeAddress),
                      })
                    }
                  />
                ) : (
                  <TextInput
                    label={`${f.label} *`}
                    type={f.type}
                    placeholder={f.placeholder}
                    value={draft[f.key]}
                    onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                    status={tried && errors[f.key] ? "error" : "default"}
                    hint={tried ? errors[f.key] : ""}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-5">
            <div className="text-sm font-medium mb-2">
              Giấy đăng ký kinh doanh <span className="text-danger">*</span>
            </div>
            <label
              className={cn(
                "relative flex items-center gap-4 p-5 rounded-xl border-2 border-dashed cursor-pointer bg-canvas hover:bg-blue-50/50",
                documentError || (tried && errors.document) ? "border-danger" : "border-line",
              )}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                chooseFile(e.dataTransfer.files[0]);
              }}
            >
              <Icon name={file ? "check" : "plus"} className="size-8 text-primary" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold truncate">
                  {file?.name ?? "Chọn tệp hoặc kéo thả vào đây"}
                </span>
                <span className="block text-xs text-slate-500 mt-1">
                  PDF, JPG, PNG · Tối đa 10 MB · Chỉ xem trước trong phiên này
                </span>
              </span>
              <input
                className="absolute inset-0 opacity-0 cursor-pointer"
                type="file"
                aria-label="Tải giấy đăng ký kinh doanh"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => chooseFile(e.target.files?.[0])}
              />
            </label>
            {(documentError || (tried && errors.document)) && (
              <p role="alert" className="text-danger text-xs mt-2">
                {documentError || errors.document}
              </p>
            )}
          </div>
          <div className="mt-5 p-3 rounded-xl bg-blue-50 text-blue-800 text-xs leading-5 flex gap-2">
            <Icon name="shield" className="size-4 shrink-0 mt-0.5" />
            Hồ sơ cần được quản trị viên phê duyệt trước khi bạn có thể đăng chuyến.
          </div>
          <Button type="submit" fullWidth size="lg" className="mt-5">
            Gửi hồ sơ đăng ký <Icon name="right" className="size-4" />
          </Button>
        </form>
      </div>
    </AuthLayout>
  );

  const summaryRows = fields.map((f) => (
    <div key={f.key} className={cn("py-3", f.wide && "col-span-2")}>
      <dt className="text-xs text-slate-500 mb-1.5">{f.label}</dt>
      <dd className="font-medium text-sm leading-6">{info[f.key]}</dd>
    </div>
  ));
  const timeline = (
    <ol className="space-y-0">
      {[
        ["Đã tiếp nhận hồ sơ", submittedTime, true, "check"],
        ["Đang xác minh thông tin", "Đối chiếu thông tin và giấy phép", true, "search"],
        [
          approved ? "Đã phê duyệt" : "Chờ quyết định phê duyệt",
          approved ? approvalTime : "Chúng tôi sẽ thông báo qua email",
          approved,
          "shield",
        ],
      ].map(([title, sub, done, icon], i) => (
        <li key={String(title)} className="flex gap-4">
          <div className="flex flex-col items-center">
            <span
              className={cn(
                "size-10 rounded-full grid place-items-center shrink-0",
                done ? "bg-blue-50 text-primary" : "bg-slate-100 text-slate-400",
              )}
            >
              <Icon name={String(icon)} className="size-[18px]" />
            </span>
            {i < 2 && <span className="w-px h-12 bg-line my-1" />}
          </div>
          <div className="pt-1">
            <div className="font-semibold text-sm">{title}</div>
            <div className="text-xs text-slate-500 mt-1.5">{sub}</div>
          </div>
        </li>
      ))}
    </ol>
  );

  const pending = (
    <>
      <div className={cn(panel, "p-8 flex gap-6 items-center border-amber-200 bg-amber-50/50")}>
        <div className="size-20 rounded-full bg-amber-100 text-amber-600 grid place-items-center shrink-0">
          <Icon name="clock" className="size-9" />
        </div>
        <div className="flex-1">
          <div className="mb-2">{statusBadge}</div>
          <h2 className="text-2xl font-bold">
            {status === "REJECTED" ? "Hồ sơ cần được bổ sung" : "Hồ sơ của bạn đang được xét duyệt"}
          </h2>
          <p className="mt-2 text-sm text-slate-600 leading-6">
            Cảm ơn bạn đã đăng ký trở thành đối tác RideShareHub.
            <br />
            {status === "REJECTED" ? (
              session?.company?.reason
            ) : (
              <>
                Kết quả xét duyệt sẽ cập nhật trong hồ sơ <b>{info.email}</b> sau khi quản trị viên
                xác minh.
              </>
            )}
          </p>
        </div>
        <div className="text-center bg-white border border-amber-200 rounded-2xl p-5">
          <div className="text-xs text-slate-500">Thời gian xử lý dự kiến</div>
          <div className="text-xl font-bold mt-2">1–2 ngày làm việc</div>
        </div>
      </div>
      <div className="grid grid-cols-[1.5fr_1fr] gap-6 mt-6">
        <section className={cn(panel, "p-6")}>
          <div className="flex justify-between items-center border-b border-line pb-4">
            <h2 className="font-bold text-lg">Thông tin đã đăng ký</h2>
            <span className="font-mono text-xs text-slate-400">HS-2025-0186</span>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 pt-2">{summaryRows}</dl>
          <div className="border-t border-line pt-4 mt-1">{documentRow}</div>
        </section>
        <div className="space-y-6">
          <section className={cn(panel, "p-6")}>
            <h2 className="font-bold text-lg mb-6">Tiến trình phê duyệt</h2>
            {timeline}
          </section>
          <div className="rounded-2xl bg-navy p-6 text-white">
            <Icon name="shield" className="size-7 text-teal mb-3" />
            <h3 className="font-semibold">Đảm bảo chất lượng mỗi hành trình</h3>
            <p className="text-sm text-slate-300 mt-2 leading-6">
              Chỉ nhà xe đã được phê duyệt mới được truy cập vận hành và đăng chuyến trên nền tảng.
            </p>
          </div>
        </div>
      </div>
    </>
  );

  const upcoming = [
    {
      code: "CH-2041",
      route: "Đà Nẵng → Huế",
      time: "07:30",
      vehicle: "43A-123.45",
      driver: "Nguyễn Văn Hải",
      seats: "12 / 16",
      status: "Sắp khởi hành",
    },
    {
      code: "CH-2042",
      route: "Đà Nẵng → Hội An",
      time: "09:00",
      vehicle: "43A-245.18",
      driver: "Trần Quốc Bảo",
      seats: "7 / 9",
      status: "Đang mở bán",
    },
    {
      code: "CH-2043",
      route: "Huế → Đà Nẵng",
      time: "13:00",
      vehicle: "43B-402.76",
      driver: "Lê Thanh Tùng",
      seats: "9 / 16",
      status: "Đang mở bán",
    },
    {
      code: "CH-2044",
      route: "Hội An → Quảng Nam",
      time: "15:30",
      vehicle: "43A-332.18",
      driver: "Phạm Minh Đức",
      seats: "5 / 9",
      status: "Đang mở bán",
    },
  ];
  const metrics = dateView === "today" ? ["24", "08", "186", "72"] : ["148", "08", "1.204", "286"];
  const dashboard = (
    <>
      <div className="flex items-center justify-between rounded-2xl border border-teal-200 bg-teal-50/60 px-5 py-3 text-sm">
        <span className="flex items-center gap-2.5 text-teal-800">
          <Icon name="shield" className="size-5" />
          <b>Nhà xe đã được phê duyệt.</b> Bạn đã sẵn sàng kết nối những hành trình mới.
        </span>
        <button
          onClick={() => go("profile")}
          className="font-semibold text-teal-800 flex items-center gap-1"
        >
          Xem hồ sơ <Icon name="right" className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-5 mt-6">
        {[
          [
            "Tổng chuyến đi",
            metrics[0],
            "bus",
            "bg-blue-50 text-primary",
            "Tất cả chuyến trong kỳ",
          ],
          [
            "Chuyến đang chạy",
            metrics[1],
            "route",
            "bg-teal-50 text-teal-700",
            "Đang phục vụ hành khách",
          ],
          [
            "Tổng lượt đặt chỗ",
            metrics[2],
            "ticket",
            "bg-violet-50 text-violet-600",
            "Đã xác nhận trong kỳ",
          ],
          [
            "Chỗ trống còn lại",
            metrics[3],
            "users",
            "bg-amber-50 text-amber-600",
            "Trên các chuyến mở bán",
          ],
        ].map(([label, value, icon, cls, sub]) => (
          <div key={label} className={cn(panel, "p-5")}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">{label}</span>
              <span className={cn("size-10 rounded-xl grid place-items-center", cls)}>
                <Icon name={icon} className="size-5" />
              </span>
            </div>
            <div className="text-[34px] font-bold tracking-tight mt-3">{value}</div>
            <div className="text-xs text-slate-400 mt-2">{sub}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[1.8fr_1fr] gap-6 mt-6">
        <section className={cn(panel, "p-6")}>
          <div className="flex justify-between">
            <div>
              <h2 className="font-bold text-lg">Nhịp vận hành hôm nay</h2>
              <p className="text-xs text-slate-500 mt-1">Số chuyến theo khung giờ · 18/07/2025</p>
            </div>
            <span className="flex items-center gap-2 text-xs text-slate-500">
              <span className="size-2 rounded-full bg-primary" />
              Chuyến khởi hành
            </span>
          </div>
          <div
            className="mt-5 h-[142px] flex items-end gap-5 border-b border-line px-4"
            role="img"
            aria-label="Biểu đồ số chuyến: 6 giờ có 3, 8 giờ có 5, 10 giờ có 4, 12 giờ có 2, 14 giờ có 4, 16 giờ có 3, 18 giờ có 2, 20 giờ có 1 chuyến"
          >
            {[3, 5, 4, 2, 4, 3, 2, 1].map((n, i) => (
              <div className="flex-1 flex flex-col justify-end items-center h-full" key={i}>
                <span className="text-[10px] text-slate-500 mb-1">{n}</span>
                <div
                  style={{ height: `${n * 20}px` }}
                  className={cn("w-full rounded-t-md", i === 1 ? "bg-primary" : "bg-blue-100")}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-5 px-4 mt-2">
            {["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"].map((t) => (
              <span key={t} className="flex-1 text-center text-[10px] text-slate-400">
                {t}
              </span>
            ))}
          </div>
        </section>
        <section className={cn(panel, "p-6")}>
          <h2 className="font-bold text-lg">Hoạt động gần đây</h2>
          <div className="space-y-5 mt-5">
            {[
              ["ticket", "Đặt chỗ mới · RSH-0317", "2 chỗ · Đà Nẵng → Huế", "2 phút trước"],
              ["check", "Tài xế đã nhận chuyến", "Nguyễn Văn Hải · CH-2041", "12 phút trước"],
              ["building", "Hồ sơ được phê duyệt", "Nhà xe đã đủ điều kiện hoạt động", "Hôm qua"],
            ].map(([icon, title, sub, time]) => (
              <div key={title} className="flex gap-3">
                <span className="size-9 rounded-full bg-blue-50 text-primary grid place-items-center shrink-0">
                  <Icon name={icon} className="size-4" />
                </span>
                <div>
                  <div className="font-medium text-xs">{title}</div>
                  <div className="text-xs text-slate-500 mt-1">{sub}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{time}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold">Chuyến sắp khởi hành</h2>
            <p className="text-xs text-slate-500 mt-1">4 chuyến gần nhất trong ngày 18/07/2025</p>
          </div>
          <span className="text-xs text-slate-500">Giờ địa phương · GMT+7</span>
        </div>
        <DataTable
          rows={upcoming}
          columns={[
            {
              key: "code",
              header: "Mã chuyến",
              render: (r) => <span className="font-medium text-primary">{r.code}</span>,
            },
            {
              key: "route",
              header: "Tuyến đường",
              render: (r) => <b className="font-semibold">{r.route}</b>,
            },
            { key: "time", header: "Giờ đi" },
            { key: "vehicle", header: "Biển số" },
            { key: "driver", header: "Tài xế" },
            { key: "seats", header: "Đã đặt" },
            {
              key: "status",
              header: "Trạng thái",
              render: (r) => (
                <Badge kind={r.status === "Sắp khởi hành" ? "warning" : "active"}>{r.status}</Badge>
              ),
            },
          ]}
        />
      </section>
    </>
  );

  const profile = (
    <>
      <div className={cn(panel, "p-7 flex items-center gap-5")}>
        <div className="size-20 rounded-2xl bg-navy text-white grid place-items-center">
          <Icon name="building" className="size-9" />
        </div>
        <div className="flex-1">
          <div className="flex gap-3 items-center">
            <h2 className="text-2xl font-bold">{info.name}</h2>
            {statusBadge}
          </div>
          <p className="mt-2 text-sm text-slate-500 flex items-center gap-1.5">
            <Icon name="pin" className="size-4" />
            Đà Nẵng · Đối tác vận tải miền Trung
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Mã đối tác: NX-0012 · Tham gia từ 17/07/2025
          </p>
        </div>
        <div className="text-right text-sm">
          <span className="text-slate-500">Trạng thái vận hành</span>
          <div className="mt-2 text-success font-semibold flex items-center gap-2 justify-end">
            <span className="size-2 rounded-full bg-success" />
            Đang hoạt động
          </div>
        </div>
      </div>
      <div className="grid grid-cols-[1.55fr_1fr] gap-6 mt-6">
        <div className="space-y-6">
          <section className={cn(panel, "p-6")}>
            <h2 className="font-bold text-lg pb-4 border-b border-line">
              Thông tin doanh nghiệp & liên hệ
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 pt-2">{summaryRows}</dl>
          </section>
          <section className={cn(panel, "p-6")}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-bold text-lg">Tài liệu đã nộp</h2>
              <Badge kind="success">Đã xác minh</Badge>
            </div>
            {documentRow}
            <p className="text-xs text-slate-400 mt-4">
              Tài liệu chỉ phục vụ việc xác minh doanh nghiệp trên RideShareHub.
            </p>
          </section>
        </div>
        <div className="space-y-6">
          <section className={cn(panel, "p-6")}>
            <h2 className="font-bold text-lg mb-6">Thông tin đăng ký</h2>
            {timeline}
          </section>
          <section className="p-6 rounded-2xl border border-blue-100 bg-blue-50/50">
            <Icon name="shield" className="size-7 text-primary" />
            <h3 className="font-semibold mt-3">Hồ sơ doanh nghiệp đã xác minh</h3>
            <p className="text-sm text-slate-500 mt-2 leading-6">
              Thay đổi thông tin pháp lý cần được xác minh lại bởi quản trị viên. Thông tin đăng ký
              được bảo vệ trong quá trình vận hành.
            </p>
          </section>
        </div>
      </div>
    </>
  );

  const title =
    screen === "pending"
      ? "Trạng thái đăng ký"
      : screen === "profile"
        ? "Hồ sơ nhà xe"
        : (companyScreens.find((s) => s.id === screen)?.title ?? "Tổng quan");
  const selectedNav = ["tripForm", "tripDetail", "stops", "optimization"].includes(screen)
    ? "trips"
    : screen === "vehicleForm"
      ? "vehicles"
      : screen === "driverForm"
        ? "drivers"
        : screen === "routeForm"
          ? "routes"
          : screen;
  const shell = (
    <div className="flex h-full bg-canvas">
      <aside className="w-64 bg-navy text-slate-300 p-5 flex flex-col shrink-0">
        <div className="px-1 pt-3">
          <Brand light />
        </div>
        <div className="border border-white/10 bg-white/5 rounded-xl p-3 mt-9 flex items-center gap-3">
          <span className="size-9 bg-teal/20 text-teal rounded-lg grid place-items-center text-sm font-bold">
            MT
          </span>
          <div className="min-w-0">
            <div className="text-white text-sm font-semibold truncate max-w-36">{info.name}</div>
            <div className="text-xs text-slate-400 mt-0.5">
              {approved ? "Đối tác đã xác minh" : "Đang chờ phê duyệt"}
            </div>
          </div>
        </div>
        <div className="mt-8 mb-3 px-3 text-[10px] font-medium tracking-widest text-slate-500">
          KHÔNG GIAN QUẢN LÝ
        </div>
        <nav className="space-y-1">
          {navItems.map(([id, label, icon]) => {
            const built =
              id === "dashboard" ||
              id === "profile" ||
              id === "vehicles" ||
              id === "drivers" ||
              id === "routes" ||
              id === "trips" ||
              id === "bookings" ||
              id === "tracking";
            return (
              <button
                key={id}
                disabled={!built || !approved}
                onClick={() => built && go(id)}
                title={
                  !built
                    ? "Sẽ thiết kế ở giai đoạn tiếp theo"
                    : !approved
                      ? "Cần được phê duyệt để truy cập"
                      : label
                }
                className={cn(
                  "w-full h-12 flex items-center gap-3 rounded-xl px-3 text-sm font-medium text-left transition focus-visible:outline-2 focus-visible:outline-teal",
                  selectedNav === id ? "bg-primary text-white" : "enabled:hover:bg-white/10",
                  (!built || !approved) && "opacity-40 cursor-not-allowed",
                )}
              >
                <Icon name={icon} className="size-[18px] shrink-0" />
                {label}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto rounded-2xl bg-white/5 border border-white/10 p-4">
          <Icon name="shield" className="size-6 text-teal" />
          <p className="text-sm text-white font-semibold mt-3">Vận hành an tâm</p>
          <p className="text-xs text-slate-400 mt-2 leading-5">
            Thông tin tập trung.
            <br />
            Hành trình luôn kết nối.
          </p>
        </div>
        <button
          onClick={() => go("login")}
          className="mt-4 h-11 flex items-center gap-3 px-3 text-sm hover:text-white"
        >
          <Icon name="logout" className="size-4" />
          Đăng xuất
        </button>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-[76px] shrink-0 bg-surface border-b border-line px-8 flex items-center justify-between">
          <Breadcrumbs items={["Không gian nhà xe", title]} />
          <div className="flex items-center gap-5">
            {statusBadge}
            <span className="h-7 w-px bg-line" />
            <span className="size-10 bg-blue-50 text-primary rounded-full font-bold text-sm grid place-items-center">
              MT
            </span>
            <div className="text-sm">
              <div className="font-semibold">{info.contact}</div>
              <div className="text-xs text-slate-500 mt-0.5">Quản lý nhà xe</div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8">
          <div className="flex items-center justify-between mb-7">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                <span className="w-5 h-px bg-primary" />
                {screen === "dashboard" ? "THỨ SÁU, 18 THÁNG 7, 2025" : "THÔNG TIN ĐỐI TÁC"}
              </div>
              <h1 className="text-[28px] font-bold tracking-tight">
                {screen === "dashboard"
                  ? `Chào buổi sáng, ${info.contact.split(" ").slice(-2).join(" ")}`
                  : title}
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                {screen === "dashboard"
                  ? "Cùng bắt đầu một ngày vận hành hiệu quả và an toàn."
                  : screen === "pending"
                    ? "Theo dõi tiến trình xác minh hồ sơ doanh nghiệp của bạn."
                    : managementIds.includes(screen) || tripIds.includes(screen)
                      ? "Quản lý nguồn lực và tuyến vận tải của nhà xe trong một không gian."
                      : "Quản lý thông tin pháp lý, liên hệ và tài liệu xác minh."}
              </p>
            </div>
            {screen === "dashboard" && (
              <div className="flex gap-3">
                <label className="flex items-center gap-2 px-4 border border-line bg-surface rounded-xl text-sm">
                  <Icon name="calendar" className="size-4 text-slate-500" />
                  <select
                    aria-label="Kỳ thống kê"
                    value={dateView}
                    onChange={(e) => setDateView(e.target.value)}
                    className="bg-transparent h-11 outline-none"
                  >
                    <option value="today">Hôm nay</option>
                    <option value="week">7 ngày qua</option>
                  </select>
                </label>
                <Button
                  icon="plus"
                  disabled={!approved}
                  onClick={() => {
                    if (canPublish(status)) {
                      setEditingTrip(null);
                      go("tripForm");
                    }
                  }}
                >
                  Đăng chuyến
                </Button>
              </div>
            )}
          </div>
          {screen === "pending"
            ? pending
            : screen === "profile"
              ? profile
              : screen === "dashboard"
                ? dashboard
                : null}
          <Management screen={screen} go={go} allowed={approved} companyName={info.name} />
          <TripOperations screen={screen} go={go} status={status} />
        </main>
        <footer className="h-10 px-8 flex justify-between items-center border-t border-line text-[10px] text-slate-400 bg-canvas shrink-0">
          <span>© 2025 RideShareHub · Không gian nhà xe</span>
          <span>Đà Nẵng · Huế · Hội An · Quảng Nam</span>
        </footer>
      </div>
    </div>
  );

  const scale = actualSize ? 1 : fit;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {companyScreens.map((s) => (
            <button
              key={s.id}
              onClick={() => (prototype ? go(s.id) : inspect(s.id))}
              className={cn(
                "rounded-xl border px-3 py-2 text-left text-xs transition",
                screen === s.id
                  ? "bg-primary border-primary text-white"
                  : "bg-surface border-line text-slate-500 hover:border-primary",
              )}
            >
              <span className="block font-mono font-semibold">{s.code}</span>
              <span className="block mt-1">{s.title}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setActualSize(!actualSize)}
          className="text-xs font-semibold px-3 py-2 bg-surface border border-line rounded-lg"
        >
          {actualSize ? "Vừa vùng xem" : "Kích thước gốc 100%"}
        </button>
      </div>
      {prototype && screen === "pending" && (
        <div className="flex justify-between items-center bg-blue-50 border border-blue-200 p-4 rounded-xl gap-4">
          <p className="text-sm text-blue-900">
            <b>Điều khiển nguyên mẫu — ngoài ứng dụng:</b> mô phỏng quyết định của quản trị viên để
            tiếp tục luồng.
          </p>
          <Button
            onClick={() => {
              if (session) {
                session.openRole("admin");
                return;
              }
              setStatus("APPROVED");
              setApprovalTime(stamp());
              setScreen("dashboard");
            }}
          >
            {session ? "Chuyển sang Admin để duyệt hồ sơ" : "Mô phỏng: được phê duyệt"}
          </Button>
        </div>
      )}
      <div
        ref={wrapper}
        className="min-w-0 w-full overflow-x-auto rounded-2xl border border-line bg-slate-200/50"
      >
        <div style={{ width: 1440 * scale, height: 1024 * scale, position: "relative" }}>
          <div
            data-company-screen={screen}
            style={{
              width: 1440,
              height: 1024,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
            className="relative overflow-hidden text-navy"
          >
            {screen === "login" ? login : screen === "register" ? register : shell}
            <Modal
              contained
              open={!!notice}
              title="Thông báo"
              onClose={() => setNotice("")}
              footer={<Button onClick={() => setNotice("")}>Đã hiểu</Button>}
            >
              <p className="leading-6">{notice}</p>
            </Modal>
            <Modal
              contained
              open={previewDoc}
              width="max-w-3xl"
              title={documentName}
              onClose={() => setPreviewDoc(false)}
            >
              {url ? (
                file?.type === "application/pdf" ? (
                  <iframe
                    title="Tài liệu đăng ký kinh doanh"
                    src={url}
                    className="w-full h-[600px] border border-line rounded-xl"
                  />
                ) : (
                  <img
                    src={url}
                    alt="Giấy đăng ký kinh doanh đã chọn"
                    className="max-h-[600px] w-full object-contain"
                  />
                )
              ) : (
                <div className="border border-line bg-canvas rounded-xl px-12 py-10 text-center">
                  <p className="text-xs font-semibold tracking-widest">
                    TÀI LIỆU MẪU · CHỈ DÙNG CHO NGUYÊN MẪU
                  </p>
                  <Icon name="shield" className="size-14 mx-auto text-primary mt-8" />
                  <h3 className="text-xl font-bold mt-6">
                    GIẤY CHỨNG NHẬN
                    <br />
                    ĐĂNG KÝ DOANH NGHIỆP
                  </h3>
                  <dl className="mt-8 text-left space-y-4">
                    <div>
                      Tên doanh nghiệp: <b>{info.name}</b>
                    </div>
                    <div>
                      Mã số doanh nghiệp: <b>{info.businessNumber}</b>
                    </div>
                    <div>
                      Người đại diện: <b>{info.contact}</b>
                    </div>
                    <div>Địa chỉ: {info.address}</div>
                  </dl>
                  <p className="mt-8 text-xs text-slate-400">
                    Bản minh họa không có giá trị pháp lý.
                  </p>
                </div>
              )}
            </Modal>
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-400">
        Khung thiết kế 1440 × 1024 px · Thu phóng {Math.round(scale * 100)}% · Chỉ mô phỏng giao
        diện; dữ liệu và tệp không được gửi đến máy chủ.
      </p>
    </div>
  );
}

export default function CompanyApp({ prototype = false }: { prototype?: boolean }) {
  return (
    <OperationsProvider>
      <CompanyWorkspace prototype={prototype} />
    </OperationsProvider>
  );
}
