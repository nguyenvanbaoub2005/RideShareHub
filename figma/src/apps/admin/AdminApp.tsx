import { useEffect, useRef, useState, type ReactNode } from "react";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Icon from "../../components/ui/Icon";
import { TextInput, PasswordInput, SearchInput } from "../../components/ui/Form";
import { DataTable, Pagination } from "../../components/ui/Data";
import { Breadcrumbs } from "../../components/ui/Nav";
import { ConfirmDialog, Modal } from "../../components/ui/Overlays";
import { cn } from "../../components/ui/cn";
import { usePrototypeSession } from "../../prototype/Session";
import { panel, number, date, Metric, Message } from "./shared";
import AdminOperations, { opsScreens } from "./AdminOperations";
import { adminUsers, type AdminUser } from "./monitoringModel";
import {
  adminCompanies,
  adminScreens,
  approvalLabels,
  dashboardStats,
  filterCompanies,
  loginErrors,
  publishingAllowed,
  reviewCompany,
  type AdminCompany,
  type AdminScreen,
  type ApprovalStatus,
  type CompanyDocument,
} from "./model";

const badge = (status: ApprovalStatus) => (
  <Badge kind={status === "APPROVED" ? "success" : status === "REJECTED" ? "error" : "warning"}>
    {approvalLabels[status]}
  </Badge>
);
const navigation = [
  ["dashboard", "Tổng quan", "dashboard"],
  ["companies", "Quản lý nhà xe", "building"],
  ["users", "Quản lý người dùng", "users"],
  ["monitoring", "Giám sát chuyến đi", "route"],
  ["bookings", "Quản lý đặt chỗ", "ticket"],
  ["reports", "Báo cáo", "calendar"],
] as const;

