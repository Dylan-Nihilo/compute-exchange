import assert from "node:assert/strict";
import {it} from "node:test";

import {canAccessRoute} from "./domain/routes.ts";
import {explorerURL, fetchAttestation, isAttestationVerified, requeueFailedAttestations, verifyAttestation, type Verification} from "./attestations.ts";

it("requires original-data and confirmed-chain proof; never promotes incomplete responses", () => {
  const result: Verification = {verified: true, db_hash_match: true, data_hash: `0x${"a".repeat(64)}`, chain_status: "confirmed", tx_id: "transaction", chain_timestamp: "2026-09-14T00:00:00Z", verify_url: "https://scan.example/tx"};
  assert.equal(isAttestationVerified(result), true);
  for (const change of [{verified: false}, {db_hash_match: undefined}, {db_hash_match: false}, {chain_status: "pending"}, {chain_status: "failed"}, {data_hash: ""}, {tx_id: " "}]) assert.equal(isAttestationVerified({...result, ...change}), false);
  assert.equal(explorerURL(result.verify_url), result.verify_url);
  for (const url of ["javascript:alert(1)", "http://scan.example", "//scan.example", "https://user:password@scan.example"]) assert.equal(explorerURL(url), undefined);
});

it("keeps no-record and zero-requeue results distinct from HTTP, business, and schema errors", async () => {
  for (const data of [undefined, null]) assert.equal(await fetchAttestation("order", "MISSING", async (url, init) => {
    assert.equal(url, "/api/v1/blockchain/attestations/order/MISSING");
    assert.equal(init?.cache, "no-store");
    return Response.json({code: 0, data});
  }), null);
  assert.equal(await requeueFailedAttestations(async (url, init) => {
    assert.equal(url, "/api/admin/blockchain/requeue-failed"); assert.equal(init?.method, "POST");
    return Response.json({code: 0, data: {requeued: 0}});
  }), 0);
  const calls = [
    (fetcher: typeof fetch) => fetchAttestation("order", "ORD1", fetcher),
    (fetcher: typeof fetch) => verifyAttestation("order", "ORD1", fetcher),
    (fetcher: typeof fetch) => requeueFailedAttestations(fetcher),
  ];
  for (const call of calls) {
    await assert.rejects(call(async () => Response.json({code: 50000, message: "数据库不可用"})), /数据库不可用/);
    await assert.rejects(call(async () => Response.json({message: "服务不可用"}, {status: 503})), /服务不可用/);
    await assert.rejects(call(async () => Response.json({code: 0, data: {verified: true}})));
  }
  const result = await verifyAttestation("order", "ORD &?1", async (url) => {
    assert.equal(url, "/api/v1/blockchain/verify?type=order&id=ORD+%26%3F1");
    return Response.json({code: 0, data: {verified: false, data_hash: "", tx_id: "", chain_status: "", chain_timestamp: "", verify_url: "", note: "无存证记录"}});
  });
  assert.equal(isAttestationVerified(result), false);
});

it("matches the backend operator/admin role boundary without unprovided grants", () => {
  for (const role of ["guest", "buyer", "supplier", "vendor", "funder", "operator", "admin"] as const) {
    const context = {role, verificationStatus: "unverified" as const, grants: []};
    assert.equal(canAccessRoute("/attestations/verify", context), true);
    assert.equal(canAccessRoute("/admin/attestations", context), role === "operator" || role === "admin");
  }
});
