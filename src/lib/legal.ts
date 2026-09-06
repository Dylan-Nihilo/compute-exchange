// Published versions are immutable. Archive their text before changing this version.
export const LEGAL_VERSION = "2026-09-06.1";

export const legalDocuments = {
  terms: "用户服务协议",
  privacy: "隐私政策",
  "resource-listing-rules": "算力资源上架规范",
  "resource-usage-rules": "算力资源使用规范",
} as const;

export type LegalDocumentKey = keyof typeof legalDocuments;

export function legalHref(document: LegalDocumentKey) {
  return `/${document}?version=${LEGAL_VERSION}`;
}
