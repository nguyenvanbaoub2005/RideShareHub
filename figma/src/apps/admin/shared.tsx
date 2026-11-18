import type { ReactNode } from "react";
import Icon from "../../components/ui/Icon";
import { cn } from "../../components/ui/cn";

export const panel = "bg-surface border border-line rounded-[20px]";
export const number = (n: number) => new Intl.NumberFormat("vi-VN").format(n);
export const date = (d: string) => d.split("-").reverse().join("/");

export function Metric({
  label,
  value,
  icon,
  note,
  tone = "blue",
}: {
  label: string;
  value: number;
  icon: string;
  note: string;
  tone?: "blue" | "teal" | "amber" | "red";
}) {
  const color = {
    blue: "bg-blue-50 text-primary",
    teal: "bg-teal-50 text-teal-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-danger",
  }[tone];
  return (
    <div className={cn(panel, "p-5")}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span className={cn("size-9 rounded-xl grid place-items-center", color)}>
          <Icon name={icon} className="size-[18px]" />
        </span>
      </div>
      <div className="text-[30px] font-bold tracking-tight mt-1">{number(value)}</div>
      <div className="text-[10px] text-slate-400 mt-1.5">{note}</div>
    </div>
  );
}
export function Message({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return (
    <div
      role={error ? "alert" : "status"}
      className={cn(
        "px-4 py-3.5 rounded-xl flex items-start gap-2 text-sm border",
        error
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-green-200 bg-green-50 text-green-800",
      )}
    >
      <Icon name={error ? "alert" : "check"} className="size-4 shrink-0 mt-0.5" />
      {children}
    </div>
  );
}