function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className="flex gap-3 items-center">
      <span className="size-10 rounded-xl bg-primary grid place-items-center text-white">
        <Icon name="bus" className="size-6" />
      </span>
      <span className={cn("font-extrabold text-xl tracking-tight", light && "text-white")}>
        RideShareHub
        <span className="block text-[9px] font-medium uppercase tracking-[.22em] text-slate-400">
          Trung tâm quản trị
        </span>
      </span>
    </div>
  );
}
function BookingChart({ period }: { period: "week" | "today" }) {
  const stats = dashboardStats[period];
  const max = Math.max(...stats.series);
  return (
    <section className={cn(panel, "p-6")}>
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-base font-bold">Xu hướng đặt chỗ</h2>
          <p className="text-xs text-slate-500 mt-1">
            {period === "week" ? "Từ 12/07 đến 18/07/2025" : "Theo khung giờ · 18/07/2025"}
          </p>
        </div>
        <span className="text-xs text-slate-500 flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-primary" />
          Lượt đặt chỗ
        </span>
      </div>
      <div
        className="flex gap-6 h-[140px] items-end mt-6 px-4 border-b border-line"
        role="img"
        aria-label={`Lượt đặt chỗ theo kỳ: ${stats.labels.map((l, i) => `${l}: ${stats.series[i]}`).join(", ")}`}
      >
        {stats.series.map((v, i) => (
          <div key={i} className="flex-1 h-full flex flex-col justify-end items-center">
            <span className="text-[10px] text-slate-500 mb-1">{number(v)}</span>
            <div
              className={cn(
                "w-full max-w-[45px] rounded-t-md",
                i === stats.series.length - 1 ? "bg-primary" : "bg-blue-100",
              )}
              style={{ height: `${(v / max) * 110}px` }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-6 mt-2 px-4">
        {stats.labels.map((l) => (
          <span key={l} className="flex-1 text-center text-[10px] text-slate-400">
            {l}
          </span>
        ))}
      </div>
    </section>
  );
}

export default function AdminApp({
  prototype = false,
  initialScreen,
}: {
  prototype?: boolean;
  initialScreen?: AdminScreen;
}) {
  const session = usePrototypeSession();
  const [screen, setScreen] = useState<AdminScreen>(
    prototype ? "login" : (initialScreen ?? "dashboard"),
  );
  const [signedIn, setSignedIn] = useState(!prototype);
  const [localCompanies, setLocalCompanies] = useState(adminCompanies);
  const [localUsers, setLocalUsers] = useState<AdminUser[]>(adminUsers);
  const companies = session?.companies ?? localCompanies;
  const setCompanies = session?.setCompanies ?? setLocalCompanies;
  const users = session?.users ?? localUsers;
  const setUsers = session?.setUsers ?? setLocalUsers;
  const [selectedUserId, setSelectedUserId] = useState("U-0001");
  const [selectedId, setSelectedId] = useState(session?.companyId || "NX-0018");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [triedLogin, setTriedLogin] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState<"week" | "today">("week");
  const [reason, setReason] = useState("");
  const [reasonTried, setReasonTried] = useState(false);
  const [decision, setDecision] = useState<{
    id: string;
    status: "APPROVED" | "REJECTED";
    reason: string;
  } | null>(null);
  const [document, setDocument] = useState<CompanyDocument | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fullSize, setFullSize] = useState(false);
  const [fit, setFit] = useState(1);
  const [submittedUrl, setSubmittedUrl] = useState("");
  const submittedDocument = session?.companyId === selectedId ? session.submittedFile : null;
  useEffect(() => {
    if (!document || !submittedDocument) {
      setSubmittedUrl("");
      return;
    }
    const url = URL.createObjectURL(submittedDocument);
    setSubmittedUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [document, submittedDocument]);
  useEffect(() => {
    if (session?.companyId) {
      setSelectedId(session.companyId);
      setDecision(null);
    }
  }, [session?.companyId]);
  const viewport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!viewport.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setFit(Math.min(1, entry.contentRect.width / 1440)),
    );
    observer.observe(viewport.current);
    return () => observer.disconnect();
  }, []);
  const selected = companies.find((c) => c.id === selectedId)!;
  const pending = companies.filter((c) => c.status === "PENDING");
  const approved = companies.filter((c) => c.status === "APPROVED");
  const rejected = companies.filter((c) => c.status === "REJECTED");
  const stats = dashboardStats[period];
  const authErrors = loginErrors(email, password);
  const reasonError = !reason.trim()
    ? "Vui lòng nhập lý do từ chối để nhà xe có thể bổ sung hồ sơ."
    : reason.trim().length > 500
      ? "Lý do không được vượt quá 500 ký tự."
      : "";
  const go = (next: AdminScreen) => {
    setMessage("");
    setError("");
    setDecision(null);
    setDocument(null);
    if (next !== "login" && !signedIn) {
      setScreen("login");
      return;
    }
    setScreen(next);
  };
  const openCompany = (id: string) => {
    setSelectedId(id);
    setReason("");
    setReasonTried(false);
    go("approval");
  };
  const openPending = () => {
    setQuery("");
    setStatusFilter("PENDING");
    setCityFilter("all");
    setPage(1);
    go("companies");
  };
  const requestDecision = (value: "APPROVED" | "REJECTED") => {
    setError("");
    if (selected.status !== "PENDING") {
      setError("Hồ sơ này đã được xử lý.");
      return;
    }
    if (value === "REJECTED") {
      setReasonTried(true);
      if (reasonError) return;
    }
    setDecision({
      id: selected.id,
      status: value,
      reason: value === "REJECTED" ? reason.trim() : "",
    });
  };
  const confirmDecision = () => {
    if (!decision || !signedIn) return;
    const company = companies.find((c) => c.id === decision.id);
    if (!company) {
      setError("Không tìm thấy hồ sơ cần xử lý.");
      setDecision(null);
      return;
    }
    const result = reviewCompany(
      company,
      decision.status,
      decision.reason,
      true,
      new Date().toLocaleString("vi-VN"),
    );
    setDecision(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setCompanies((list) => list.map((c) => (c.id === company.id ? result.company : c)));
    setMessage(
      decision.status === "APPROVED"
        ? `Đã phê duyệt ${company.name}. Nhà xe đủ điều kiện công bố chuyến.`
        : `Đã từ chối ${company.name}. Lý do đã được ghi vào hồ sơ.`,
    );
    setReason("");
    setReasonTried(false);
  };
  const companyTable = (list: AdminCompany[], compact = false) => (
    <DataTable
      rows={list}
      columns={[
        {
          key: "name",
          header: "Nhà xe / Mã đăng ký",
          render: (c) => (
            <div className="flex items-center gap-3">
              <span className="size-9 rounded-xl bg-blue-50 text-primary grid place-items-center shrink-0">
                <Icon name="building" className="size-[18px]" />
              </span>
              <button onClick={() => openCompany(c.id)} className="text-left">
                <span className="text-sm font-semibold">{c.name}</span>
                <span className="block mt-1 text-[10px] text-slate-400 font-mono">
                  {c.registration} · {c.city}
                </span>
              </button>
            </div>
          ),
        },
        {
          key: "contact",
          header: "Liên hệ",
          render: (c) => (
            <div className="text-xs font-medium">
              {c.contact}
              <p className="font-normal text-slate-500 mt-1">{compact ? c.phone : c.email}</p>
            </div>
          ),
        },
        {
          key: "registered",
          header: "Ngày đăng ký",
          render: (c) => <span className="text-xs">{date(c.registered)}</span>,
        },
        { key: "status", header: "Phê duyệt", render: (c) => badge(c.status) },
        ...(!compact
          ? [
              {
                key: "permission",
                header: "Đăng chuyến",
                render: (c: AdminCompany) => (
                  <span
                    className={cn(
                      "text-xs font-medium",
                      publishingAllowed(c) ? "text-green-700" : "text-slate-400",
                    )}
                  >
                    {publishingAllowed(c) ? "Được phép" : "Chưa được phép"}
                  </span>
                ),
              },
            ]
          : []),
        {
          key: "action",
          header: "Thao tác",
          render: (c) => (
            <button
              onClick={() => openCompany(c.id)}
              className="text-xs font-semibold text-primary hover:bg-blue-50 rounded-lg px-3 py-2 whitespace-nowrap"
            >
              {c.status === "PENDING" ? "Duyệt hồ sơ" : "Xem chi tiết"} <span aria-hidden>→</span>
            </button>
          ),
        },
      ]}
    />
  );

  const login = (
    <div className="grid grid-cols-[600px_1fr] h-full bg-white">
      <aside className="bg-navy p-14 text-white relative overflow-hidden flex flex-col">
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              "linear-gradient(#334155 1px,transparent 1px),linear-gradient(90deg,#334155 1px,transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div className="absolute size-[500px] rounded-full bg-primary/25 blur-3xl -bottom-32 -left-36" />
        <div className="relative">
          <Brand light />
        </div>
        <div className="relative my-auto">
          <div className="size-20 rounded-3xl border border-white/10 bg-white/5 grid place-items-center text-teal">
            <Icon name="shield" className="size-10" />
          </div>
          <p className="uppercase tracking-[.2em] font-semibold text-xs text-teal mt-10">
            Một hệ thống. Mọi hành trình.
          </p>
          <h2 className="mt-5 text-[44px] leading-[1.18] font-bold tracking-tight">
            Vận hành minh bạch.
            <br />
            Kết nối tin cậy.
          </h2>
          <p className="text-slate-300 mt-6 leading-7 max-w-sm">
            Giám sát nền tảng, xác minh đối tác và đảm bảo chất lượng cho mỗi chuyến xe ghép.
          </p>
          <div className="flex gap-3 mt-10">
            {["Đà Nẵng", "Huế", "Hội An", "Quảng Nam"].map((city) => (
              <span
                key={city}
                className="text-xs text-slate-300 border border-white/10 rounded-full px-3 py-2"
              >
                {city}
              </span>
            ))}
          </div>
        </div>
        <div className="relative text-xs text-slate-500">
          © 2025 RideShareHub · Cổng quản trị nội bộ
        </div>
      </aside>
      <div className="flex flex-col p-14">
        <div className="flex justify-end items-center gap-2 text-xs text-slate-400">
          <Icon name="shield" className="size-4" />
          Chỉ dành cho nhân sự được cấp quyền
        </div>
        <div className="max-w-[420px] w-full m-auto py-12">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-50 text-primary">
            Không gian quản trị
          </span>
          <h1 className="font-bold text-[36px] tracking-tight mt-6">Đăng nhập quản trị</h1>
          <p className="text-slate-500 leading-6 mt-3">
            Chào mừng trở lại. Đăng nhập để theo dõi
            <br />
            và điều hành RideShareHub.
          </p>
          <form
            noValidate
            className="space-y-5 mt-9"
            onSubmit={(e) => {
              e.preventDefault();
              setTriedLogin(true);
              if (Object.values(authErrors).some(Boolean)) return;
              setSignedIn(true);
              setScreen("dashboard");
              setError("");
            }}
          >
            <TextInput
              label="Email quản trị"
              type="email"
              autoComplete="username"
              value={email}
              placeholder="quantri@ridesharehub.vn"
              onChange={(e) => setEmail(e.target.value)}
              status={triedLogin && authErrors.email ? "error" : "default"}
              hint={triedLogin ? authErrors.email : ""}
            />
            <PasswordInput
              label="Mật khẩu"
              autoComplete="current-password"
              value={password}
              placeholder="Nhập mật khẩu của bạn"
              onChange={(e) => setPassword(e.target.value)}
              status={triedLogin && authErrors.password ? "error" : "default"}
              hint={triedLogin ? authErrors.password : ""}
            />
            <Button fullWidth size="lg" type="submit">
              Đăng nhập <Icon name="right" className="size-4" />
            </Button>
          </form>
          <div className="mt-6 text-xs text-slate-500 rounded-xl border border-line bg-canvas p-4 leading-5 flex gap-2">
            <Icon name="info" className="size-4 shrink-0 mt-0.5 text-primary" />
            Nguyên mẫu: dùng email hợp lệ và mật khẩu từ 8 ký tự. Chưa có xác thực tài khoản thật.
          </div>
        </div>
        <p className="text-xs text-slate-400 text-center">
          Dữ liệu trong nguyên mẫu chỉ dùng để minh họa.
        </p>
      </div>
    </div>
  );

  const dashboard = (
    <>
      <div className="grid grid-cols-4 gap-4">
        <Metric
          label="Tổng nhà xe"
          value={companies.length}
          icon="building"
          note={`${approved.length} đã duyệt · ${rejected.length} từ chối`}
        />
        <Metric
          label="Chờ phê duyệt"
          value={pending.length}
          icon="clock"
          tone="amber"
          note="Hồ sơ cần quản trị viên xem xét"
        />
        <Metric
          label="Tổng người dùng"
          value={users.length}
          icon="users"
          note={`${users.filter((u) => u.status === "LOCKED").length} tài khoản đang bị khóa`}
        />
        <Metric
          label="Tổng chuyến đi"
          value={stats.totalTrips}
          icon="bus"
          note={period === "week" ? "Trong 7 ngày · 12–18/07/2025" : "Trong ngày 18/07/2025"}
        />
        <Metric
          label="Chuyến đang chạy"
          value={stats.active}
          icon="route"
          tone="teal"
          note="Đang thực hiện hành trình"
        />
        <Metric
          label="Chuyến hoàn thành"
          value={stats.completed}
          icon="check"
          tone="teal"
          note={`${Math.round((stats.completed / stats.totalTrips) * 100)}% tổng chuyến trong kỳ`}
        />
        <Metric
          label="Chuyến đã hủy"
          value={stats.cancelled}
          icon="x"
          tone="red"
          note={`${stats.scheduled} chuyến khác đang chờ khởi hành`}
        />
        <Metric
          label="Tổng lượt đặt chỗ"
          value={stats.bookings.total}
          icon="ticket"
          note={`${number(stats.bookings.confirmed)} lượt đã xác nhận`}
        />
      </div>
      <div className="grid grid-cols-4 gap-4 mt-6">
        {(
          [
            ["users", "Quản lý người dùng", "users", `${users.length} tài khoản`],
            ["monitoring", "Giám sát chuyến đi", "route", `${stats.active} chuyến đang chạy`],
            [
              "bookings",
              "Giám sát đặt chỗ",
              "ticket",
              `${number(stats.bookings.total)} lượt đặt chỗ`,
            ],
            ["reports", "Báo cáo", "calendar", "Thống kê theo ngày"],
          ] as const
        ).map(([id, label, icon, hint]) => (
          <button
            key={id}
            onClick={() => go(id)}
            className={cn(
              panel,
              "p-4 flex items-center gap-3 text-left hover:border-primary transition",
            )}
          >
            <span className="size-10 rounded-xl bg-blue-50 text-primary grid place-items-center shrink-0">
              <Icon name={icon} className="size-5" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold">{label}</span>
              <span className="block text-[10px] text-slate-400 mt-0.5">{hint}</span>
            </span>
            <Icon name="right" className="size-4 text-slate-400" />
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[1.65fr_1fr] gap-6 mt-6">
        <BookingChart period={period} />
        <section className={cn(panel, "p-6")}>
          <h2 className="font-bold">Thống kê đặt chỗ</h2>
          <p className="text-xs text-slate-500 mt-1">Phân bổ trạng thái trong kỳ đang chọn</p>
          <div className="flex items-center gap-6 mt-6">
            <div
              className="size-[132px] rounded-full shrink-0 grid place-items-center"
              style={{
                background: `conic-gradient(#14B8A6 0 ${(stats.bookings.completed / stats.bookings.total) * 100}%, #2563EB 0 ${((stats.bookings.completed + stats.bookings.confirmed) / stats.bookings.total) * 100}%, #DC2626 0 100%)`,
              }}
              role="img"
              aria-label={`Hoàn thành ${stats.bookings.completed}, xác nhận ${stats.bookings.confirmed}, hủy ${stats.bookings.cancelled}`}
            >
              <div className="size-[102px] rounded-full bg-white grid place-content-center text-center">
                <b className="text-xl">{number(stats.bookings.total)}</b>
                <span className="text-[10px] text-slate-400">lượt đặt chỗ</span>
              </div>
            </div>
            <div className="flex-1 space-y-4">
              {[
                ["Hoàn thành", stats.bookings.completed, "bg-teal"],
                ["Đã xác nhận", stats.bookings.confirmed, "bg-primary"],
                ["Đã hủy", stats.bookings.cancelled, "bg-danger"],
              ].map(([label, n, color]) => (
                <div key={label} className="flex gap-2 items-center text-xs">
                  <span className={cn("size-2 rounded-full", String(color))} />
                  <span className="text-slate-500">{label}</span>
                  <b className="ml-auto">{number(Number(n))}</b>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-5 text-[10px] text-slate-400">
            Số liệu minh họa, chưa kết nối nguồn dữ liệu vận hành.
          </p>
        </section>
      </div>
      <section className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg">
              Hồ sơ nhà xe chờ phê duyệt{" "}
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800">
                {pending.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Xác minh thông tin để nhà xe bắt đầu hoạt động.
            </p>
          </div>
          <button
            onClick={openPending}
            className="text-primary text-sm font-semibold flex gap-1 items-center"
          >
            Xem tất cả <Icon name="right" className="size-4" />
          </button>
        </div>
        {pending.length ? (
          companyTable(pending.slice(0, 3), true)
        ) : (
          <div className={cn(panel, "p-10 text-center")}>
            <Icon name="check" className="size-8 text-success mx-auto" />
            <h3 className="font-semibold mt-3">Đã xử lý hết hồ sơ đang chờ</h3>
            <button
              onClick={() => go("companies")}
              className="text-sm font-semibold text-primary mt-3"
            >
              Xem danh sách nhà xe
            </button>
          </div>
        )}
      </section>
    </>
  );

  const matching = filterCompanies(companies, query, statusFilter, cityFilter);
  const pages = Math.max(1, Math.ceil(matching.length / 6));
  const safePage = Math.min(page, pages);
  const list = (
    <>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Metric
          label="Tất cả nhà xe"
          value={companies.length}
          icon="building"
          note="Đối tác đã đăng ký trên nền tảng"
        />
        <Metric
          label="Chờ phê duyệt"
          value={pending.length}
          icon="clock"
          tone="amber"
          note="Cần xác minh trước khi hoạt động"
        />
        <Metric
          label="Đã phê duyệt"
          value={approved.length}
          icon="check"
          tone="teal"
          note="Đủ điều kiện công bố chuyến đi"
        />
        <Metric
          label="Đã từ chối"
          value={rejected.length}
          icon="x"
          tone="red"
          note="Cần bổ sung hồ sơ theo lý do"
        />
      </div>
      <section className={cn(panel, "p-6")}>
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">Danh sách nhà xe</h2>
          <span className="text-xs text-slate-400">{matching.length} kết quả</span>
        </div>
        <div className="flex gap-2 mt-5 pb-5 border-b border-line">
          {[
            ["all", "Tất cả", companies.length],
            ["PENDING", "Chờ phê duyệt", pending.length],
            ["APPROVED", "Đã phê duyệt", approved.length],
            ["REJECTED", "Đã từ chối", rejected.length],
          ].map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => {
                setStatusFilter(String(key));
                setPage(1);
              }}
              className={cn(
                "text-xs font-semibold rounded-full px-4 h-9 flex gap-2 items-center",
                statusFilter === key
                  ? "bg-navy text-white"
                  : "bg-canvas text-slate-500 hover:bg-slate-100",
              )}
            >
              {label}
              <span className="opacity-60">{count}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-3 my-5">
          <div className="w-[400px]">
            <SearchInput
              aria-label="Tìm nhà xe"
              placeholder="Tìm tên nhà xe, mã đăng ký, liên hệ..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            aria-label="Lọc phê duyệt"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-white border border-line rounded-xl px-3 text-sm"
          >
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(approvalLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="Lọc địa phương"
            value={cityFilter}
            onChange={(e) => {
              setCityFilter(e.target.value);
              setPage(1);
            }}
            className="bg-white border border-line rounded-xl px-3 text-sm"
          >
            <option value="all">Tất cả địa phương</option>
            {["Đà Nẵng", "Huế", "Hội An", "Quảng Nam"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          {(query || statusFilter !== "all" || cityFilter !== "all") && (
            <button
              className="text-primary text-xs font-semibold"
              onClick={() => {
                setQuery("");
                setStatusFilter("all");
                setCityFilter("all");
                setPage(1);
              }}
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
        {companyTable(matching.slice((safePage - 1) * 6, safePage * 6))}
        {matching.length ? (
          <div className="mt-5">
            <Pagination
              page={safePage}
              pages={pages}
              perPage={6}
              total={matching.length}
              onChange={setPage}
            />
          </div>
        ) : (
          <div className="py-14 text-center">
            <Icon name="search" className="size-9 text-slate-300 mx-auto" />
            <h3 className="font-semibold mt-3">Không tìm thấy nhà xe phù hợp</h3>
            <p className="text-sm text-slate-500 mt-1">Thử tên khác hoặc xóa bộ lọc.</p>
          </div>
        )}
      </section>
      <div className="mt-5 text-xs text-slate-500 flex gap-2 items-center">
        <Icon name="shield" className="size-4 text-primary" />
        Chỉ nhà xe được phê duyệt mới có quyền công bố chuyến trên RideShareHub.
      </div>
    </>
  );

  const profileRows = [
    ["Tên doanh nghiệp", selected.legalName],
    ["Mã số đăng ký kinh doanh", selected.registration],
    ["Người đại diện pháp luật", selected.representative],
    ["Ngày cấp đăng ký", date(selected.businessIssued)],
    ["Địa chỉ trụ sở", selected.address],
  ];
  const details = (
    <>
      <button
        onClick={() => go("companies")}
        className="text-sm text-slate-500 hover:text-primary mb-5 inline-flex items-center gap-1"
      >
        <Icon name="left" className="size-4" />
        Quay lại danh sách nhà xe
      </button>
      <section className={cn(panel, "p-6 flex items-center gap-5 mb-6")}>
        <span className="size-16 rounded-2xl bg-navy text-white grid place-items-center shrink-0">
          <Icon name="building" className="size-8" />
        </span>
        <div className="flex-1">
          <div className="flex gap-3 items-center">
            <h2 className="text-2xl font-bold">{selected.name}</h2>
            {badge(selected.status)}
          </div>
          <p className="text-sm text-slate-500 mt-2">
            {selected.id} · {selected.city} · Đăng ký ngày {date(selected.registered)}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Quyền công bố chuyến</div>
          <div
            className={cn(
              "text-sm font-semibold mt-2 flex gap-2 items-center justify-end",
              publishingAllowed(selected) ? "text-green-700" : "text-slate-500",
            )}
          >
            <Icon name="shield" className="size-4" />
            {publishingAllowed(selected) ? "Đã được cấp quyền" : "Chưa được cấp quyền"}
          </div>
        </div>
      </section>
      <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-6">
        <div className="space-y-6">
          <section className={cn(panel, "p-6")}>
            <h3 className="font-bold text-lg border-b border-line pb-4">
              Thông tin đăng ký doanh nghiệp
            </h3>
            <dl className="grid grid-cols-2 gap-x-6 pt-2">
              {profileRows.map(([label, value], i) => (
                <div key={label} className={cn("py-3", i === 4 && "col-span-2")}>
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="text-sm font-medium mt-2 leading-6">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className={cn(panel, "p-6")}>
            <h3 className="font-bold text-lg border-b border-line pb-4">Thông tin liên hệ</h3>
            <dl className="grid grid-cols-2 gap-x-6 pt-2">
              {[
                ["Người liên hệ", selected.contact],
                ["Số điện thoại", selected.phone],
                ["Email doanh nghiệp", selected.email],
              ].map(([label, value]) => (
                <div key={label} className="py-3">
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="text-sm font-medium mt-2">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className={cn(panel, "p-6")}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">Tài liệu đã nộp</h3>
              <span className="text-xs text-slate-400">
                {selected.documents.length} tài liệu mẫu
              </span>
            </div>
            <div className="space-y-3">
              {selected.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 rounded-xl border border-line bg-canvas p-4"
                >
                  <span className="size-10 rounded-xl bg-blue-50 text-primary grid place-items-center shrink-0">
                    <Icon name="shield" className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold">{doc.title}</div>
                    <div className="text-[10px] text-slate-400 mt-1 truncate">
                      {doc.file} · PDF · {doc.size}
                    </div>
                  </div>
                  <button
                    onClick={() => setDocument(doc)}
                    className="text-xs text-primary font-semibold flex gap-1 items-center py-2"
                  >
                    <Icon name="eye" className="size-4" />
                    Xem
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
        <aside className="space-y-5">
          <section className={cn(panel, "p-6")}>
            <h3 className="font-bold text-lg">Xét duyệt hồ sơ</h3>
            <p className="text-xs text-slate-500 leading-6 mt-2">
              Kiểm tra tính hợp lệ của thông tin và giấy phép trước khi đưa ra quyết định.
            </p>
            {selected.status === "PENDING" ? (
              <>
                <div className="rounded-xl bg-blue-50 text-blue-900 text-xs p-3.5 mt-4 leading-5 flex gap-2">
                  <Icon name="info" className="size-4 shrink-0 mt-0.5" />
                  Phê duyệt sẽ cấp quyền công bố chuyến cho nhà xe. Cả hai quyết định đều cần xác
                  nhận.
                </div>
                <Button
                  fullWidth
                  icon="check"
                  className="mt-5"
                  onClick={() => requestDecision("APPROVED")}
                >
                  Phê duyệt nhà xe
                </Button>
                <div className="border-t border-line mt-5 pt-5">
                  <label className="text-sm font-semibold block">
                    Lý do từ chối <span className="text-danger">*</span>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      maxLength={500}
                      rows={4}
                      placeholder="Nêu rõ thông tin hoặc tài liệu cần nhà xe bổ sung..."
                      className={cn(
                        "w-full rounded-xl border px-3 py-3 mt-2 text-sm font-normal resize-none outline-none focus:ring-4 focus:ring-primary/15",
                        reasonTried && reasonError
                          ? "border-danger"
                          : "border-line focus:border-primary",
                      )}
                      aria-invalid={reasonTried && !!reasonError}
                    />
                  </label>
                  <div className="text-[10px] text-slate-400 text-right mt-1">
                    {reason.length}/500
                  </div>
                  {reasonTried && reasonError && (
                    <p role="alert" className="text-xs text-danger leading-5 mt-1">
                      {reasonError}
                    </p>
                  )}
                  <Button
                    fullWidth
                    variant="destructive"
                    className="mt-3"
                    icon="x"
                    onClick={() => requestDecision("REJECTED")}
                  >
                    Từ chối hồ sơ
                  </Button>
                </div>
              </>
            ) : (
              <div className="mt-5">
                <div className="mb-4">{badge(selected.status)}</div>
                {selected.status === "REJECTED" ? (
                  <div className="p-4 rounded-xl border border-red-100 bg-red-50 text-sm text-red-800 leading-6">
                    <b className="block text-xs mb-1">Lý do từ chối</b>
                    {selected.reason}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-green-100 bg-green-50 text-sm text-green-800 leading-6">
                    Nhà xe đã đủ điều kiện đăng chuyến. Mọi chuyến vẫn phải đáp ứng quy tắc phân
                    công và sức chứa.
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-4 leading-5">
                  Hồ sơ đã có quyết định. Không thể duyệt hoặc từ chối lại trong luồng này.
                </p>
              </div>
            )}
          </section>
          <section className={cn(panel, "p-6")}>
            <h3 className="font-bold mb-5">Lịch sử xét duyệt</h3>
            <ol>
              {selected.history.map((event, i) => (
                <li key={`${event.title}-${i}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "size-8 rounded-full grid place-items-center shrink-0",
                        event.status === "REJECTED"
                          ? "bg-red-50 text-danger"
                          : event.status === "APPROVED"
                            ? "bg-green-50 text-success"
                            : "bg-blue-50 text-primary",
                      )}
                    >
                      <Icon
                        name={
                          event.status === "PENDING"
                            ? "building"
                            : event.status === "REJECTED"
                              ? "x"
                              : "check"
                        }
                        className="size-4"
                      />
                    </span>
                    {i < selected.history.length - 1 && (
                      <span className="w-px bg-line min-h-8 flex-1 my-1" />
                    )}
                  </div>
                  <div className="pb-5">
                    <div className="text-xs font-semibold leading-5">{event.title}</div>
                    <div className="text-[10px] text-slate-500 mt-1">{event.actor}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{event.time}</div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </>
  );

  const title = adminScreens.find((s) => s.id === screen)!.title;
  const shell = (
    <div className="h-full flex bg-canvas">
      <aside className="w-64 bg-navy text-slate-300 p-5 flex flex-col shrink-0">
        <div className="px-1 pt-3">
          <Brand light />
        </div>
        <div className="mt-8 p-3 rounded-xl border border-white/10 bg-white/5 flex gap-3 items-center">
          <span className="size-9 rounded-lg bg-teal/15 text-teal grid place-items-center">
            <Icon name="shield" className="size-5" />
          </span>
          <div>
            <div className="text-sm font-semibold text-white">Quản trị nền tảng</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Quyền quản lý hệ thống</div>
          </div>
        </div>
        <div className="px-3 mt-8 mb-3 text-[10px] tracking-widest text-slate-500 font-medium">
          KHÔNG GIAN QUẢN TRỊ
        </div>
        <nav className="space-y-1">
          {navigation.map(([id, label, icon]) => {
            const enabled = true;
            const active =
              screen === id ||
              (screen === "approval" && id === "companies") ||
              (screen === "userDetail" && id === "users");
            return (
              <button
                key={id}
                disabled={!enabled}
                onClick={() => enabled && go(id)}
                title={enabled ? label : "Chưa thiết kế trong giai đoạn này"}
                className={cn(
                  "h-12 w-full flex items-center gap-3 text-sm font-medium rounded-xl px-3 text-left transition outline-none focus-visible:ring-2 focus-visible:ring-teal",
                  active ? "bg-primary text-white" : "enabled:hover:bg-white/10",
                  !enabled && "opacity-35 cursor-not-allowed",
                )}
              >
                <Icon name={icon} className="size-[18px]" />
                <span className="flex-1">{label}</span>
                {id === "companies" && pending.length > 0 && (
                  <span
                    className={cn(
                      "text-[10px] font-bold min-w-5 h-5 px-1.5 rounded-full grid place-items-center",
                      active ? "bg-white/20" : "bg-amber-400 text-navy",
                    )}
                  >
                    {pending.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto p-4 border border-white/10 rounded-2xl bg-white/5">
          <Icon name="shield" className="size-6 text-teal" />
          <h3 className="text-sm font-semibold text-white mt-3">Duyệt đúng, vận hành tốt</h3>
          <p className="text-xs text-slate-400 leading-5 mt-2">
            Xác minh đối tác để xây dựng nền tảng vận tải đáng tin cậy.
          </p>
        </div>
        <button
          onClick={() => {
            setSignedIn(false);
            setPassword("");
            setTriedLogin(false);
            go("login");
          }}
          className="text-sm flex gap-3 items-center h-11 px-3 mt-3 hover:text-white"
        >
          <Icon name="logout" className="size-4" />
          Đăng xuất
        </button>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-[76px] shrink-0 bg-white border-b border-line px-8 flex justify-between items-center">
          <Breadcrumbs
            items={
              screen === "approval"
                ? ["Quản trị", "Quản lý nhà xe", selected.id]
                : screen === "userDetail"
                  ? [
                      "Quản trị",
                      "Quản lý người dùng",
                      users.find((u) => u.id === selectedUserId)?.name ?? "Chi tiết",
                    ]
                  : [
                      "Quản trị",
                      navigation.find(([id]) => id === screen)?.[1] ??
                        (screen === "dashboard" ? "Tổng quan" : "Quản lý nhà xe"),
                    ]
            }
          />
          <div className="flex items-center gap-5">
            <button
              onClick={openPending}
              className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-100 rounded-full px-3 py-1.5 flex items-center gap-2"
            >
              <Icon name="clock" className="size-3.5" />
              {pending.length} hồ sơ chờ duyệt
            </button>
            <span className="h-7 w-px bg-line" />
            <span className="size-10 bg-blue-50 text-primary rounded-full grid place-items-center font-bold text-sm">
              HA
            </span>
            <div>
              <div className="text-sm font-semibold">Lê Hoàng Anh</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Quản trị viên hệ thống</div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-8 py-7">
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="text-[10px] tracking-widest text-slate-400 font-medium flex gap-2 items-center">
                <span className="w-5 h-px bg-primary" />
                {screen === "dashboard"
                  ? "ĐIỀU HÀNH TOÀN NỀN TẢNG"
                  : opsScreens.includes(screen)
                    ? "GIÁM SÁT VẬN HÀNH"
                    : "QUẢN LÝ ĐỐI TÁC VẬN TẢI"}
              </div>
              <h1 className="text-[28px] font-bold tracking-tight mt-2">
                {screen === "dashboard" ? "Tổng quan hệ thống" : title}
              </h1>
              <p className="text-sm text-slate-500 mt-1.5">
                {screen === "dashboard"
                  ? "Bức tranh vận hành và những hồ sơ cần bạn xử lý."
                  : screen === "companies"
                    ? "Theo dõi, xác minh và quản lý trạng thái các nhà xe."
                    : screen === "users"
                      ? "Tra cứu tài khoản và quản lý quyền truy cập của người dùng."
                      : screen === "userDetail"
                        ? "Thông tin tài khoản, hoạt động liên quan và trạng thái truy cập."
                        : screen === "monitoring"
                          ? "Theo dõi các chuyến đi trên toàn nền tảng theo thời gian gần thực."
                          : screen === "bookings"
                            ? "Theo dõi đặt chỗ, điểm đón và điểm trả của hành khách."
                            : screen === "reports"
                              ? "Số liệu vận hành cơ bản theo khoảng thời gian."
                              : "Kiểm tra hồ sơ doanh nghiệp trước khi cấp quyền hoạt động."}
              </p>
            </div>
            {screen === "dashboard" ? (
              <label className="flex items-center gap-2 rounded-xl border border-line px-4 bg-white text-sm">
                <Icon name="calendar" className="size-4 text-slate-400" />
                <select
                  aria-label="Kỳ thống kê"
                  className="bg-transparent h-11 outline-none"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as "week" | "today")}
                >
                  <option value="week">7 ngày · 12–18/07/2025</option>
                  <option value="today">Hôm nay · 18/07/2025</option>
                </select>
              </label>
            ) : (
              screen === "companies" && (
                <Button variant="secondary" icon="clock" onClick={openPending}>
                  Xem hồ sơ đang chờ
                </Button>
              )
            )}
          </div>
          {message && (
            <div className="mb-5">
              <Message>
                {message}
                <button
                  className="ml-auto"
                  onClick={() => setMessage("")}
                  aria-label="Đóng thông báo"
                >
                  <Icon name="x" className="size-4" />
                </button>
              </Message>
            </div>
          )}
          {error && (
            <div className="mb-5">
              <Message error>{error}</Message>
            </div>
          )}
          {opsScreens.includes(screen) ? (
            <AdminOperations
              screen={screen}
              go={go}
              users={users}
              setUsers={setUsers}
              selectedUserId={selectedUserId}
              setSelectedUserId={setSelectedUserId}
            />
          ) : screen === "dashboard" ? (
            dashboard
          ) : screen === "companies" ? (
            list
          ) : (
            details
          )}
        </main>
        <footer className="h-10 shrink-0 px-8 flex justify-between items-center border-t border-line text-[10px] text-slate-400">
          <span>© 2025 RideShareHub · Cổng quản trị</span>
          <span>Môi trường nguyên mẫu · Dữ liệu minh họa</span>
        </footer>
      </div>
    </div>
  );
  const scale = fullSize ? 1 : fit;
  return (
    <div className="space-y-5">
      <div className="flex gap-4 justify-between items-center flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {adminScreens.map((s) => (
            <button
              key={s.id}
              onClick={() => go(s.id)}
              className={cn(
                "border rounded-xl px-4 py-2.5 text-xs text-left transition",
                s.id === screen
                  ? "bg-primary border-primary text-white"
                  : "bg-white border-line text-slate-500 hover:border-primary",
              )}
            >
              <span className="block font-mono font-semibold">{s.code}</span>
              <span className="block mt-1">{s.title}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setFullSize(!fullSize)}
          className="text-xs font-semibold border border-line bg-white rounded-lg px-3 py-2"
        >
          {fullSize ? "Vừa vùng xem" : "Kích thước gốc 100%"}
        </button>
      </div>
      <div
        ref={viewport}
        className="w-full min-w-0 overflow-x-auto border border-line rounded-2xl bg-slate-200/50"
      >
        <div style={{ width: 1440 * scale, height: 1024 * scale, position: "relative" }}>
          <div
            data-admin-screen={screen}
            className="relative overflow-hidden text-navy"
            style={{
              width: 1440,
              height: 1024,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            {screen === "login" ? login : shell}
            <ConfirmDialog
              contained
              open={!!decision}
              title={
                decision?.status === "APPROVED"
                  ? "Xác nhận phê duyệt nhà xe?"
                  : "Xác nhận từ chối hồ sơ?"
              }
              destructive={decision?.status === "REJECTED"}
              message={
                decision
                  ? `${companies.find((c) => c.id === decision.id)?.name} · Mã đăng ký ${companies.find((c) => c.id === decision.id)?.registration}. ${decision.status === "APPROVED" ? "Nhà xe sẽ được cấp quyền công bố chuyến." : `Lý do từ chối: ${decision.reason}`}`
                  : ""
              }
              confirmLabel={
                decision?.status === "APPROVED" ? "Xác nhận phê duyệt" : "Xác nhận từ chối"
              }
              onCancel={() => setDecision(null)}
              onConfirm={confirmDecision}
            />
            <Modal
              contained
              open={!!document}
              width="max-w-2xl"
              title={document?.file ?? "Tài liệu đăng ký"}
              onClose={() => setDocument(null)}
            >
              {document &&
                (submittedUrl ? (
                  submittedDocument?.type === "application/pdf" ? (
                    <iframe
                      title="Tài liệu nhà xe đã nộp"
                      src={submittedUrl}
                      className="w-full h-96 border border-line rounded-xl"
                    />
                  ) : (
                    <img
                      src={submittedUrl}
                      alt="Tài liệu nhà xe đã nộp"
                      className="max-h-96 w-full object-contain"
                    />
                  )
                ) : (
                  <div className="max-h-[720px] overflow-y-auto bg-canvas border border-line rounded-xl px-10 py-8">
                    <p className="text-[10px] text-amber-700 text-center bg-amber-50 border border-amber-100 rounded-lg p-2">
                      TÀI LIỆU MINH HỌA · KHÔNG CÓ GIÁ TRỊ PHÁP LÝ
                    </p>
                    <div className="text-center mt-8">
                      <p className="text-xs font-semibold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                      <p className="text-[11px] mt-1">Độc lập – Tự do – Hạnh phúc</p>
                      <span className="block w-20 h-px bg-slate-300 mx-auto mt-3" />
                      <Icon name="shield" className="size-10 text-primary mx-auto mt-6" />
                      <h3 className="text-lg font-bold uppercase mt-4 leading-7">
                        {document.title}
                      </h3>
                    </div>
                    <dl className="space-y-4 mt-8 text-sm leading-6">
                      {[
                        ["Doanh nghiệp", selected.legalName],
                        ["Mã số đăng ký", selected.registration],
                        ["Người đại diện", selected.representative],
                        ["Trụ sở", selected.address],
                        ["Ngày cấp", date(document.issued)],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <dt className="text-xs text-slate-500">{k}</dt>
                          <dd className="font-semibold">{v}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="text-xs text-slate-400 border-t border-line pt-5 mt-8 leading-5">
                      Đây là bản xem trước mẫu của nguyên mẫu RideShareHub, không phải tài liệu pháp
                      lý được tải từ nhà xe.
                    </p>
                  </div>
                ))}
            </Modal>
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-400">
        Khung desktop 1440 × 1024 px · Thu phóng {Math.round(scale * 100)}% · Quyết định phê duyệt
        chỉ cập nhật dữ liệu trong phiên nguyên mẫu quản trị.
      </p>
    </div>
  );
}
