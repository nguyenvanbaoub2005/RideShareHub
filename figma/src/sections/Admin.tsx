import { useState } from "react";
import AdminApp from "../apps/admin/AdminApp";

export default function Admin() {
  const [prototype, setPrototype] = useState(false);
  return (
    <div className="space-y-8">
      <header className="p-10 rounded-3xl bg-navy text-white">
        <span className="text-xs uppercase tracking-widest font-semibold text-teal">
          Phần 07 · Ứng dụng web Quản trị
        </span>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight">
          Trung tâm quản trị RideShareHub
        </h1>
        <p className="mt-3 text-slate-300 leading-7 max-w-2xl">
          Giám sát tổng quan nền tảng và xác minh các đối tác vận tải. Bốn màn hình web riêng cho
          quản trị viên, dùng chung nhận diện RideShareHub.
        </p>
        <div className="flex flex-wrap gap-2 mt-6">
          {[
            "AD-01 → AD-02 → AD-03 → AD-04",
            "AD-02 → AD-05 ↔ AD-06 · AD-07 ↔ AD-08 · AD-09",
            "Duyệt / từ chối luôn cần xác nhận",
            "Từ chối phải có lý do",
            "Chỉ nhà xe được duyệt mới có quyền đăng chuyến",
          ].map((s) => (
            <span
              key={s}
              className="text-xs rounded-full border border-white/10 bg-white/5 px-3 py-2"
            >
              {s}
            </span>
          ))}
        </div>
      </header>
      <div className="flex gap-3 justify-between items-center flex-wrap">
        <div className="inline-flex p-1 rounded-full bg-white border border-line">
          {(
            [
              [false, "Xem các màn hình"],
              [true, "Chạy nguyên mẫu"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={String(value)}
              onClick={() => setPrototype(value)}
              className={`h-10 px-5 rounded-full text-sm font-semibold ${prototype === value ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">Web desktop · 1440 × 1024 px · AD-01 — AD-09</p>
      </div>
      <AdminApp key={String(prototype)} prototype={prototype} />
    </div>
  );
}
