import assert from "node:assert/strict";
import test from "node:test";

import {isBackendRequestError} from "./api/envelope.ts";
import {
  catalogEntryFromForm,
  changeCatalogStatus,
  fetchAdminCatalog,
  fetchAdminCatalogEntry,
  localDateTimeToIso,
  saveCatalogEntry,
  verificationFromForm,
} from "./admin-model-catalog.ts";

const ok = (data: unknown) => Response.json({code: 0, message: "success", data});
const SHA = "a".repeat(64);
const METRICS = {
  requests_running: "vllm:num_requests_running",
  requests_waiting: "vllm:num_requests_waiting",
  kv_cache_usage: "vllm:gpu_cache_usage_perc",
  ttft_seconds: "vllm:time_to_first_token_seconds",
  generation_tokens_total: "vllm:generation_tokens_total",
  prompt_tokens_total: "vllm:prompt_tokens_total",
  preemptions_total: "vllm:num_preemptions_total",
};

function entryForm(overrides: Record<string, string | null> = {}) {
  const values: Record<string, string | null> = {
    model_key: "qwen3-32b-awq", display_name: "Qwen3 32B AWQ", repo: "Qwen/Qwen3-32B-AWQ", revision: "0123abcd".repeat(5),
    manifest: JSON.stringify([{path: "model.safetensors", size: 100, sha256: SHA}]),
    weights_bytes: "100", quant: "int4_awq", min_compute_capability: "8.0", valid_tp: "1, 2,4",
    kv_bytes_per_token: "131072", kv_replicated_across_tp: null, runtime_overhead_bytes: "2147483648",
    max_model_len: "32768", min_context_tokens: "8192", engine_image: `vllm/vllm-openai@sha256:${SHA}`,
    min_driver_version: "550.54", engine_args: '{"enable-prefix-caching":true}', metrics_map: JSON.stringify(METRICS),
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
  const unordered = catalogEntryFromForm(entryForm({valid_tp: "8,1,2"}));
  assert.equal(unordered.success ? unordered.data.valid_tp : null, "1,2,8");
  assert.equal(parsed.data.kv_replicated_across_tp, true);
  assert.deepEqual(parsed.data.manifest, [{path: "model.safetensors", size: 100, sha256: SHA}]);
  assert.deepEqual(parsed.data.metrics_map, METRICS);
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

test("catalogEntryFromForm mirrors modeldeploy validate.go rules", () => {
  const rejects = (overrides: Record<string, string | null>) => assert.equal(catalogEntryFromForm(entryForm(overrides)).success, false, JSON.stringify(overrides));
  rejects({revision: "0123abcd"}); // short sha
  rejects({revision: "0123ABCD".repeat(5)}); // uppercase
  rejects({model_key: "q"}); // 1 char
  rejects({repo: "Qwen3-32B"}); // no org
  rejects({quant: "awq-int4"}); // not in whitelist
  rejects({valid_tp: "1,1"});
  rejects({valid_tp: "0,2"});
  rejects({runtime_overhead_bytes: "0"});
  rejects({min_context_tokens: "8000"}); // not a multiple of 1024
  rejects({startup_timeout_s: "30"});
  rejects({min_driver_version: "r550"});
  rejects({weights_bytes: "101"}); // above manifest total
  rejects({manifest: JSON.stringify([{path: "../x", size: 1, sha256: SHA}])});
  rejects({manifest: JSON.stringify([{path: "x", size: 1, sha256: SHA.toUpperCase()}])});
  rejects({engine_args: '{"tensor-parallel-size":2}'}); // platform-controlled flag
  rejects({engine_args: '{"dtype":"--served-model-name=x"}'});
  rejects({metrics_map: JSON.stringify({...METRICS, ttft_seconds: undefined})});
  rejects({metrics_map: JSON.stringify({...METRICS, extra: "x"})});
});

const entry = {
  id: 1, model_key: "m1", display_name: "M", source: "modelscope", repo: "o/r", revision: "a".repeat(40),
  manifest: [{path: "w", size: 64_000_000_000, sha256: SHA}], weights_bytes: 64_000_000_000, quant: "fp8",
  min_compute_capability: "8.9", valid_tp: "1,2", kv_bytes_per_token: 1024, kv_replicated_across_tp: false,
  runtime_overhead_bytes: 1, max_model_len: 32768, min_context_tokens: 8192, engine: "vllm", engine_image: `x@sha256:${SHA}`,
  min_driver_version: "550", engine_args: {}, metrics_map: METRICS, startup_timeout_s: 1200, license: "MIT",
  commercial_use: "allowed", status: "draft", created_by: 1, created_at: "2026-10-28T00:00:00Z", updated_at: "2026-10-28T00:00:00Z",
};

test("fetchAdminCatalog parses {list,total} of exact ModelEntry; detail carries verifications", async () => {
  const page = await fetchAdminCatalog(async (url) => {
    assert.equal(url, "/api/admin/model-catalog");
    return ok({list: [entry], total: 1});
  });
  assert.equal(page.list[0]?.weights_bytes, 64_000_000_000);
  assert.equal(page.total, 1);
  // Go never emits BIGINT strings or TINYINT flags; a shape change must fail loudly.
  await assert.rejects(fetchAdminCatalog(async () => ok({list: [{...entry, kv_replicated_across_tp: 1}], total: 1})));
  const detail = await fetchAdminCatalogEntry(1, async (url) => {
    assert.equal(url, "/api/admin/model-catalog/1");
    return ok({...entry, verifications: [{
      id: 2, model_id: 1, gpu_model: "H100", cards: 8, tp: 8, max_model_len: 32768, measured_overhead_bytes: null,
      result: "pass", notes: null, tested_by: 1, tested_at: "2026-10-28T00:00:00Z",
    }]});
  });
  assert.equal(detail.verifications[0]?.gpu_model, "H100");
});

test("save uses POST for new and PUT for drafts; activate 40001 surfaces as-is", async () => {
  const parsed = catalogEntryFromForm(entryForm());
  assert.ok(parsed.success);
  await saveCatalogEntry(null, parsed.data, async (url, init) => {
    assert.equal(url, "/api/admin/model-catalog");
    assert.equal(init?.method, "POST");
    return ok({...entry, id: 9});
  });
  await saveCatalogEntry(9, parsed.data, async (url, init) => {
    assert.equal(url, "/api/admin/model-catalog/9");
    assert.equal(init?.method, "PUT");
    return ok({...entry, id: 9});
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
  form.set("tp", "16");
  assert.equal(verificationFromForm(form).success, false); // tp > cards
  form.set("tp", "8");
  form.delete("result");
  assert.equal(verificationFromForm(form).success, false);
});
