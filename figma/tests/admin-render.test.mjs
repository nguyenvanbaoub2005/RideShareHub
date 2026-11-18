import { registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import React from "react";
import { renderToString } from "react-dom/server";

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
const { default: AdminApp } = await import("../src/apps/admin/AdminApp.tsx");
for (const [screen, expected] of [
  ["login", "Email quản trị"],
  ["dashboard", "Thống kê đặt chỗ"],
  ["companies", "Danh sách nhà xe"],
  ["approval", "Lý do từ chối"],
  ["users", "Danh sách người dùng"],
  ["userDetail", "Thông tin cá nhân"],
  ["monitoring", "Giám sát chuyến đi"],
  ["bookings", "Giám sát đặt chỗ"],
  ["reports", "Thống kê theo nhà xe"],
]) {
  test(`admin screen renders in a 1440 × 1024 desktop frame: ${screen}`, () => {
    const html = renderToString(React.createElement(AdminApp, { initialScreen: screen }));
    assert.ok(html.includes(`data-admin-screen="${screen}"`));
    assert.ok(html.includes("width:1440px;height:1024px"));
    assert.ok(html.includes(expected));
    if (screen !== "login") {
      for (const label of [
        "Tổng quan",
        "Quản lý nhà xe",
        "Quản lý người dùng",
        "Giám sát chuyến đi",
        "Quản lý đặt chỗ",
        "Báo cáo",
      ])
        assert.ok(html.includes(label));
      assert.ok(html.includes('aria-label="Breadcrumb"'));
    } else {
      assert.ok(html.includes("<form"));
      assert.ok(!html.includes("<table"));
    }
  });
}
test("prototype starts at login even if an inspection screen is passed", () => {
  const html = renderToString(
    React.createElement(AdminApp, { prototype: true, initialScreen: "approval" }),
  );
  assert.ok(html.includes('data-admin-screen="login"'));
  assert.ok(!html.includes("Thông tin đăng ký doanh nghiệp"));
});
test("approval details initially present no confirmation dialog and expose only pending decision actions", () => {
  const html = renderToString(React.createElement(AdminApp, { initialScreen: "approval" }));
  assert.ok(html.includes("Nhà xe Thành Công"));
  assert.ok(html.includes("Phê duyệt nhà xe"));
  assert.ok(html.includes("Từ chối hồ sơ"));
  assert.ok(html.includes("Giấy phép kinh doanh vận tải"));
  assert.ok(!html.includes('role="dialog"'));
});
