import type Cap from "cap-widget";

import {publicEnv} from "../config/public-env.ts";

export const DEMO_CAPTCHA_TOKEN = "demo-cap-token";

let solver: Cap | undefined;
let solverEndpoint: string | undefined;

export async function solveCaptcha(): Promise<string> {
  const endpoint = publicEnv.NEXT_PUBLIC_CAP_API_ENDPOINT;

  if (!endpoint) {
    if (process.env.NODE_ENV === "development") return DEMO_CAPTCHA_TOKEN;
    throw new Error("安全验证服务尚未配置");
  }

  if (!solver || solverEndpoint !== endpoint) {
    const {default: CapClient} = await import("cap-widget");
    solver = new CapClient({apiEndpoint: endpoint});
    solverEndpoint = endpoint;
  }

  try {
    const result = await solver.solve();
    if (!result.success || !result.token) throw new Error();
    return result.token;
  } catch {
    solver.reset();
    throw new Error("安全验证未完成，请重试");
  }
}

export async function verifyCaptcha(captchaToken: string): Promise<void> {
  const response = await fetch("/api/auth/captcha/verify", {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify({captcha_token: captchaToken}),
  });
  const result = (await response.json().catch(() => null)) as {
    code?: number;
    message?: string;
  } | null;

  if (!response.ok || result?.code !== 0) {
    throw new Error(result?.message || "安全验证未完成，请重试");
  }
}
