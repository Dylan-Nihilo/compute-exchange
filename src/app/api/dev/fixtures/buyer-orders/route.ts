import {NextResponse} from "next/server";

import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

export function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({code: 40400, message: "接口不存在"}, {status: 404});
  }
  return proxyAuthenticatedBackend("/dev/fixtures/buyer-orders", {method: "POST"});
}
