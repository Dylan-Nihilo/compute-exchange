import {proxyAuthPost} from "@/lib/api/auth-backend";

export async function POST(request: Request) {
  return proxyAuthPost(request, "/auth/captcha/verify");
}
