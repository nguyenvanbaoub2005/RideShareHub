import { useEffect, useState } from "react";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Icon from "../components/ui/Icon";
import { ConfirmDialog } from "../components/ui/Overlays";
import { PassengerProvider } from "../apps/passenger/store";
import { PassengerPlay } from "./Passenger";
import Driver from "./Driver";
import CompanyApp from "../apps/company/CompanyApp";
import AdminApp from "../apps/admin/AdminApp";
import { PrototypeSession, usePrototypeSession, type PrototypeRole } from "../prototype/Session";

const journeys: {
  role: PrototypeRole;
  name: string;
  icon: string;
  start: string;
  platform: string;
  guide: string;
}[] = [
  {
    role: "passenger",
    name: "Hành khách",
    icon: "user",
    start: "PA-01",
    platform: "Ứng dụng di động",
    guide:
      "Đăng nhập → tìm chuyến → mở bộ lọc → chọn chuyến → đặt chỗ → chuyến của tôi → theo dõi → đánh giá. Dùng ngày mẫu 18/07/2025; chuyến 07:30 thuận tiện cho luồng theo dõi.",
  },
  {
    role: "driver",
    name: "Tài xế",
    icon: "car",
    start: "DR-01",
    platform: "Ứng dụng di động",
    guide:
      "Đăng nhập → chuyến được giao → chọn CH-2043 đang chờ xác nhận → nhận chuyến → bắt đầu. Xử lý lần lượt từng điểm: Đã đến → xác nhận Đã đón / Đã trả; hoàn thành khi không còn điểm dừng.",
  },
  {
    role: "company",
    name: "Nhà xe",
    icon: "building",
    start: "CO-01",
    platform: "Ứng dụng web",
    guide:
      "Đăng ký hồ sơ mới, đính kèm tài liệu PDF/JPG/PNG rồi gửi duyệt. Chuyển sang Quản trị để duyệt đúng hồ sơ; quay lại đây để tiếp tục quản lý nguồn lực, tạo chuyến, đặt chỗ, đón/trả, tối ưu và theo dõi.",
  },
  {
    role: "admin",
    name: "Quản trị",
    icon: "shield",
    start: "AD-01",
    platform: "Ứng dụng web",
    guide:
      "Đăng nhập → Quản lý nhà xe → Duyệt hồ sơ. Phê duyệt / từ chối cần xác nhận; từ chối phải có lý do. Dùng truy cập nhanh từ Tổng quan để quản lý người dùng, giám sát và xem báo cáo.",
  },
];
function PrototypeContent({ reset }: { reset: () => void }) {
  const session = usePrototypeSession()!;
  const [visited, setVisited] = useState<PrototypeRole[]>([]);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (session.role)
      setVisited((list) => (list.includes(session.role!) ? list : [...list, session.role!]));
  }, [session.role]);
  const active = journeys.find((j) => j.role === session.role);
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-navy text-white p-10 space-y-3">
        <div className="text-xs uppercase tracking-widest font-semibold text-teal">
          Phần 08 · Nguyên mẫu tương tác
        </div>
        <div role="heading" aria-level={1} className="text-4xl font-extrabold tracking-tight">
          Một nền tảng. Bốn hành trình.
        </div>
        <div className="text-slate-300 leading-relaxed">
          Mở một điểm bắt đầu để chạy các màn hình hiện có. Chuyển vai trò không làm mất tiến trình
          trong phiên này.
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {journeys.map((j) => (
          <div
            key={j.role}
            className="bg-surface border border-line rounded-2xl p-5 flex items-center gap-4"
          >
            <div className="size-12 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
              <Icon name={j.icon} className="size-6" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="font-bold">{j.name}</div>
              <div className="text-xs text-slate-500">
                {j.platform} · {j.start}
              </div>
            </div>
            <Button
              variant={session.role === j.role ? "primary" : "secondary"}
              onClick={() => session.openRole(j.role)}
            >
              {visited.includes(j.role) ? "Tiếp tục" : "Bắt đầu"}
              <span className="sr-only"> {j.name}</span>
            </Button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 items-center">
          <Badge kind="active">Phiên nguyên mẫu</Badge>
          <div className="text-xs text-slate-500">
            Không thanh toán, không GPS thật, không lưu dữ liệu lên máy chủ.
          </div>
        </div>
        <Button variant="secondary" icon="refresh" onClick={() => setConfirm(true)}>
          Đặt lại toàn bộ phiên
        </Button>
      </div>
      {active && (
        <div
          className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900 leading-relaxed"
          role="status"
        >
          <div className="font-semibold mb-1">
            {active.start} · {active.name}
          </div>
          {active.guide}
          <div className="text-xs mt-2">
            Đăng nhập mô phỏng: email / số điện thoại hợp lệ và mật khẩu từ 8 ký tự. Hồ sơ và tài
            khoản mẫu dùng để kiểm thử tương tác.
          </div>
        </div>
      )}
      <div className="space-y-5">
        {(visited.includes("passenger") || session.role === "passenger") && (
          <div hidden={session.role !== "passenger"}>
            <PassengerProvider>
              <PassengerPlay guided />
            </PassengerProvider>
          </div>
        )}
        {(visited.includes("driver") || session.role === "driver") && (
          <div hidden={session.role !== "driver"}>
            <Driver prototypeOnly />
          </div>
        )}
        {(visited.includes("company") || session.role === "company") && (
          <div hidden={session.role !== "company"}>
            <CompanyApp prototype />
          </div>
        )}
        {(visited.includes("admin") || session.role === "admin") && (
          <div hidden={session.role !== "admin"}>
            <AdminApp prototype />
          </div>
        )}
      </div>
      <ConfirmDialog
        open={confirm}
        title="Đặt lại phiên nguyên mẫu?"
        message="Tiến trình của cả bốn vai trò, hồ sơ đăng ký và quyết định phê duyệt trong phiên sẽ được đặt lại. Các màn hình và thiết kế gốc không thay đổi."
        confirmLabel="Đặt lại phiên"
        destructive
        onCancel={() => setConfirm(false)}
        onConfirm={reset}
      />
    </div>
  );
}
export default function Prototype() {
  const [run, setRun] = useState(0);
  return (
    <PrototypeSession key={run}>
      <PrototypeContent reset={() => setRun((n) => n + 1)} />
    </PrototypeSession>
  );
}
