import {LegalDocumentPage} from "@/components/legal/document-page";

export const metadata = {title: "算力资源上架规范 · OmniS"};

export default function Page({searchParams}: {searchParams: Promise<{version?: string | string[]}>}) {
  return <LegalDocumentPage document="resource-listing-rules" searchParams={searchParams} />;
}
