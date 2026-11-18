import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessDashboard,
  canPublish,
  sampleCompany,
  emptyCompany,
  validateCompany,
  validateDocument,
} from "../src/apps/company/model.ts";

test("only approved companies can access operations or publish trips", () => {
  for (const status of ["DRAFT", "PENDING"]) {
    assert.equal(canPublish(status), false);
    assert.equal(canAccessDashboard(status), false);
  }
  assert.equal(canPublish("APPROVED"), true);
  assert.equal(canAccessDashboard("APPROVED"), true);
});

test("registration requires all fields and a document", () => {
  const errors = validateCompany(emptyCompany, false);
  assert.equal(Object.keys(errors).length, 7);
  assert.ok(Object.values(errors).every(Boolean));
  assert.ok(Object.values(validateCompany(sampleCompany, true)).every((v) => !v));
  assert.ok(validateCompany(sampleCompany, false).document);
});

test("registration validates business number, email and phone", () => {
  const errors = validateCompany(
    {
      ...sampleCompany,
      businessNumber: "123",
      email: "invalid",
      phone: "0905",
    },
    true,
  );
  assert.ok(errors.businessNumber);
  assert.ok(errors.email);
  assert.ok(errors.phone);
  assert.equal(
    validateCompany(
      { ...sampleCompany, businessNumber: "0402123456001", phone: "+84905234567" },
      true,
    ).phone,
    "",
  );
  assert.equal(
    validateCompany({ ...sampleCompany, businessNumber: "0402123456001" }, true).businessNumber,
    "",
  );
});

test("document upload rejects unsupported, empty and oversized files", () => {
  assert.ok(validateDocument({ type: "application/zip", size: 2048 }));
  assert.ok(validateDocument({ type: "application/pdf", size: 0 }));
  assert.ok(validateDocument({ type: "application/pdf", size: 10 * 1024 * 1024 + 1 }));
  for (const type of ["application/pdf", "image/jpeg", "image/png"]) {
    assert.equal(validateDocument({ type, size: 10 * 1024 * 1024 }), "");
  }
});
