import assert from "node:assert/strict";
import {it} from "node:test";

import {fetchGpuCatalog} from "./gpu-catalog.ts";
import {createProduct} from "./supplier-workspace.ts";

it("loads the platform catalog without changing model names, nullable specs, or server order", async () => {
  const list = [
    {id: 16, vendor: "华为昇腾", model_name: "昇腾910B", origin: "domestic", grade: "datacenter", vram_gb: 64, vram_type: "HBM2e", fp16_tflops: 320, interconnect: "HCCS", secure_certified: true, status: "enabled", sort_weight: 100},
    {id: 23, vendor: "平头哥", model_name: "镇武M530", origin: "domestic", grade: "datacenter", vram_gb: null, vram_type: null, fp16_tflops: null, interconnect: null, secure_certified: true, status: "enabled", sort_weight: 89},
    {id: 2, vendor: "NVIDIA", model_name: "H100-80G", origin: "international", grade: "datacenter", vram_gb: 80, vram_type: "HBM3", fp16_tflops: 989, interconnect: "NVLink", secure_certified: false, status: "enabled", sort_weight: 89},
  ];
  const result = await fetchGpuCatalog(async (url, init) => {
    assert.equal(url, "/api/v1/gpu-catalog");
    assert.equal(init?.cache, "no-store");
    return Response.json({code: 0, message: "success", data: {list, total: 3}});
  });
  assert.deepEqual(result, list);
  await createProduct({product_type: "card_rental", gpu_model: result[0].model_name, card_count: 1, pricing_mode: "hourly", price_negotiable: false, unit_price: 100, stock: 1, region: "北京", compliance_agreed: true}, async (url, init) => {
    assert.equal(url, "/api/supplier/products");
    assert.equal(JSON.parse(String(init?.body)).gpu_model, "昇腾910B");
    return Response.json({code: 0, message: "success", data: {id: 1}});
  });
});

it("treats an empty catalog as empty and rejects business, HTTP, and contract failures", async () => {
  assert.deepEqual(await fetchGpuCatalog(async () => Response.json({code: 0, message: "success", data: {list: null, total: 0}})), []);
  await assert.rejects(fetchGpuCatalog(async () => Response.json({code: 50000, message: "查询型号库失败"})), /查询型号库失败/);
  await assert.rejects(fetchGpuCatalog(async () => Response.json({message: "服务暂不可用"}, {status: 503})), /服务暂不可用/);
  await assert.rejects(fetchGpuCatalog(async () => Response.json({code: 0, message: "success", data: {list: [{id: "legacy-id", name: "NVIDIA H100"}], total: 1}})));
});
