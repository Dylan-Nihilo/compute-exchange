import {z} from "zod";
import {LEGAL_VERSION, legalDocuments, legalHref, type LegalDocumentKey} from "./legal.ts";

const consentSchema = z.object({
  document: z.string().min(1),
  version: z.string().min(1),
  action: z.string().min(1),
  reference: z.string(),
  accepted_at: z.string().datetime({offset: true}),
});

const envelopeSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: z.array(consentSchema).optional(),
});

export type LegalConsent = z.infer<typeof consentSchema>;

export function consentDocumentHref({document, version}: Pick<LegalConsent, "document" | "version">) {
  if (version !== LEGAL_VERSION || !Object.hasOwn(legalDocuments, document)) return null;
  return legalHref(document as LegalDocumentKey);
}

export async function fetchLegalConsents(fetchImplementation: typeof fetch = fetch): Promise<LegalConsent[]> {
  let response: Response;
  try {
    response = await fetchImplementation("/api/auth/consents", {cache: "no-store"});
  } catch {
    throw new Error("授权记录暂时无法读取，请重试。");
  }
  const parsed = envelopeSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new Error("授权记录返回格式错误");
  if (!response.ok || parsed.data.code !== 0) throw new Error(parsed.data.message || "授权记录读取失败");
  if (!parsed.data.data) throw new Error("授权记录返回格式错误");
  return parsed.data.data;
}
