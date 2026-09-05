import {z} from "zod";

const gpuRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  vendor: z.string().min(1),
  manufacturer: z.string().nullish(),
  gpuName: z.string().nullish(),
  architecture: z.string().nullish(),
  generation: z.string().nullish(),
  releaseDate: z.string().nullish(),
  memorySize: z.number().nonnegative().nullish(),
  memoryType: z.string().nullish(),
  memoryBandwidth: z.number().nonnegative().nullish(),
  slot: z.string().nullish(),
  busInterface: z.string().nullish(),
  fp16: z.number().nonnegative().nullish(),
  fp32: z.number().nonnegative().nullish(),
  tdp: z.number().nonnegative().nullish(),
});

export const gpuCatalogItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  vendor: z.string(),
  vendorId: z.string(),
  architecture: z.string().optional(),
  generation: z.string().optional(),
  releaseDate: z.string().optional(),
  memorySizeGb: z.number().optional(),
  memoryType: z.string().optional(),
  memoryBandwidthGbps: z.number().optional(),
  formFactor: z.string().optional(),
  busInterface: z.string().optional(),
  fp16Tflops: z.number().optional(),
  fp32Tflops: z.number().optional(),
  tdpWatts: z.number().optional(),
});

export const gpuCatalogResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.object({
    list: z.array(gpuCatalogItemSchema),
    source: z.string().optional(),
  }),
});

export type GpuCatalogItem = z.infer<typeof gpuCatalogItemSchema>;

const vendorNames: Record<string, string> = {
  amd: "AMD",
  intel: "Intel",
  nvidia: "NVIDIA",
};

function searchable(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "");
}

function catalogEntries(source: unknown, vendorId?: string) {
  if (!Array.isArray(source)) return [];

  return source.flatMap((entry) => {
    const parsed = gpuRecordSchema.safeParse(entry);
    if (!parsed.success) return [];

    const gpu = parsed.data;
    const normalizedVendor = gpu.vendor.toLocaleLowerCase();
    if (vendorId && normalizedVendor !== vendorId) return [];

    const vendor =
      vendorNames[normalizedVendor] ??
      gpu.manufacturer?.trim() ??
      gpu.vendor.toLocaleUpperCase();
    const name = gpu.name.toLocaleLowerCase().startsWith(vendor.toLocaleLowerCase())
      ? gpu.name
      : `${vendor} ${gpu.name}`;
    const item = {
      id: gpu.id,
      name,
      vendor,
      vendorId: normalizedVendor,
      ...(gpu.architecture ? {architecture: gpu.architecture} : {}),
      ...(gpu.generation ? {generation: gpu.generation} : {}),
      ...(gpu.releaseDate ? {releaseDate: gpu.releaseDate} : {}),
      ...(gpu.memorySize ? {memorySizeGb: gpu.memorySize} : {}),
      ...(gpu.memoryType ? {memoryType: gpu.memoryType} : {}),
      ...(gpu.memoryBandwidth ? {memoryBandwidthGbps: gpu.memoryBandwidth} : {}),
      ...(gpu.slot ? {formFactor: gpu.slot} : {}),
      ...(gpu.busInterface ? {busInterface: gpu.busInterface} : {}),
      ...(gpu.fp16 ? {fp16Tflops: gpu.fp16} : {}),
      ...(gpu.fp32 ? {fp32Tflops: gpu.fp32} : {}),
      ...(gpu.tdp ? {tdpWatts: gpu.tdp} : {}),
    } satisfies GpuCatalogItem;

    return [{
      item,
      model: searchable(gpu.name),
      canonical: searchable(name),
      chip: searchable(gpu.gpuName ?? ""),
      haystack: searchable(
        [name, gpu.gpuName, gpu.architecture, gpu.generation, gpu.memoryType, gpu.slot]
          .filter(Boolean)
          .join(" "),
      ),
      releasedAt: Date.parse(gpu.releaseDate ?? "") || 0,
    }];
  });
}

export function browseGpuCatalog(source: unknown, vendorId: string, limit = 24) {
  return catalogEntries(source, vendorId)
    .sort((left, right) => {
      const computePattern = /server|tesla|instinct|data center|workstation/i;
      const leftCompute = computePattern.test(`${left.item.generation} ${left.item.name}`) ? 1 : 0;
      const rightCompute = computePattern.test(`${right.item.generation} ${right.item.name}`) ? 1 : 0;
      return rightCompute - leftCompute || right.releasedAt - left.releasedAt || right.item.name.localeCompare(left.item.name);
    })
    .slice(0, Math.max(1, Math.min(40, limit)))
    .map(({item}) => item);
}

export function searchGpuCatalog(
  source: unknown,
  query: string,
  limit = 16,
  vendorId?: string,
) {
  const needle = searchable(query);
  if (needle.length < 2) return [];

  const matches = catalogEntries(source, vendorId)
    .flatMap((entry) => {
      const score =
        entry.model === needle || entry.canonical === needle
          ? 0
          : entry.model.startsWith(needle) || entry.canonical.startsWith(needle)
            ? 1
            : entry.model.includes(needle) || entry.canonical.includes(needle)
              ? 2
              : entry.chip.startsWith(needle)
                ? 3
                : entry.haystack.includes(needle)
                  ? 4
                  : -1;
      return score < 0 ? [] : [{...entry, score}];
    })
    .sort((left, right) => left.score - right.score || left.item.name.localeCompare(right.item.name));
  const maxScore = (matches[0]?.score ?? 4) <= 2 ? 2 : 4;

  return matches
    .filter(({score}) => score <= maxScore)
    .slice(0, Math.max(1, Math.min(40, limit)))
    .map(({item}) => item);
}
