// Published versions are immutable. Archive their text before changing this version.
// TODO(v1.2, tokenFactory docs/24 §7 / T-101): managed rental (gateway access, SSH public keys,
// session metadata, node credentials, nightly windows, model deployment) requires legal text v2 for
// resource-listing-rules, resource-usage-rules and privacy. The wording is pending business/legal
// sign-off and must not be drafted here; bump LEGAL_VERSION together with the backend only after the
// approved v2 text is archived per docs/api/legal-consent-api.md.
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
