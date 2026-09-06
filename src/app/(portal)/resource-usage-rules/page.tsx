import {LegalDocumentPage} from "@/components/legal/document-page";

export const metadata = {title: "算力资源使用规范 · OmniS"};

export default function Page({searchParams}: {searchParams: Promise<{version?: string | string[]}>}) {
  return <LegalDocumentPage document="resource-usage-rules" searchParams={searchParams} />;
}
