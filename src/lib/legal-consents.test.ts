import assert from "node:assert/strict";
import {test} from "node:test";
import {consentDocumentHref, fetchLegalConsents} from "./legal-consents.ts";
import {LEGAL_VERSION} from "./legal.ts";
import {canAccessRoute} from "./domain/routes.ts";

test("consent history reads the current-account flat array without inventing pagination", async () => {
  const record = {document: "resource-usage-rules", version: LEGAL_VERSION, action: "order", reference: "ORD001", accepted_at: "2026-09-14T12:00:00+08:00"};
  const records = await fetchLegalConsents(async (url, init) => {
    assert.equal(url, "/api/auth/consents");
    assert.equal(init?.cache, "no-store");
    return Response.json({code: 0, message: "success", data: [record, record]});
  });
  assert.deepEqual(records, [record, record]);
  assert.deepEqual(await fetchLegalConsents(async () => Response.json({code: 0, message: "success", data: []})), []);
});

test("consent errors and malformed success payloads never become empty history", async () => {
  await assert.rejects(fetchLegalConsents(async () => Response.json({code: 40100, message: "请先登录"}, {status: 401})), /请先登录/);
  await assert.rejects(fetchLegalConsents(async () => Response.json({code: 50000, message: "协议记录读取失败"})), /协议记录读取失败/);
  await assert.rejects(fetchLegalConsents(async () => Response.json({code: 0, message: "success"})), /格式错误/);
  await assert.rejects(fetchLegalConsents(async () => {throw new Error("offline");}), /重试/);
});

test("historical or unknown documents never link to a different published version", () => {
  assert.equal(consentDocumentHref({document: "privacy", version: LEGAL_VERSION}), `/privacy?version=${LEGAL_VERSION}`);
  assert.equal(consentDocumentHref({document: "privacy", version: "2025-01-01.1"}), null);
  assert.equal(consentDocumentHref({document: "__proto__", version: LEGAL_VERSION}), null);
});

test("all authenticated roles can read their history without requiring KYC", () => {
  for (const role of ["buyer", "supplier", "vendor", "funder", "operator", "admin"] as const) {
    assert.equal(canAccessRoute("/console/consents", {role, verificationStatus: "unverified"}), true, role);
  }
  assert.equal(canAccessRoute("/console/consents", {role: "guest", verificationStatus: "unverified"}), false);
});
