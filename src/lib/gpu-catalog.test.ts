import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {browseGpuCatalog, searchGpuCatalog} from "./gpu-catalog.ts";

describe("searchGpuCatalog", () => {
  it("normalizes, ranks, and limits RightNow GPU records", () => {
    const catalog = [
      {
        id: "nvidia-h100-sxm5-80-gb",
        name: "H100 SXM5 80 GB",
        vendor: "nvidia",
        gpuName: "GH100",
        architecture: "Hopper",
        memorySize: 80,
        memoryType: "HBM3",
      },
      {id: "nvidia-h100", name: "H100", vendor: "nvidia"},
      {id: "nvidia-h200", name: "H200", vendor: "nvidia", gpuName: "GH100"},
      {id: "nvidia-a100", name: "A100 PCIe 80 GB", vendor: "nvidia"},
      {id: "invalid", name: "", vendor: "nvidia"},
    ];

    const results = searchGpuCatalog(catalog, "h100", 2);

    assert.deepEqual(
      results.map(({id}) => id),
      ["nvidia-h100", "nvidia-h100-sxm5-80-gb"],
    );
    assert.equal(results[0]?.name, "NVIDIA H100");
    assert.equal(results[1]?.memorySizeGb, 80);
    assert.deepEqual(
      searchGpuCatalog(catalog, "GH100", 3).map(({id}) => id),
      ["nvidia-h100-sxm5-80-gb", "nvidia-h200"],
    );
    assert.deepEqual(searchGpuCatalog({catalog}, "h100"), []);
  });
});

it("keeps browsing and search scoped to the selected GPU vendor", () => {
  const catalog = [
    {id: "nvidia-h200", name: "H200", vendor: "nvidia"},
    {id: "amd-mi300x", name: "MI300X", vendor: "amd"},
    {id: "intel-max", name: "Data Center GPU Max", vendor: "intel"},
  ];

  for (const vendor of ["nvidia", "amd", "intel"]) {
    const results = browseGpuCatalog(catalog, vendor);
    assert.equal(results.length, 1);
    assert.equal(results[0]?.vendorId, vendor);
  }
  assert.deepEqual(searchGpuCatalog(catalog, "H200", 24, "amd"), []);
  assert.equal(searchGpuCatalog(catalog, "MI300X", 24, "amd")[0]?.id, "amd-mi300x");
});
