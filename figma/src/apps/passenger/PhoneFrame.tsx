import type { ReactNode } from "react";

export function StatusBar({ dark }: { dark?: boolean }) {
  return (
    <div
      className={`h-11 px-7 flex items-center justify-between text-[13px] font-semibold shrink-0 ${dark ? "text-white" : "text-navy"}`}
    >
      <span>9:41</span>
      <span className="flex items-center gap-1.5">
        <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor">
          <rect y="7" width="3" height="4" rx=".7" />
          <rect x="4.7" y="5" width="3" height="6" rx=".7" />
          <rect x="9.4" y="2.5" width="3" height="8.5" rx=".7" />
          <rect x="14" width="3" height="11" rx=".7" />
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
          <rect x=".5" y=".5" width="21" height="11" rx="3.5" stroke="currentColor" opacity=".4" />
          <rect x="2" y="2" width="16" height="8" rx="2" fill="currentColor" />
          <rect x="23" y="4" width="1.5" height="4" rx=".7" fill="currentColor" opacity=".4" />
        </svg>
      </span>
    </div>
  );
}

/** Fixed 390 × 844 native-style mobile frame. */
export default function PhoneFrame({
  children,
  dark,
  statusLight,
  className = "",
}: {
  children: ReactNode;
  dark?: boolean;
  statusLight?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative w-[390px] h-[844px] shrink-0 rounded-[44px] overflow-clip flex flex-col border-[6px] border-navy shadow-[var(--shadow-modal)] ${className}`}
    >
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[110px] h-7 rounded-full bg-navy z-30" />
      <StatusBar dark={dark || statusLight} />
      {children}
      <div
        className={`absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 rounded-full z-30 ${dark ? "bg-white/60" : "bg-navy"}`}
      />
    </div>
  );
}
