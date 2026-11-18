import assert from "node:assert/strict";
import test from "node:test";
import {
  adminCompanies,
  dashboardStats,
  filterCompanies,
  loginErrors,
  publishingAllowed,
  reviewCompany,
} from "../src/apps/admin/model.ts";

const pending = adminCompanies.find((c) => c.status === "PENDING");
test("admin login requires valid email and password", () => {
  assert.ok(loginErrors("", "").email);
  assert.ok(loginErrors("invalid", "123").password);
  assert.ok(loginErrors("invalid", "12345678").email);
  assert.deepEqual(loginErrors("quantri@ridesharehub.vn", "demopass123"), {
    email: "",
    password: "",
  });
});
test("all non-approved company states are denied publishing rights", () => {
  assert.equal(publishingAllowed({ status: "APPROVED" }), true);
  for (const status of ["PENDING", "REJECTED", "DRAFT"])
    assert.equal(publishingAllowed({ status }), false);
});
test("approval and rejection require confirmation without mutating the company", () => {
  for (const decision of ["APPROVED", "REJECTED"]) {
    const result = reviewCompany(pending, decision, "Thiếu giấy phép vận tải", false, "18/07/2025");
    assert.ok(result.error);
    assert.equal(result.company, pending);
    assert.equal(pending.status, "PENDING");
  }
});
test("rejection rejects empty and whitespace-only reasons", () => {
  for (const reason of ["", " \n\t "]) {
    const result = reviewCompany(pending, "REJECTED", reason, true, "18/07/2025");
    assert.match(result.error, /lý do/);
    assert.equal(result.company, pending);
  }
});
test("rejection saves a trimmed reason and history but never grants publishing", () => {
  const before = JSON.stringify(pending);
  const result = reviewCompany(
    pending,
    "REJECTED",
    "  Giấy phép vận tải cần bổ sung  ",
    true,
    "18/07/2025 · 10:20",
  );
  assert.equal(result.error, "");
  assert.equal(result.company.reason, "Giấy phép vận tải cần bổ sung");
  assert.equal(result.company.status, "REJECTED");
  assert.equal(result.company.history.length, pending.history.length + 1);
  assert.equal(result.company.history.at(-1).status, "REJECTED");
  assert.equal(publishingAllowed(result.company), false);
  assert.equal(JSON.stringify(pending), before);
});
test("approval grants publishing rights, records actor and updates pending totals", () => {
  const result = reviewCompany(pending, "APPROVED", "", true, "18/07/2025 · 10:20");
  assert.equal(result.error, "");
  assert.equal(result.company.status, "APPROVED");
  assert.equal(result.company.reason, "");
  assert.equal(publishingAllowed(result.company), true);
  assert.match(result.company.history.at(-1).actor, /Quản trị viên/);
  const next = adminCompanies.map((c) => (c.id === pending.id ? result.company : c));
  assert.equal(
    next.filter((c) => c.status === "PENDING").length,
    adminCompanies.filter((c) => c.status === "PENDING").length - 1,
  );
});
test("resolved company cannot be approved or rejected again", () => {
  for (const status of ["APPROVED", "REJECTED"]) {
    const company = { ...pending, status };
    for (const decision of ["APPROVED", "REJECTED"]) {
      const result = reviewCompany(company, decision, "Bổ sung hồ sơ", true, "18/07/2025");
      assert.ok(result.error);
      assert.equal(result.company, company);
    }
  }
});
test("rejection reason length is bounded", () => {
  assert.ok(reviewCompany(pending, "REJECTED", "x".repeat(501), true, "18/07/2025").error);
  assert.equal(reviewCompany(pending, "REJECTED", "x".repeat(500), true, "18/07/2025").error, "");
});
test("company search ignores Vietnamese accents and combines status and city filters", () => {
  assert.ok(
    filterCompanies(adminCompanies, "thanh cong").some((c) => c.name === "Nhà xe Thành Công"),
  );
  assert.equal(filterCompanies(adminCompanies, "0402123456")[0].name, "Nhà xe Minh Tâm");
  assert.equal(filterCompanies(adminCompanies, pending.email)[0].id, pending.id);
  const filtered = filterCompanies(adminCompanies, "", "PENDING", "Huế");
  assert.ok(filtered.length > 0);
  assert.ok(filtered.every((c) => c.status === "PENDING" && c.city === "Huế"));
  assert.deepEqual(filterCompanies(adminCompanies, "khong-ton-tai-xyz"), []);
});
test("dashboard booking and trip breakdowns reconcile for each period", () => {
  for (const stats of Object.values(dashboardStats)) {
    assert.equal(
      stats.totalTrips,
      stats.active + stats.completed + stats.cancelled + stats.scheduled,
    );
    assert.equal(
      stats.bookings.total,
      stats.bookings.confirmed + stats.bookings.completed + stats.bookings.cancelled,
    );
    assert.equal(
      stats.series.reduce((sum, n) => sum + n, 0),
      stats.bookings.total,
    );
    assert.equal(stats.labels.length, stats.series.length);
  }
});
