import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

// 进件资质文件(营业执照/身份证/开户许可证): 经后端转存易宝, 平台不落盘。
export async function POST(request: Request) {
  return proxyAuthenticatedBackend("/payment/supplier/onboard/upload", {
    method: "POST",
    body: await request.formData(),
    cache: "no-store",
  });
}
