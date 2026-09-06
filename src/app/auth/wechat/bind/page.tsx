import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {LoginForm} from "@/components/auth/login-form";
import {RegisterForm} from "@/components/auth/register-form";
import {safeNextPath} from "@/lib/auth/session";
import {WECHAT_BIND_COOKIE} from "@/lib/auth/wechat";

export const metadata = {title: "绑定微信"};
export default async function WeChatBindPage({searchParams}: {searchParams: Promise<{mode?: string; next?: string}>}) {
 const params = await searchParams;
 if (!(await cookies()).get(WECHAT_BIND_COOKIE)?.value) {
  const next = safeNextPath(params.next);
  redirect(`/auth/login?wechat_error=expired${next ? `&next=${encodeURIComponent(next)}` : ""}`);
 }
 return params.mode === "register" ? <RegisterForm wechatBinding /> : <LoginForm wechatBinding />;
}
