import {NextResponse} from "next/server";

import {proxyAuthenticatedBackendRaw} from "@/lib/api/auth-backend";

export async function GET(
  _request: Request,
  {params}: {params: Promise<{invoiceNo: string}>},
) {
  const {invoiceNo} = await params;
  if (!/^[\w-]{1,64}$/.test(invoiceNo)) {
    return NextResponse.json({code: 40001, message: "发票编号无效"}, {status: 400});
  }
  return proxyAuthenticatedBackendRaw(
    `/invoices/${encodeURIComponent(invoiceNo)}/download`,
    {cache: "no-store"},
  );
}
