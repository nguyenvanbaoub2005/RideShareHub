import { useState, type ReactNode } from "react";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Icon from "../../components/ui/Icon";
import { SearchInput } from "../../components/ui/Form";
import { DataTable, Pagination } from "../../components/ui/Data";
import { Modal } from "../../components/ui/Overlays";
import { cn } from "../../components/ui/cn";
import { panel, number, date, Metric, Message } from "./shared";
import { gpsLabel, formatAdministrativeAddress } from "../../address/model";
import type { AdminScreen } from "./model";
import {
  adminTrips,
  adminBookings,
  bookingStatusLabels,
  tripStatusLabels,
  roleLabels,
  DATA_DATES,
  FULL_RANGE,
  TODAY,
  filterUsers,
  filterTrips,
  filterBookings,
  activeTripsOf,
  setUserLock,
  validateRange,
  summarize,
  bookedSeatsOf,
  type AdminUser,
  type DateRange,
  type MonitorBookingStatus,
  type MonitorTripStatus,
} from "./monitoringModel";

export const opsScreens: AdminScreen[] = [
  "users",
  "userDetail",
  "monitoring",
  "bookings",
  "reports",
];
const PER = 8;
const dateTime = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)} · ${s.slice(11)}`;
const selectCls =
  "bg-white border border-line rounded-xl px-3 h-11 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15";
const tripKind = {
  scheduled: "pending",
  active: "active",
  completed: "completed",
  cancelled: "error",
} as const;
const bookingKind = { confirmed: "active", completed: "completed", cancelled: "error" } as const;
const roleKind = { passenger: "active", driver: "completed", company: "warning" } as const;
const statusBadge = (u: AdminUser) => (
  <Badge kind={u.status === "ACTIVE" ? "success" : "error"}>
    {u.status === "ACTIVE" ? "Đang hoạt động" : "Đã khóa"}
  </Badge>
);
const roleBadge = (u: AdminUser) => <Badge kind={roleKind[u.role]}>{roleLabels[u.role]}</Badge>;
const initial = (name: string) => name.trim().split(" ").pop()?.[0] ?? "?";

function Chips<T extends string>({
  items,
  active,
  onChange,
}: {
  items: [T, string, number][];
  active: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {items.map(([key, label, count]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={cn(
            "text-xs font-semibold rounded-full px-4 h-9 flex gap-2 items-center",
            active === key ? "bg-navy text-white" : "bg-canvas text-slate-500 hover:bg-slate-100",
          )}
        >
          {label}
          <span className="opacity-60">{count}</span>
        </button>
      ))}
    </div>
  );
}
const Empty = ({ title, hint, onClear }: { title: string; hint: string; onClear?: () => void }) => (
  <div className="py-14 text-center">
    <Icon name="search" className="size-9 text-slate-300 mx-auto" />
    <h3 className="font-semibold mt-3">{title}</h3>
    <p className="text-sm text-slate-500 mt-1">{hint}</p>
    {onClear && (
      <button onClick={onClear} className="text-sm text-primary font-semibold mt-3">
        Xóa bộ lọc
      </button>
    )}
  </div>
);

export default function AdminOperations({
  screen,
  go,
  users,
  setUsers,
  selectedUserId,
  setSelectedUserId,
}: {
  screen: AdminScreen;
  go: (s: AdminScreen) => void;
  users: AdminUser[];
  setUsers: (fn: (list: AdminUser[]) => AdminUser[]) => void;
  selectedUserId: string;
  setSelectedUserId: (id: string) => void;
}) {
  // Bộ lọc người dùng
  const [uQuery, setUQuery] = useState("");
  const [uRole, setURole] = useState("all");
  const [uStatus, setUStatus] = useState("all");
  const [uPage, setUPage] = useState(1);
  // Bộ lọc chuyến đi
  const [tQuery, setTQuery] = useState("");
  const [tStatus, setTStatus] = useState("all");
  const [tCompany, setTCompany] = useState("all");
  const [tDay, setTDay] = useState("all");
  const [tPage, setTPage] = useState(1);
  // Bộ lọc đặt chỗ
  const [bQuery, setBQuery] = useState("");
  const [bStatus, setBStatus] = useState("all");
  const [bTrip, setBTrip] = useState("");
  const [bPage, setBPage] = useState(1);
  // Báo cáo
  const [range, setRange] = useState<DateRange>(FULL_RANGE);
  const [draft, setDraft] = useState<DateRange>(FULL_RANGE);
  const [rangeError, setRangeError] = useState("");
  // Khóa / mở khóa
  const [lockTarget, setLockTarget] = useState<AdminUser | null>(null);
  const [lockReason, setLockReason] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const user = users.find((u) => u.id === selectedUserId) ?? users[0];
  const companies = [...new Set(adminTrips.map((t) => t.company))];
  const openUser = (id: string) => {
    setSelectedUserId(id);
    setNotice("");
    setError("");
    go("userDetail");
  };
  const showTrip = (id: string) => {
    setTQuery(id);
    setTStatus("all");
    setTCompany("all");
    setTDay("all");
    setTPage(1);
    go("monitoring");
  };
  const showBookings = (tripId: string, query = "") => {
    setBTrip(tripId);
    setBQuery(query);
    setBStatus("all");
    setBPage(1);
    go("bookings");
  };
  const askLock = (u: AdminUser) => {
    setLockTarget(u);
    setLockReason("");
    setError("");
  };
  const confirmLock = () => {
    if (!lockTarget) return;
    const lock = lockTarget.status === "ACTIVE";
    const result = setUserLock(
      lockTarget,
      lock,
      true,
      new Date().toLocaleString("vi-VN"),
      lockReason,
    );
    const name = lockTarget.name;
    setLockTarget(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setUsers((list) => list.map((x) => (x.id === result.user.id ? result.user : x)));
    setNotice(
      lock
        ? `Đã khóa tài khoản ${name}. Người dùng không thể đăng nhập cho đến khi được mở khóa.`
        : `Đã mở khóa tài khoản ${name}.`,
    );
    setError("");
  };
  const lockButton = (u: AdminUser, small = true) => (
    <Button
      variant={u.status === "ACTIVE" ? "secondary" : "primary"}
      className={small ? "h-9 px-3 text-xs" : ""}
      icon={u.status === "ACTIVE" ? "shield" : "check"}
      onClick={() => askLock(u)}
    >
      {u.status === "ACTIVE" ? "Khóa" : "Mở khóa"}
    </Button>
  );

  /* ---------- AD-05 ---------- */
  const usersView = (() => {
    const list = filterUsers(users, uQuery, uRole, uStatus);
    const pages = Math.max(1, Math.ceil(list.length / PER));
    const page = Math.min(uPage, pages);
    const count = (r: string) => users.filter((u) => r === "all" || u.role === r).length;
    const reset = () => {
      setUQuery("");
      setURole("all");
      setUStatus("all");
      setUPage(1);
    };
    return (
      <>
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Metric
            label="Tổng người dùng"
            value={users.length}
            icon="users"
            note="Tất cả vai trò trên nền tảng"
          />
          <Metric
            label="Hành khách"
            value={count("passenger")}
            icon="user"
            note="Ứng dụng di động"
          />
          <Metric
            label="Tài xế"
            value={count("driver")}
            icon="car"
            tone="teal"
            note="Ứng dụng di động"
          />
          <Metric
            label="Tài khoản bị khóa"
            value={users.filter((u) => u.status === "LOCKED").length}
            icon="shield"
            tone="red"
            note="Không thể đăng nhập"
          />
        </div>
        <section className={cn(panel, "p-6")}>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">Danh sách người dùng</h2>
            <span className="text-xs text-slate-400">{list.length} kết quả</span>
          </div>
          <div className="mt-5 pb-5 border-b border-line">
            <Chips
              items={[
                ["all", "Tất cả", count("all")],
                ["passenger", "Hành khách", count("passenger")],
                ["driver", "Tài xế", count("driver")],
                ["company", "Quản lý nhà xe", count("company")],
              ]}
              active={uRole}
              onChange={(v) => {
                setURole(v);
                setUPage(1);
              }}
            />
          </div>
          <div className="flex gap-3 my-5">
            <div className="w-[400px]">
              <SearchInput
                aria-label="Tìm người dùng"
                placeholder="Tìm tên, email, số điện thoại, mã..."
                value={uQuery}
                onChange={(e) => {
                  setUQuery(e.target.value);
                  setUPage(1);
                }}
              />
            </div>
            <select
              aria-label="Lọc trạng thái tài khoản"
              className={selectCls}
              value={uStatus}
              onChange={(e) => {
                setUStatus(e.target.value);
                setUPage(1);
              }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="LOCKED">Đã khóa</option>
            </select>
            {(uQuery || uRole !== "all" || uStatus !== "all") && (
              <button className="text-xs font-semibold text-primary" onClick={reset}>
                Xóa bộ lọc
              </button>
            )}
          </div>
          <DataTable
            rows={list.slice((page - 1) * PER, page * PER)}
            columns={[
              {
                key: "name",
                header: "Người dùng",
                render: (u) => (
                  <button
                    onClick={() => openUser(u.id)}
                    className="flex items-center gap-3 text-left"
                  >
                    <span className="size-9 rounded-full bg-blue-50 text-primary font-bold grid place-items-center shrink-0">
                      {initial(u.name)}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{u.name}</span>
                      <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                        {u.id}
                      </span>
                    </span>
                  </button>
                ),
              },
              {
                key: "email",
                header: "Email",
                render: (u) => <span className="text-xs">{u.email}</span>,
              },
              {
                key: "phone",
                header: "Điện thoại",
                render: (u) => <span className="text-xs whitespace-nowrap">{u.phone}</span>,
              },
              { key: "role", header: "Vai trò", render: roleBadge },
              { key: "status", header: "Trạng thái", render: statusBadge },
              {
                key: "registered",
                header: "Ngày đăng ký",
                render: (u) => <span className="text-xs">{date(u.registered)}</span>,
              },
              {
                key: "action",
                header: "Thao tác",
                render: (u) => (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openUser(u.id)}
                      className="text-xs font-semibold text-primary px-2 py-2"
                    >
                      Chi tiết
                    </button>
                    {lockButton(u)}
                  </div>
                ),
              },
            ]}
          />
          {list.length ? (
            <div className="mt-5">
              <Pagination
                page={page}
                pages={pages}
                perPage={PER}
                total={list.length}
                onChange={setUPage}
              />
            </div>
          ) : (
            <Empty
              title="Không tìm thấy người dùng"
              hint="Thử từ khóa khác hoặc xóa bộ lọc."
              onClear={reset}
            />
          )}
        </section>
      </>
    );
  })();

  /* ---------- AD-06 ---------- */
  const infoGrid = (rows: [string, ReactNode][]) => (
    <dl className="grid grid-cols-2 gap-x-6 pt-2">
      {rows.map(([k, v]) => (
        <div key={k} className="py-3">
          <dt className="text-xs text-slate-500">{k}</dt>
          <dd className="text-sm font-medium mt-2 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
  const detailView = (() => {
    const userBookings = adminBookings.filter((b) => b.passenger === user.name);
    const userTrips = adminTrips
      .filter((t) =>
        user.role === "driver"
          ? t.driver === user.name
          : user.role === "company"
            ? t.company === user.company
            : false,
      )
      .sort((a, b) => b.departure.localeCompare(a.departure));
    return (
      <>
        <button
          onClick={() => go("users")}
          className="text-sm text-slate-500 hover:text-primary mb-5 inline-flex items-center gap-1"
        >
          <Icon name="left" className="size-4" />
          Quay lại danh sách người dùng
        </button>
        <section className={cn(panel, "p-6 flex items-center gap-5 mb-6")}>
          <span className="size-16 rounded-full bg-blue-50 text-primary text-2xl font-bold grid place-items-center">
            {initial(user.name)}
          </span>
          <div className="flex-1">
            <div className="flex gap-3 items-center">
              <h2 className="text-2xl font-bold">{user.name}</h2>
              {roleBadge(user)}
              {statusBadge(user)}
            </div>
            <p className="text-sm text-slate-500 mt-2">
              {user.id} · {user.city} · Đăng ký ngày {date(user.registered)}
            </p>
          </div>
          {lockButton(user, false)}
        </section>
        <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-6">
          <div className="space-y-6">
            <section className={cn(panel, "p-6")}>
              <h3 className="font-bold text-lg border-b border-line pb-4">Thông tin cá nhân</h3>
              {infoGrid([
                ["Họ và tên", user.name],
                ["Số điện thoại", user.phone],
                ["Email", user.email],
                [
                  "Địa chỉ hành chính",
                  formatAdministrativeAddress(user.administrativeAddress) || user.city,
                ],
              ])}
            </section>
            <section className={cn(panel, "p-6")}>
              <h3 className="font-bold text-lg border-b border-line pb-4">Thông tin tài khoản</h3>
              {infoGrid([
                ["Mã tài khoản", user.id],
                ["Vai trò", roleBadge(user)],
                ["Trạng thái", statusBadge(user)],
                ["Ngày đăng ký", date(user.registered)],
                ["Đăng nhập gần nhất", user.lastLogin],
                ...(user.company ? [["Nhà xe", user.company] as [string, ReactNode]] : []),
              ])}
            </section>
            <section className={cn(panel, "p-6")}>
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-bold text-lg">
                  {user.role === "passenger" ? "Đặt chỗ liên quan" : "Chuyến đi liên quan"}
                </h3>
                <span className="text-xs text-slate-400">
                  {user.role === "passenger" ? userBookings.length : userTrips.length} bản ghi
                </span>
              </div>
              {user.role === "passenger" ? (
                userBookings.length ? (
                  <>
                    <DataTable
                      rows={userBookings.slice(0, 5)}
                      columns={[
                        {
                          key: "id",
                          header: "Mã đặt chỗ",
                          render: (b) => (
                            <span className="font-mono text-xs font-semibold text-primary">
                              {b.id}
                            </span>
                          ),
                        },
                        {
                          key: "tripId",
                          header: "Chuyến",
                          render: (b) => {
                            const t = adminTrips.find((x) => x.id === b.tripId)!;
                            return (
                              <span className="text-xs font-medium">
                                {t.routeName}
                                <span className="block text-slate-400 mt-0.5">
                                  {b.tripId} · {dateTime(t.departure)}
                                </span>
                              </span>
                            );
                          },
                        },
                        { key: "seats", header: "Chỗ" },
                        {
                          key: "status",
                          header: "Trạng thái",
                          render: (b) => (
                            <Badge kind={bookingKind[b.status]}>
                              {bookingStatusLabels[b.status]}
                            </Badge>
                          ),
                        },
                      ]}
                    />
                    <button
                      className="text-primary text-sm font-semibold mt-4"
                      onClick={() => showBookings("", user.name)}
                    >
                      Xem tất cả trong giám sát đặt chỗ →
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-slate-500 py-6 text-center">
                    Người dùng này chưa có đặt chỗ.
                  </p>
                )
              ) : userTrips.length ? (
                <>
                  <DataTable
                    rows={userTrips.slice(0, 5)}
                    columns={[
                      {
                        key: "id",
                        header: "Mã chuyến",
                        render: (t) => (
                          <span className="font-mono text-xs font-semibold text-primary">
                            {t.id}
                          </span>
                        ),
                      },
                      { key: "routeName", header: "Tuyến" },
                      {
                        key: "departure",
                        header: "Khởi hành",
                        render: (t) => <span className="text-xs">{dateTime(t.departure)}</span>,
                      },
                      {
                        key: "status",
                        header: "Trạng thái",
                        render: (t) => (
                          <Badge kind={tripKind[t.status]}>{tripStatusLabels[t.status]}</Badge>
                        ),
                      },
                    ]}
                  />
                  <button
                    className="text-primary text-sm font-semibold mt-4"
                    onClick={() => showTrip(userTrips[0].id)}
                  >
                    Xem trong giám sát chuyến đi →
                  </button>
                </>
              ) : (
                <p className="text-sm text-slate-500 py-6 text-center">
                  Chưa có chuyến đi liên quan.
                </p>
              )}
            </section>
          </div>
          <aside className="space-y-5">
            <section className={cn(panel, "p-6")}>
              <h3 className="font-bold text-lg">Trạng thái tài khoản</h3>
              <div className="mt-4">{statusBadge(user)}</div>
              {user.status === "LOCKED" ? (
                <div className="mt-4 p-4 rounded-xl border border-red-100 bg-red-50 text-sm text-red-800 leading-6">
                  <b className="block text-xs mb-1">Thông tin khóa</b>
                  {user.lockReason || "Không có lý do được ghi nhận."}
                  <div className="text-[10px] text-red-700/70 mt-2">
                    {user.lockedAt} · {user.lockedBy}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 leading-5 mt-4">
                  Tài khoản có thể đăng nhập và sử dụng ứng dụng bình thường.
                </p>
              )}
              <div className="mt-5">{lockButton(user, false)}</div>
              <p className="text-[10px] text-slate-400 leading-4 mt-4">
                Mọi thay đổi khóa hoặc mở khóa đều cần xác nhận.
                {user.role === "company"
                  ? " Khóa tài khoản không thay đổi trạng thái phê duyệt của nhà xe."
                  : ""}
              </p>
            </section>
          </aside>
        </div>
      </>
    );
  })();

  /* ---------- AD-07 ---------- */
  const tripsView = (() => {
    const list = filterTrips(adminTrips, tQuery, tStatus, tCompany, tDay);
    const pages = Math.max(1, Math.ceil(list.length / PER));
    const page = Math.min(tPage, pages);
    const n = (s: MonitorTripStatus) => adminTrips.filter((t) => t.status === s).length;
    const reset = () => {
      setTQuery("");
      setTStatus("all");
      setTCompany("all");
      setTDay("all");
      setTPage(1);
    };
    return (
      <>
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Metric
            label="Tổng chuyến đi"
            value={adminTrips.length}
            icon="bus"
            note="12–18/07/2025"
          />
          <Metric
            label="Đang chạy"
            value={n("active")}
            icon="route"
            tone="teal"
            note="Đang thực hiện hành trình"
          />
          <Metric
            label="Sắp khởi hành"
            value={n("scheduled")}
            icon="clock"
            tone="amber"
            note="Chưa đến giờ xuất bến"
          />
          <Metric
            label="Đã hủy"
            value={n("cancelled")}
            icon="x"
            tone="red"
            note={`${n("completed")} chuyến đã hoàn thành`}
          />
        </div>
        <section className={cn(panel, "p-6")}>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold">Giám sát chuyến đi</h2>
              <p className="text-xs text-slate-500 mt-1">
                Chỉ xem. Quản trị viên không thay đổi trạng thái chuyến tại đây.
              </p>
            </div>
            <span className="text-xs text-slate-400">{list.length} kết quả</span>
          </div>
          <div className="mt-5 pb-5 border-b border-line">
            <Chips
              items={[
                ["all", "Tất cả", adminTrips.length],
                ["active", "Đang chạy", n("active")],
                ["scheduled", "Sắp khởi hành", n("scheduled")],
                ["completed", "Hoàn thành", n("completed")],
                ["cancelled", "Đã hủy", n("cancelled")],
              ]}
              active={tStatus}
              onChange={(v) => {
                setTStatus(v);
                setTPage(1);
              }}
            />
          </div>
          <div className="flex gap-3 my-5">
            <div className="w-[380px]">
              <SearchInput
                aria-label="Tìm chuyến đi"
                placeholder="Tìm mã chuyến, tài xế, biển số, tuyến..."
                value={tQuery}
                onChange={(e) => {
                  setTQuery(e.target.value);
                  setTPage(1);
                }}
              />
            </div>
            <select
              aria-label="Lọc nhà xe"
              className={selectCls}
              value={tCompany}
              onChange={(e) => {
                setTCompany(e.target.value);
                setTPage(1);
              }}
            >
              <option value="all">Tất cả nhà xe</option>
              {companies.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              aria-label="Lọc ngày khởi hành"
              className={selectCls}
              value={tDay}
              onChange={(e) => {
                setTDay(e.target.value);
                setTPage(1);
              }}
            >
              <option value="all">Tất cả ngày</option>
              {DATA_DATES.map((d) => (
                <option key={d} value={d}>
                  {date(d)}
                </option>
              ))}
            </select>
            {(tQuery || tStatus !== "all" || tCompany !== "all" || tDay !== "all") && (
              <button className="text-xs font-semibold text-primary" onClick={reset}>
                Xóa bộ lọc
              </button>
            )}
          </div>
          <DataTable
            rows={list.slice((page - 1) * PER, page * PER)}
            columns={[
              {
                key: "id",
                header: "Mã chuyến",
                render: (t) => (
                  <span className="font-mono text-xs font-semibold text-primary">{t.id}</span>
                ),
              },
              {
                key: "company",
                header: "Nhà xe",
                render: (t) => <span className="text-xs font-medium">{t.company}</span>,
              },
              {
                key: "driver",
                header: "Tài xế",
                render: (t) => <span className="text-xs">{t.driver}</span>,
              },
              {
                key: "vehicle",
                header: "Xe",
                render: (t) => (
                  <span className="text-xs whitespace-nowrap">
                    {t.vehicle}
                    <span className="block text-slate-400 mt-0.5">
                      {bookedSeatsOf(t.id, adminBookings)}/{t.capacity} chỗ
                    </span>
                  </span>
                ),
              },
              {
                key: "routeName",
                header: "Tuyến",
                render: (t) => <span className="text-xs font-semibold">{t.routeName}</span>,
              },
              {
                key: "departure",
                header: "Khởi hành",
                render: (t) => (
                  <span className="text-xs whitespace-nowrap">{dateTime(t.departure)}</span>
                ),
              },
              {
                key: "status",
                header: "Trạng thái",
                render: (t) => (
                  <Badge kind={tripKind[t.status]}>{tripStatusLabels[t.status]}</Badge>
                ),
              },
              {
                key: "action",
                header: "",
                render: (t) => (
                  <button
                    className="text-xs font-semibold text-primary whitespace-nowrap px-2 py-2"
                    onClick={() => showBookings(t.id)}
                  >
                    Đặt chỗ →
                  </button>
                ),
              },
            ]}
          />
          {list.length ? (
            <div className="mt-5">
              <Pagination
                page={page}
                pages={pages}
                perPage={PER}
                total={list.length}
                onChange={setTPage}
              />
            </div>
          ) : (
            <Empty
              title="Không tìm thấy chuyến đi"
              hint="Thử thay đổi bộ lọc hoặc từ khóa."
              onClear={reset}
            />
          )}
        </section>
      </>
    );
  })();

  /* ---------- AD-08 ---------- */
  const bookingsView = (() => {
    const scope = adminBookings.filter((b) => !bTrip || b.tripId === bTrip);
    const list = filterBookings(adminBookings, adminTrips, bQuery, bStatus, bTrip);
    const pages = Math.max(1, Math.ceil(list.length / PER));
    const page = Math.min(bPage, pages);
    const n = (s: MonitorBookingStatus) => scope.filter((b) => b.status === s).length;
    const reset = () => {
      setBQuery("");
      setBStatus("all");
      setBTrip("");
      setBPage(1);
    };
    return (
      <>
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Metric
            label="Tổng đặt chỗ"
            value={scope.length}
            icon="ticket"
            note={bTrip ? `Chuyến ${bTrip}` : "12–18/07/2025"}
          />
          <Metric
            label="Đã xác nhận"
            value={n("confirmed")}
            icon="check"
            note="Chuyến chưa hoàn tất"
          />
          <Metric
            label="Hoàn thành"
            value={n("completed")}
            icon="check"
            tone="teal"
            note="Hành khách đã được trả"
          />
          <Metric
            label="Đã hủy"
            value={n("cancelled")}
            icon="x"
            tone="red"
            note="Không tính vào sức chứa"
          />
        </div>
        <section className={cn(panel, "p-6")}>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold">Giám sát đặt chỗ</h2>
              <p className="text-xs text-slate-500 mt-1">
                Chỉ xem. Quản trị viên không thay đổi trạng thái đặt chỗ tại đây.
              </p>
            </div>
            <span className="text-xs text-slate-400">{list.length} kết quả</span>
          </div>
          <div className="mt-5 pb-5 border-b border-line">
            <Chips
              items={[
                ["all", "Tất cả", scope.length],
                ["confirmed", "Đã xác nhận", n("confirmed")],
                ["completed", "Hoàn thành", n("completed")],
                ["cancelled", "Đã hủy", n("cancelled")],
              ]}
              active={bStatus}
              onChange={(v) => {
                setBStatus(v);
                setBPage(1);
              }}
            />
          </div>
          <div className="flex gap-3 my-5 items-center">
            <div className="w-[400px]">
              <SearchInput
                aria-label="Tìm đặt chỗ"
                placeholder="Tìm mã đặt chỗ, hành khách, mã chuyến, tuyến..."
                value={bQuery}
                onChange={(e) => {
                  setBQuery(e.target.value);
                  setBPage(1);
                }}
              />
            </div>
            {bTrip && (
              <span className="inline-flex items-center gap-2 text-xs font-semibold bg-blue-50 text-primary rounded-full px-3 h-9">
                Chuyến {bTrip}
                <button
                  aria-label="Bỏ lọc chuyến"
                  onClick={() => {
                    setBTrip("");
                    setBPage(1);
                  }}
                >
                  <Icon name="x" className="size-3.5" />
                </button>
              </span>
            )}
            {(bQuery || bStatus !== "all" || bTrip) && (
              <button className="text-xs font-semibold text-primary" onClick={reset}>
                Xóa bộ lọc
              </button>
            )}
          </div>
          <DataTable
            rows={list.slice((page - 1) * PER, page * PER)}
            columns={[
              {
                key: "id",
                header: "Mã đặt chỗ",
                render: (b) => (
                  <span className="font-mono text-xs font-semibold text-primary">{b.id}</span>
                ),
              },
              {
                key: "passenger",
                header: "Hành khách",
                render: (b) => <span className="text-sm font-medium">{b.passenger}</span>,
              },
              {
                key: "tripId",
                header: "Chuyến",
                render: (b) => {
                  const t = adminTrips.find((x) => x.id === b.tripId)!;
                  return (
                    <button
                      className="text-left text-xs font-medium"
                      onClick={() => showTrip(t.id)}
                    >
                      {t.routeName}
                      <span className="block text-slate-400 mt-0.5">
                        {t.id} · {dateTime(t.departure)}
                      </span>
                    </button>
                  );
                },
              },
              { key: "seats", header: "Số chỗ" },
              {
                key: "status",
                header: "Trạng thái",
                render: (b) => (
                  <Badge kind={bookingKind[b.status]}>{bookingStatusLabels[b.status]}</Badge>
                ),
              },
              {
                key: "pickup",
                header: "Điểm đón",
                render: (b) => (
                  <span className="text-xs">
                    {b.pickup}
                    <span className="block text-[10px] text-primary font-mono mt-1">
                      {gpsLabel(b.pickupLocation)}
                    </span>
                  </span>
                ),
              },
              {
                key: "dropoff",
                header: "Điểm trả",
                render: (b) => (
                  <span className="text-xs">
                    {b.dropoff}
                    <span className="block text-[10px] text-primary font-mono mt-1">
                      {gpsLabel(b.dropoffLocation)}
                    </span>
                  </span>
                ),
              },
            ]}
          />
          {list.length ? (
            <div className="mt-5">
              <Pagination
                page={page}
                pages={pages}
                perPage={PER}
                total={list.length}
                onChange={setBPage}
              />
            </div>
          ) : (
            <Empty
              title="Không tìm thấy đặt chỗ"
              hint="Thử thay đổi bộ lọc hoặc từ khóa."
              onClear={reset}
            />
          )}
        </section>
      </>
    );
  })();

  /* ---------- AD-09 ---------- */
  const reportsView = (() => {
    const s = summarize(adminTrips, adminBookings, range);
    const maxDay = Math.max(1, ...s.days.map((d) => d.total));
    const preset = (from: string, to: string) => {
      setDraft({ from, to });
      setRange({ from, to });
      setRangeError("");
    };
    const apply = () => {
      const e = validateRange(draft.from, draft.to);
      setRangeError(e);
      if (!e) setRange(draft);
    };
    const bk = s.bookings;
    return (
      <>
        <section className={cn(panel, "p-5 mb-6")}>
          <div className="flex items-end gap-4">
            <div className="flex gap-2">
              {(
                [
                  ["Hôm nay", TODAY, TODAY],
                  ["7 ngày qua", FULL_RANGE.from, FULL_RANGE.to],
                ] as const
              ).map(([label, f, t]) => (
                <button
                  key={label}
                  onClick={() => preset(f, t)}
                  className={cn(
                    "h-11 px-4 rounded-xl text-sm font-semibold border",
                    range.from === f && range.to === t
                      ? "bg-navy text-white border-navy"
                      : "bg-white text-slate-600 border-line hover:border-slate-300",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="text-xs font-medium text-slate-500">
              Từ ngày
              <input
                type="date"
                aria-label="Từ ngày"
                value={draft.from}
                onChange={(e) => setDraft({ ...draft, from: e.target.value })}
                className={cn(selectCls, "block mt-1.5", rangeError && "border-danger")}
              />
            </label>
            <label className="text-xs font-medium text-slate-500">
              Đến ngày
              <input
                type="date"
                aria-label="Đến ngày"
                value={draft.to}
                onChange={(e) => setDraft({ ...draft, to: e.target.value })}
                className={cn(selectCls, "block mt-1.5", rangeError && "border-danger")}
              />
            </label>
            <Button icon="calendar" onClick={apply}>
              Áp dụng
            </Button>
            <p className="ml-auto text-xs text-slate-400 text-right leading-5">
              Đang xem:{" "}
              <b className="text-slate-600">
                {date(range.from)} – {date(range.to)}
              </b>
              <br />
              Dữ liệu mẫu 12/07–18/07/2025
            </p>
          </div>
          {rangeError && (
            <p role="alert" className="text-xs text-danger mt-3 flex gap-1.5 items-center">
              <Icon name="alert" className="size-3.5" />
              {rangeError}
            </p>
          )}
        </section>
        <div className="grid grid-cols-4 gap-4">
          <Metric
            label="Tổng chuyến đi"
            value={s.totalTrips}
            icon="bus"
            note={`${s.active} đang chạy · ${s.scheduled} sắp khởi hành`}
          />
          <Metric
            label="Chuyến hoàn thành"
            value={s.completed}
            icon="check"
            tone="teal"
            note={
              s.totalTrips
                ? `${Math.round((s.completed / s.totalTrips) * 100)}% tổng chuyến trong kỳ`
                : "Chưa có dữ liệu"
            }
          />
          <Metric
            label="Chuyến đã hủy"
            value={s.cancelled}
            icon="x"
            tone="red"
            note={
              s.totalTrips
                ? `${Math.round((s.cancelled / s.totalTrips) * 100)}% tổng chuyến trong kỳ`
                : "Chưa có dữ liệu"
            }
          />
          <Metric
            label="Tổng đặt chỗ"
            value={bk.total}
            icon="ticket"
            note={`${number(bk.seats)} chỗ đang có hiệu lực hoặc đã hoàn thành`}
          />
        </div>
        {s.totalTrips === 0 ? (
          <section className={cn(panel, "p-6 mt-6")}>
            <Empty
              title="Không có dữ liệu trong khoảng thời gian đã chọn"
              hint="Chọn ngày trong khoảng 12/07–18/07/2025."
            />
          </section>
        ) : (
          <>
            <div className="grid grid-cols-[1.5fr_1fr] gap-6 mt-6">
              <section className={cn(panel, "p-6")}>
                <div className="flex justify-between">
                  <div>
                    <h2 className="font-bold">Chuyến đi theo ngày</h2>
                    <p className="text-xs text-slate-500 mt-1">Số chuyến theo ngày khởi hành</p>
                  </div>
                  <span className="text-xs text-slate-500 flex gap-3">
                    <span>
                      <i className="inline-block size-2 rounded-full bg-teal mr-1.5" />
                      Hoàn thành
                    </span>
                    <span>
                      <i className="inline-block size-2 rounded-full bg-danger mr-1.5" />
                      Đã hủy
                    </span>
                    <span>
                      <i className="inline-block size-2 rounded-full bg-blue-200 mr-1.5" />
                      Khác
                    </span>
                  </span>
                </div>
                <div
                  className="flex gap-4 h-[150px] items-end mt-6 px-2 border-b border-line"
                  role="img"
                  aria-label={`Chuyến đi theo ngày: ${s.days.map((d) => `${date(d.date)}: ${d.total}`).join(", ")}`}
                >
                  {s.days.map((d) => (
                    <div
                      key={d.date}
                      className="flex-1 h-full flex flex-col justify-end items-center"
                    >
                      <span className="text-[10px] text-slate-500 mb-1">{d.total}</span>
                      <div
                        className="w-full max-w-[44px] flex flex-col-reverse rounded-t-md overflow-hidden"
                        style={{ height: `${(d.total / maxDay) * 110}px` }}
                      >
                        <div className="bg-teal" style={{ flex: d.completed }} />
                        <div className="bg-danger" style={{ flex: d.cancelled }} />
                        <div
                          className="bg-blue-200"
                          style={{ flex: d.total - d.completed - d.cancelled }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 mt-2 px-2">
                  {s.days.map((d) => (
                    <span key={d.date} className="flex-1 text-center text-[10px] text-slate-400">
                      {d.date.slice(8)}/{d.date.slice(5, 7)}
                    </span>
                  ))}
                </div>
              </section>
              <section className={cn(panel, "p-6")}>
                <h2 className="font-bold">Thống kê đặt chỗ</h2>
                <p className="text-xs text-slate-500 mt-1">Phân bổ theo trạng thái</p>
                <div className="space-y-5 mt-6">
                  {(
                    [
                      ["Hoàn thành", bk.completed, "bg-teal"],
                      ["Đã xác nhận", bk.confirmed, "bg-primary"],
                      ["Đã hủy", bk.cancelled, "bg-danger"],
                    ] as const
                  ).map(([label, n, color]) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-slate-500">{label}</span>
                        <b>
                          {number(n)}{" "}
                          <span className="font-normal text-slate-400">
                            ({bk.total ? Math.round((n / bk.total) * 100) : 0}%)
                          </span>
                        </b>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className={cn("h-full rounded-full", color)}
                          style={{ width: `${bk.total ? (n / bk.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            <div className="grid grid-cols-[1.5fr_1fr] gap-6 mt-6">
              <section>
                <h2 className="font-bold text-lg mb-4">Thống kê theo nhà xe</h2>
                <DataTable
                  rows={s.companies}
                  columns={[
                    {
                      key: "name",
                      header: "Nhà xe",
                      render: (c) => <span className="text-sm font-semibold">{c.name}</span>,
                    },
                    { key: "trips", header: "Chuyến" },
                    { key: "completed", header: "Hoàn thành" },
                    { key: "cancelled", header: "Đã hủy" },
                    { key: "bookings", header: "Đặt chỗ" },
                    { key: "seats", header: "Chỗ" },
                  ]}
                />
              </section>
              <section>
                <h2 className="font-bold text-lg mb-4">Thống kê theo tuyến</h2>
                <DataTable
                  rows={s.routes}
                  columns={[
                    {
                      key: "name",
                      header: "Tuyến",
                      render: (r) => <span className="text-xs font-semibold">{r.name}</span>,
                    },
                    { key: "trips", header: "Chuyến" },
                    { key: "bookings", header: "Đặt chỗ" },
                  ]}
                />
              </section>
            </div>
          </>
        )}
      </>
    );
  })();

  return (
    <div>
      {notice && (
        <div className="mb-5">
          <Message>
            {notice}
            <button className="ml-auto" onClick={() => setNotice("")} aria-label="Đóng thông báo">
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
      {screen === "users"
        ? usersView
        : screen === "userDetail"
          ? detailView
          : screen === "monitoring"
            ? tripsView
            : screen === "bookings"
              ? bookingsView
              : reportsView}
      <Modal
        contained
        open={!!lockTarget}
        width="max-w-md"
        title={
          lockTarget?.status === "ACTIVE"
            ? "Xác nhận khóa tài khoản?"
            : "Xác nhận mở khóa tài khoản?"
        }
        onClose={() => setLockTarget(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setLockTarget(null)}>
              Hủy
            </Button>
            <Button
              variant={lockTarget?.status === "ACTIVE" ? "destructive" : "primary"}
              onClick={confirmLock}
            >
              {lockTarget?.status === "ACTIVE" ? "Xác nhận khóa" : "Xác nhận mở khóa"}
            </Button>
          </>
        }
      >
        {lockTarget && (
          <div className="space-y-4">
            <p className="leading-6">
              <b>{lockTarget.name}</b> · {roleLabels[lockTarget.role]} · {lockTarget.id}
              <br />
              {lockTarget.status === "ACTIVE"
                ? "Tài khoản sẽ không thể đăng nhập cho đến khi được mở khóa."
                : "Tài khoản sẽ có thể đăng nhập và sử dụng ứng dụng trở lại."}
            </p>
            {lockTarget.status === "ACTIVE" && activeTripsOf(lockTarget, adminTrips).length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-900 text-xs leading-5 flex gap-2">
                <Icon name="alert" className="size-4 shrink-0 mt-0.5" />
                Đang có chuyến đang chạy liên quan:{" "}
                {activeTripsOf(lockTarget, adminTrips)
                  .map((t) => t.id)
                  .join(", ")}
                . Hãy phối hợp với nhà xe để không ảnh hưởng hành khách.
              </div>
            )}
            {lockTarget.status === "ACTIVE" && (
              <label className="block text-xs font-semibold text-navy">
                Lý do khóa (không bắt buộc)
                <textarea
                  value={lockReason}
                  maxLength={300}
                  onChange={(e) => setLockReason(e.target.value)}
                  rows={3}
                  className="w-full mt-2 rounded-xl border border-line px-3 py-2.5 text-sm font-normal resize-none outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
                  placeholder="Ghi chú để các quản trị viên khác nắm thông tin..."
                />
              </label>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
