import { useCallback, useState } from "react";
import { screens as authScreens, useAutoSplash } from "../apps/passenger/Screens";
import { bookingScreens } from "../apps/passenger/Booking";
import { accountScreens } from "../apps/passenger/Account";
import { PassengerProvider, type ScreenId } from "../apps/passenger/store";
import { useStore } from "../apps/passenger/store";
import { canTrack } from "../apps/passenger/data";
import Button from "../components/ui/Button";

const screens = [...authScreens, ...bookingScreens, ...accountScreens];
const flows = [
  ["PA-04", "PA-05", '"Tìm chuyến"'],
  ["PA-05", "PA-06", 'nút "Lọc"'],
  ["PA-06", "PA-05", '"Áp dụng" / đóng'],
  ["PA-05", "PA-07", "chọn một chuyến"],
  ["PA-07", "PA-08", '"Đặt chỗ"'],
  ["PA-08", "PA-09", '"Xem lại đặt chỗ"'],
  ["PA-09", "PA-10", '"Xác nhận đặt chỗ"'],
  ["PA-10", "PA-11", '"Xem chuyến của tôi"'],
  ["PA-11", "PA-12", "chọn đặt chỗ"],
  ["PA-12", "PA-13", '"Theo dõi chuyến"'],
  ["PA-13", "PA-15", '"Đánh giá chuyến đi"'],
  ["Tab dưới", "PA-14 / PA-16", "Thông báo / Cá nhân"],
];
const rules = [
  "Không thể đặt chuyến đã hủy hoặc đã hoàn thành (thẻ bị vô hiệu hóa).",
  "Không thể đặt quá số chỗ trống; số khách lớn hơn chỗ còn lại sẽ bị chặn.",
  "Bắt buộc: điểm đón, điểm trả, họ tên, số điện thoại hợp lệ.",
  "Không tích hợp thanh toán trực tuyến; thanh toán cho tài xế khi lên xe.",
];

export function PassengerPlay({ guided = false }: { guided?: boolean } = {}) {
  const { selected, clock, advanceToDeparture } = useStore();
  const [cur, setCur] = useState<ScreenId>("splash");
  const go = useCallback((id: ScreenId) => setCur(id), []);
  useAutoSplash(cur, go);
  const s = screens.find((x) => x.id === cur)!;
  const Active = s.Comp;
  return (
    <div className="flex flex-wrap gap-10 items-start">
      <div data-passenger-screen={cur}>
        <div className="mb-3">
          <span className="font-mono text-sm text-primary font-semibold">{s.code}</span>{" "}
          <span className="font-semibold">{s.title}</span>
        </div>
        <Active key={cur} go={go} />
      </div>
      <div className="bg-surface border border-line rounded-2xl p-6 max-w-sm space-y-4">
        <div>
          <h3 className="font-semibold">Chạy thử</h3>
          <p className="mt-1 text-sm text-slate-600">
            Đăng nhập → Tìm chuyến → chọn chuyến → Đặt chỗ → Xác nhận. Thử chọn chuyến "Đã hủy", bỏ
            trống thông tin, hoặc hủy đặt chỗ ở PA-12 để xem các quy tắc.
          </p>
        </div>
        {!guided && (
          <div className="flex flex-wrap gap-1.5">
            {screens.map((x) => (
              <button
                key={x.id}
                onClick={() => setCur(x.id)}
                className={`text-xs font-mono px-2 py-1 rounded-md border ${x.id === cur ? "bg-primary text-white border-primary" : "border-line text-slate-600 hover:bg-slate-50"}`}
              >
                {x.code}
              </button>
            ))}
          </div>
        )}
        <button onClick={() => setCur("splash")} className="text-sm font-semibold text-primary">
          Chạy lại từ đầu
        </button>
        {selected?.status === "upcoming" && !canTrack(selected, clock) && (
          <Button variant="secondary" onClick={advanceToDeparture}>
            Mô phỏng đến gần giờ khởi hành
          </Button>
        )}
      </div>
    </div>
  );
}

export default function Passenger() {
  const [mode, setMode] = useState<"all" | "play">("all");
  const [run, setRun] = useState(0);
  const noop = { go: () => {} };

  return (
    <div className="space-y-8">
      <header className="rounded-3xl bg-navy text-white p-10">
        <span className="text-xs font-semibold tracking-widest uppercase text-teal">
          Phần 04 · Ứng dụng di động Hành khách
        </span>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight">Ứng dụng Hành khách</h1>
        <p className="mt-3 text-slate-300 max-w-2xl">
          Android & iOS · khung 390 × 844 px · điều hướng bằng thanh dưới. Đã có PA-01 đến PA-16.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {flows.map(([a, b, how]) => (
            <span
              key={a + b + how}
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
        {rules.map((r) => (
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
              setRun((r) => r + 1);
            }}
            className={`px-5 h-10 rounded-full text-sm font-semibold transition ${mode === k ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-50"}`}
          >
            {l}
          </button>
        ))}
      </div>

      <PassengerProvider key={`${mode}-${run}`} demo={mode === "all"}>
        {mode === "all" ? (
          <div className="space-y-10">
            {[screens.slice(0, 4), screens.slice(4, 10), screens.slice(10)].map((row, i) => (
              <div key={i}>
                <h2 className="text-lg font-bold mb-4">
                  {
                    [
                      "Xác thực và trang chủ",
                      "Tìm chuyến và đặt chỗ",
                      "Chuyến đi, thông báo và tài khoản",
                    ][i]
                  }
                </h2>
                <div className="flex gap-10 overflow-x-auto pb-6 pt-2 px-1">
                  {row.map(({ code, title, Comp }) => (
                    <div key={code}>
                      <div className="mb-3">
                        <span className="font-mono text-sm text-primary font-semibold">{code}</span>{" "}
                        <span className="font-semibold">{title}</span>
                      </div>
                      <Comp {...noop} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <PassengerPlay />
        )}
      </PassengerProvider>
    </div>
  );
}
