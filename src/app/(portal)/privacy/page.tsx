import {LegalDocumentPage} from "@/components/legal/document-page";

export const metadata = {title: "隐私政策 · OmniS"};

export default function Page({searchParams}: {searchParams: Promise<{version?: string | string[]}>}) {
  return <LegalDocumentPage document="privacy" searchParams={searchParams} />;
}
