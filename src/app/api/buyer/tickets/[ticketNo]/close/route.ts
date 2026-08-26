import {NextResponse} from "next/server";

import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";
import {isTicketNo} from "@/lib/buyer-tickets";

export async function POST(
  _request: Request,
  {params}: {params: Promise<{ticketNo: string}>},
) {
  const {ticketNo} = await params;
  if (!isTicketNo(ticketNo)) {
    return NextResponse.json({code: 40001, message: "工单号无效"}, {status: 400});
  }
  return proxyAuthenticatedBackend(`/tickets/${encodeURIComponent(ticketNo)}/close`, {method: "POST"});
}
