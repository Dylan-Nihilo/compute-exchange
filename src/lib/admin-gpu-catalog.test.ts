import assert from "node:assert/strict";
import {test} from "node:test";
import {fetchAdminGpuCatalog, gpuModelFromForm, saveAdminGpuModel} from "./admin-gpu-catalog.ts";

function form() {
  const data = new FormData();
  for (const [key, value] of Object.entries({vendor: " Example ", model_name: " Test GPU ", origin: "domestic", grade: "datacenter", enabled: "on", sort_weight: "0"})) data.set(key, value);
  return data;
}

test("catalog form preserves unknown specs as null and validates numeric boundaries", () => {
  const data = form();
  const value = gpuModelFromForm(data);
  assert.equal(value.vendor, "Example");
  assert.equal(value.model_name, "Test GPU");
  for (const key of ["vram_gb", "vram_type", "fp16_tflops", "interconnect", "spec_source"] as const) assert.equal(value[key], null);
  data.set("vram_gb", "0"); assert.throws(() => gpuModelFromForm(data));
  data.set("vram_gb", "16.5"); assert.throws(() => gpuModelFromForm(data));
  data.set("vram_gb", "16"); data.set("fp16_tflops", "Infinity"); assert.throws(() => gpuModelFromForm(data));
  data.set("fp16_tflops", "90.1"); data.set("secure_certified", "on"); data.delete("enabled");
  assert.equal(gpuModelFromForm(data).fp16_tflops, 90.1);
  assert.equal(gpuModelFromForm(data).secure_certified, true);
  assert.equal(gpuModelFromForm(data).status, "disabled");
});

test("admin list includes disabled rows and private sources while forwarding real filters", async () => {
  const item = {...gpuModelFromForm(form()), id: 1, status: "disabled", spec_source: "Internal source", updated_at: "2026-09-14T12:00:00Z"};
  const result = await fetchAdminGpuCatalog({q: " Test ", vendor: "Example", origin: "domestic"}, async (url, init) => {
    const parsed = new URL(String(url), "http://localhost");
    assert.equal(parsed.pathname, "/api/admin/gpu-catalog");
    assert.equal(parsed.searchParams.get("q"), "Test");
    assert.equal(parsed.searchParams.get("vendor"), "Example");
    assert.equal(init?.cache, "no-store");
    return Response.json({code: 0, message: "success", data: {list: [item], total: 1}});
  });
  assert.equal(result.items[0]?.status, "disabled");
  assert.equal(result.items[0]?.spec_source, "Internal source");
  assert.deepEqual(await fetchAdminGpuCatalog({}, async () => Response.json({code: 0, message: "success", data: {list: null, total: 0}})), {items: [], total: 0});
  await assert.rejects(fetchAdminGpuCatalog({}, async () => Response.json({code: 50000, message: "查询型号库失败"})), /查询型号库失败/);
});

test("create and update use their real methods and surface duplicate and HTTP failures", async () => {
  const input = gpuModelFromForm(form());
  await saveAdminGpuModel(null, input, async (url, init) => {
    assert.equal(url, "/api/admin/gpu-catalog"); assert.equal(init?.method, "POST");
    const body = JSON.parse(String(init?.body)); assert.equal(body.status, undefined); assert.equal(body.vram_gb, null);
    return Response.json({code: 0, message: "success"});
  });
  await assert.rejects(saveAdminGpuModel(1, {...input, status: "disabled"}, async (url, init) => {
    assert.equal(url, "/api/admin/gpu-catalog/1"); assert.equal(init?.method, "PUT");
    assert.equal(JSON.parse(String(init?.body)).status, "disabled");
    return Response.json({code: 40001, message: "型号已存在"});
  }), /型号已存在/);
  await assert.rejects(saveAdminGpuModel(1, input, async () => Response.json({message: "无权限"}, {status: 403})), /无权限/);
});
