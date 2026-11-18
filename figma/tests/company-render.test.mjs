import { registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import React from "react";
import { renderToString } from "react-dom/server";

// Test-only TSX loader: keeps production tooling and dependencies unchanged.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith(".") && context.parentURL) {
      const base = new URL(specifier, context.parentURL);
      for (const ext of [".tsx", ".ts"]) {
        if (existsSync(fileURLToPath(base) + ext))
          return { url: base.href + ext, shortCircuit: true };
      }
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (/\.tsx?$/.test(url))
      return {
        format: "module",
        shortCircuit: true,
        source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
          compilerOptions: {
            jsx: ts.JsxEmit.ReactJSX,
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2020,
          },
        }).outputText,
      };
    return next(url, context);
  },
});

const { default: Management } = await import("../src/apps/company/Management.tsx");
const { default: CompanyApp } = await import("../src/apps/company/CompanyApp.tsx");
const { OperationsProvider } = await import("../src/apps/company/OperationsStore.tsx");
const { default: TripOperations } = await import("../src/apps/company/TripOperations.tsx");
const renderWithOperations = (component) =>
  renderToString(React.createElement(OperationsProvider, null, component));

for (const [screen, text] of [
  ["vehicles", "Danh sách"],
  ["vehicleForm", "Biển số đăng ký"],
  ["drivers", "Tài xế"],
  ["driverForm", "Ngày hết hạn giấy phép"],
  ["routes", "Điểm dừng trung gian"],
  ["routeForm", "Tên tuyến đường"],
]) {
  test(`CO management screen renders: ${screen}`, () => {
    const html = renderWithOperations(
      React.createElement(Management, { screen, go() {}, allowed: true }),
    );
    assert.ok(html.includes(text));
    assert.ok(html.includes(screen.endsWith("Form") ? "<form" : "<table"));
  });
}
test("management does not expose records to unapproved company", () => {
  const html = renderWithOperations(
    React.createElement(Management, { screen: "vehicles", go() {}, allowed: false }),
  );
  assert.ok(html.includes("cần được phê duyệt"));
  assert.ok(!html.includes("43A-123.45"));
});
for (const [screen, text] of [
  ["trips", "Danh sách chuyến đi"],
  ["tripForm", "Thông tin chuyến mới"],
  ["tripDetail", "Phương tiện"],
  ["bookings", "Danh sách đặt chỗ"],
  ["stops", "Kế hoạch đón và trả khách"],
  ["optimization", "Thứ tự tối ưu"],
  ["tracking", "Theo dõi mô phỏng"],
]) {
  test(`CO trip operations renders: ${screen}`, () => {
    const html = renderWithOperations(
      React.createElement(TripOperations, { screen, go() {}, status: "APPROVED" }),
    );
    assert.ok(html.includes(text));
    assert.ok(
      html.includes(
        screen === "tripForm"
          ? "<form"
          : screen === "trips" || screen === "bookings" || screen === "stops"
            ? "<table"
            : "<svg",
      ),
    );
  });
}
test("existing company dashboard still renders at the desktop frame size", () => {
  const html = renderToString(React.createElement(CompanyApp));
  assert.ok(html.includes("width:1440px;height:1024px"));
  assert.ok(html.includes('data-company-screen="dashboard"'));
  for (const code of ["CO-06", "CO-07", "CO-08", "CO-09", "CO-10", "CO-11"])
    assert.ok(html.includes(code));
});
