import { useState } from "react";
import CompanyApp from "../apps/company/CompanyApp";

export default function Company() {
  const [prototype, setPrototype] = useState(false);
  return (
    <div className="space-y-8">
      <header className="rounded-3xl bg-navy text-white p-10">
        <span className="text-xs font-semibold tracking-widest uppercase text-teal">
          Phần 06 · Ứng dụng web Nhà xe
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight mt-3">Không gian vận hành nhà xe</h1>
        <p className="text-slate-300 mt-3 max-w-2xl leading-7">
          Từ hồ sơ đối tác đến quản lý nguồn lực, đặt chỗ và điều hành chuyến đi. Mười tám màn hình
          desktop, một hệ thống vận hành nhất quán.
        </p>
        <div className="flex flex-wrap gap-2 mt-6">
          {[
            "CO-01 → CO-02 → CO-03",
            "Quản trị viên phê duyệt → CO-04 ↔ CO-05",
            "CO-06 ↔ CO-07 · CO-08 ↔ CO-09 · CO-10 ↔ CO-11",
            "CO-12 → CO-13 → CO-14 ↔ CO-15 ↔ CO-16 ↔ CO-17 ↔ CO-18",
            "Chỉ nhà xe được duyệt mới được đăng chuyến",
          ].map((t) => (
            <span
              key={t}
              className="text-xs px-3 py-2 border border-white/10 rounded-full bg-white/5"
            >
              {t}
            </span>
          ))}
        </div>
      </header>
      <div className="flex flex-wrap justify-between gap-4 items-center">
        <div className="inline-flex p-1 bg-surface border border-line rounded-full">
          {(
            [
              [false, "Xem các màn hình"],
              [true, "Chạy nguyên mẫu"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={String(v)}
              onClick={() => setPrototype(v)}
              className={`h-10 px-5 rounded-full text-sm font-semibold ${prototype === v ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">Web desktop · 1440 × 1024 px · CO-01 — CO-18</p>
      </div>
      <CompanyApp key={String(prototype)} prototype={prototype} />
    </div>
  );
}
