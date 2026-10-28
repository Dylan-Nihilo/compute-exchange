import assert from "node:assert/strict";
import test from "node:test";

import {isBackendRequestError} from "./api/envelope.ts";
import {
  catalogEntryFromForm,
  changeCatalogStatus,
  fetchAdminCatalog,
  localDateTimeToIso,
  saveCatalogEntry,
  verificationFromForm,
} from "./admin-model-catalog.ts";

const ok = (data: unknown) => Response.json({code: 0, message: "success", data});
const SHA = "a".repeat(64);

function entryForm(overrides: Record<string, string | null> = {}) {
  const values: Record<string, string | null> = {
    model_key: "qwen3-32b-awq", display_name: "Qwen3 32B AWQ", repo: "Qwen/Qwen3-32B-AWQ", revision: "0123abcd",
    manifest: JSON.stringify([{path: "model.safetensors", size: 100, sha256: SHA}]),
    weights_bytes: "100", quant: "awq-int4", min_compute_capability: "8.0", valid_tp: "1, 2,4",
    kv_bytes_per_token: "131072", kv_replicated_across_tp: null, runtime_overhead_bytes: "0",
    max_model_len: "32768", min_context_tokens: "8192", engine_image: `vllm/vllm-openai@sha256:${SHA}`,
    min_driver_version: "550.54", engine_args: "{}", metrics_map: '{"ttft":"vllm:time_to_first_token_seconds"}',
    startup_timeout_s: "1200", license: "Apache-2.0", commercial_use: "allowed", ...overrides,
  };
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) if (value !== null) form.set(key, value);
  return form;
}

test("catalogEntryFromForm builds a typed entry with parsed JSON columns", () => {
  const parsed = catalogEntryFromForm(entryForm({kv_replicated_across_tp: "on"}));
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(parsed.data.valid_tp, "1,2,4");
  assert.equal(parsed.data.kv_replicated_across_tp, true);
  assert.deepEqual(parsed.data.manifest, [{path: "model.safetensors", size: 100, sha256: SHA}]);
  assert.deepEqual(parsed.data.metrics_map, {ttft: "vllm:time_to_first_token_seconds"});
});

test("catalogEntryFromForm rejects branch revisions, tag-only images, bad JSON and Lmin > Lmax", () => {
  assert.equal(catalogEntryFromForm(entryForm({revision: "master"})).success, false);
  assert.equal(catalogEntryFromForm(entryForm({engine_image: "vllm/vllm-openai:v0.9.0"})).success, false);
  const badJson = catalogEntryFromForm(entryForm({manifest: "[{"}));
  assert.equal(badJson.success, false);
  if (!badJson.success) assert.match(badJson.error.issues[0]?.message ?? "", /文件清单不是合法 JSON/);
  assert.equal(catalogEntryFromForm(entryForm({min_context_tokens: "65536"})).success, false);
  assert.equal(catalogEntryFromForm(entryForm({weights_bytes: ""})).success, false);
});

test("fetchAdminCatalog coerces BIGINT strings and TINYINT flags", async () => {
  const page = await fetchAdminCatalog(async (url) => {
    assert.equal(url, "/api/admin/model-catalog");
    return ok([{
      id: 1, model_key: "m", display_name: "M", repo: "r", revision: "abc1234", weights_bytes: "64000000000", quant: "fp8",
      min_compute_capability: "8.9", valid_tp: "1,2", kv_bytes_per_token: "1024", kv_replicated_across_tp: 1,
      runtime_overhead_bytes: "0", max_model_len: 32768, min_context_tokens: 8192, engine_image: "x@sha256:y",
      min_driver_version: "550", startup_timeout_s: 1200, license: "MIT", commercial_use: "allowed", status: "draft",
    }]);
  });
  assert.equal(page.list[0]?.weights_bytes, 64_000_000_000);
  assert.equal(page.list[0]?.kv_replicated_across_tp, true);
});

test("save uses POST for new and PUT for drafts; activate 40001 surfaces as-is", async () => {
  const parsed = catalogEntryFromForm(entryForm());
  assert.ok(parsed.success);
  await saveCatalogEntry(null, parsed.data, async (url, init) => {
    assert.equal(url, "/api/admin/model-catalog");
    assert.equal(init?.method, "POST");
    return ok({id: 9});
  });
  await saveCatalogEntry(9, parsed.data, async (url, init) => {
    assert.equal(url, "/api/admin/model-catalog/9");
    assert.equal(init?.method, "PUT");
    return ok(null);
  });
  await assert.rejects(
    changeCatalogStatus(9, "activate", async () => Response.json({code: 40001, message: "缺少真机验证通过记录", data: null}, {status: 400})),
    (error) => isBackendRequestError(error) && error.code === 40001 && error.message === "缺少真机验证通过记录",
  );
});

test("verificationFromForm converts tested_at to ISO and optional fields to null", () => {
  const form = new FormData();
  for (const [key, value] of Object.entries({gpu_model: "H100", cards: "8", tp: "8", max_model_len: "131072", result: "pass", tested_at: "2026-10-28T10:00"})) form.set(key, value);
  const parsed = verificationFromForm(form);
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(parsed.data.measured_overhead_bytes, null);
  assert.equal(parsed.data.notes, null);
  assert.equal(parsed.data.tested_at, new Date("2026-10-28T10:00").toISOString());
  assert.equal(localDateTimeToIso(""), "");
  form.delete("result");
  assert.equal(verificationFromForm(form).success, false);
});
