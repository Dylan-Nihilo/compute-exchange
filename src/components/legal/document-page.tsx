import Link from "next/link";
import {notFound} from "next/navigation";

import {LEGAL_VERSION, legalDocuments, legalHref, type LegalDocumentKey} from "@/lib/legal";
import {documents} from "./documents";

export async function LegalDocumentPage({document, searchParams}: {
  document: LegalDocumentKey;
  searchParams: Promise<{version?: string | string[]}>;
}) {
  const {version} = await searchParams;
  if (version !== undefined && version !== LEGAL_VERSION) notFound();
  const content = documents[document];

  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 pt-12 sm:px-8 sm:pt-16">
      <nav aria-label="协议导航" className="flex flex-wrap gap-x-6 gap-y-3 border-b border-border pb-5 text-sm text-muted">
        {(Object.keys(legalDocuments) as LegalDocumentKey[]).map((key) => (
          <Link aria-current={key === document ? "page" : undefined} className="py-1 hover:text-foreground aria-[current=page]:font-semibold aria-[current=page]:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4" href={legalHref(key)} key={key}>
            {legalDocuments[key]}
          </Link>
        ))}
      </nav>
      <header className="py-10 sm:py-14">
        <p className="mb-4 text-xs tracking-widest text-muted">OMNIS · 协议与规则</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{legalDocuments[document]}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">{content.summary}</p>
        <p className="mt-5 text-xs text-muted">版本 {LEGAL_VERSION}<span aria-hidden="true"> · </span>更新日期：<time dateTime="2026-09-06">2026 年 9 月 6 日</time></p>
      </header>
      <div className="grid items-start gap-10 border-t border-border pt-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
        <nav aria-label="本文目录" className="lg:sticky lg:top-24">
          <p className="mb-4 text-xs font-medium text-muted">本文目录</p>
          <ol className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
            {content.sections.map((section, index) => (
              <li key={section.title}>
                <a className="flex gap-3 py-2 text-sm text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2" href={`#section-${index + 1}`}>
                  <span className="tabular-nums">{String(index + 1).padStart(2, "0")}</span>{section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <article className="max-w-[46rem] space-y-10">
          {content.sections.map((section, index) => (
            <section className="scroll-mt-24" id={`section-${index + 1}`} key={section.title}>
              <h2 className="mb-4 text-lg font-semibold">{index + 1}. {section.title}</h2>
              <div className="space-y-4 text-[15px] leading-8">
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{section.important ? <strong className="font-medium">{paragraph}</strong> : paragraph}</p>)}
              </div>
            </section>
          ))}
          <div className="flex flex-wrap justify-between gap-4 border-t border-border pt-6 text-sm text-muted">
            <Link className="underline underline-offset-4" href="/">返回首页</Link>
            <a className="underline underline-offset-4" href="#">返回顶部</a>
          </div>
        </article>
      </div>
    </main>
  );
}
