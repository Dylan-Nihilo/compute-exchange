import {AdminReviews} from "@/components/workspace/admin/admin-reviews";

export default async function Page({searchParams}: {searchParams: Promise<{tab?: string}>}) {
  const {tab} = await searchParams;
  return <AdminReviews key={tab} initialTab={tab === "products" || tab === "invoices" ? tab : "qualifications"} />;
}
