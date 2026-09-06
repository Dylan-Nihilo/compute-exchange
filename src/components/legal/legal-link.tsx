"use client";

import {legalDocuments, legalHref, type LegalDocumentKey} from "@/lib/legal";

export function LegalLink({document}: {document: LegalDocumentKey}) {
  return (
    <a
      className="underline decoration-current/40 underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4"
      href={legalHref(document)}
      onClick={(event) => event.stopPropagation()}
      rel="noopener noreferrer"
      target="_blank"
      title="在新标签页阅读"
    >
      《{legalDocuments[document]}》
    </a>
  );
}
