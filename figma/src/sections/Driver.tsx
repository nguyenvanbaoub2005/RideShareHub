import { useCallback, useState } from "react";
import { driverScreens as authScreens } from "../apps/driver/Screens";
import { tripScreens } from "../apps/driver/Trip";
import { DriverProvider, type DScreen } from "../apps/driver/store";

const driverScreens = [...authScreens, ...tripScreens];
const flows = [
  ["DR-01", "DR-02", '"Đăng nhập" hợp lệ'],
  ["DR-02", "DR-03", '"Xem tất cả chuyến"'],
  ["DR-03", "DR-04", '"Xem chi tiết"'],
  ["DR-04", "DR-05", '"Nhận chuyến" / "Từ chối"'],
  ["DR-05", "DR-06", "nhận chuyến"],
  ["DR-06", "DR-07", '"Bắt đầu chuyến" (xác nhận)'],
  ["DR-07", "DR-08", "xử lý điểm dừng"],
  ["DR-08", "DR-07", "sau khi đón / trả"],
  ["DR-07", "DR-10", '"Hoàn thành chuyến" (xác nhận)'],
  ["DR-07", "DR-09", '"Báo sự cố"'],
];
const rules = [
  'Đón khách trước, trả khách sau: nút "Đã trả khách" bị khóa nếu hành khách chưa được đón.',
  'Phải bấm "Đã đến" trước khi xác nhận đón hoặc trả.',
  "Không thể hoàn thành chuyến khi còn điểm dừng chưa xử lý.",
  "Các thao tác quan trọng đều có hộp thoại xác nhận: nhận/từ chối, bắt đầu, đón, trả, hoàn thành, gửi báo cáo.",
];
const principles = [
  "Nút và vùng chạm lớn, tối thiểu 56 px",
  "Tương phản cao, chữ lớn dễ đọc khi đang dừng xe",
  "Mỗi màn hình một mục tiêu, hạn chế phân tâm",
  "Màu trạng thái luôn kèm nhãn chữ",
];

export default function Driver({ prototypeOnly = false }: { prototypeOnly?: boolean } = {}) {
  const [mode, setMode] = useState<"all" | "play">("all");
  const [cur, setCur] = useState<DScreen>("login");
  const go = useCallback((id: DScreen) => setCur(id), []);
  const s = driverScreens.find((x) => x.id === cur)!;
  const Active = s.Comp;
  const noop = { go: () => {} };
  if (prototypeOnly)
    return (
      <DriverProvider>
        <div data-driver-screen={cur}>
          <Active key={cur} go={go} />
        </div>
      </DriverProvider>
    );
  return (
    <div className="space-y-8">
      <header className="rounded-3xl bg-navy text-white p-10">
        <span className="text-xs font-semibold tracking-widest uppercase text-teal">
          Phần 05 · Ứng dụng di động Tài xế
        </span>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight">Ứng dụng Tài xế</h1>
        <p className="mt-3 text-slate-300 max-w-2xl">
          Android & iOS · khung 390 × 844 px · ứng dụng riêng, tách biệt với ứng dụng Hành khách. Đã
          có DR-01 đến DR-10.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {flows.map(([a, b, how]) => (
            <span
              key={a + b}
              className="text-xs rounded-full bg-white/10 border border-white/10 px-3 py-1.5"
            >
              <b>
                {a} → {b}
              </b>{" "}
              · {how}
            </span>
          ))}
        </div>
      </header>
      <div className="grid md:grid-cols-2 gap-3">
        {[...principles, ...rules].map((r) => (
          <div
            key={r}
            className="bg-surface border border-line rounded-xl px-4 py-3 text-sm text-slate-600 flex gap-2"
          >
            <span className="text-teal font-bold">✓</span>
            {r}
          </div>
        ))}
      </div>
      <div className="inline-flex p-1 bg-surface border border-line rounded-full">
        {(
          [
            ["all", "Tất cả màn hình"],
            ["play", "Chạy nguyên mẫu"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => {
              setMode(k);
              setCur("login");
            }}
            className={`px-5 h-10 rounded-full text-sm font-semibold transition ${mode === k ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-50"}`}
          >
            {l}
          </button>
        ))}
      </div>
      <DriverProvider key={mode} demo={mode === "all"}>
        {mode === "all" ? (
          <div className="space-y-10">
            {[driverScreens.slice(0, 3), driverScreens.slice(3, 7), driverScreens.slice(7)].map(
              (row, i) => (
                <div key={i}>
                  <h2 className="text-lg font-bold mb-4">
                    {
                      [
                        "Đăng nhập, trang chủ và danh sách chuyến",
                        "Nhận chuyến và lộ trình",
                        "Điểm dừng, sự cố và hoàn thành",
                      ][i]
                    }
                  </h2>
                  <div className="flex gap-10 overflow-x-auto pb-6 pt-2 px-1">
                    {row.map(({ code, title, Comp }) => (
                      <div key={code}>
                        <div className="mb-3">
                          <span className="font-mono text-sm text-primary font-semibold">
                            {code}
                          </span>{" "}
                          <span className="font-semibold">{title}</span>
                        </div>
                        <Comp
                          {...noop}
                          tripId={code === "DR-04" || code === "DR-05" ? "t3" : undefined}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ),
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-10 items-start">
            <div>
              <div className="mb-3">
                <span className="font-mono text-sm text-primary font-semibold">{s.code}</span>{" "}
                <span className="font-semibold">{s.title}</span>
              </div>
              <Active key={cur} go={go} />
            </div>
            <div className="bg-surface border border-line rounded-2xl p-6 max-w-sm space-y-3">
              <h3 className="font-semibold">Chạy thử</h3>
              <p className="text-sm text-slate-600">
                Chuyến CH-2043 (chờ xác nhận) dùng để thử nhận hoặc từ chối; CH-2041 (đã xác nhận)
                dùng để bắt đầu chuyến. Thử trả khách trước khi đón, hoặc hoàn thành khi còn điểm
                dừng, để xem các quy tắc.
              </p>
              <button
                onClick={() => setCur("login")}
                className="text-sm font-semibold text-primary"
              >
                Chạy lại từ đầu
              </button>
            </div>
          </div>
        )}
      </DriverProvider>
    </div>
  );
}
