import {browseGpuCatalog, searchGpuCatalog} from "@/lib/gpu-catalog";

const catalogUrl =
  "https://raw.githubusercontent.com/RightNow-AI/RightNow-GPU-Database/main/data/all-gpus.json";

let catalogPromise: Promise<unknown> | undefined;

function loadCatalog() {
  catalogPromise ??= fetch(catalogUrl, {
    signal: AbortSignal.timeout(30_000),
  })
    .then((response) => {
      if (!response.ok) throw new Error(`GPU catalog returned ${response.status}`);
      return response.json();
    })
    .catch((error) => {
      catalogPromise = undefined;
      throw error;
    });

  return catalogPromise;
}

export async function GET(request: Request) {
  const {searchParams} = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const vendor = searchParams.get("vendor")?.toLocaleLowerCase() ?? "nvidia";

  try {
    const catalog = await loadCatalog();
    const list = query.length >= 2
      ? searchGpuCatalog(catalog, query, 24, vendor)
      : browseGpuCatalog(catalog, vendor, 24);
    return Response.json({
      code: 0,
      message: "success",
      data: {list, source: "rightnow-gpu-database"},
    });
  } catch {
    return Response.json(
      {code: 50301, message: "公共型号库暂不可用，可继续手动填写", data: {list: []}},
      {status: 503},
    );
  }
}
