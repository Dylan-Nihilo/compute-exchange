import {LegalDocumentPage} from "@/components/legal/document-page";

export const metadata = {title: "用户服务协议 · OmniS"};

export default function Page({searchParams}: {searchParams: Promise<{version?: string | string[]}>}) {
  return <LegalDocumentPage document="terms" searchParams={searchParams} />;
}
